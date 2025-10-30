"""
Enhanced Flask Backend for Polymarket Data
Returns top 1000 live markets with comprehensive data.
Serves static frontend files.
Optimized for Render.com deployment with caching.
"""

import os
import json
import logging
from datetime import datetime, timedelta
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("polymarket-backend")

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Configuration
GAMMA_API_BASE = "https://gamma-api.polymarket.com"
CACHE_DURATION = 300  # 5 minutes cache
cache = {"data": None, "timestamp": None}

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/118.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://polymarket.com",
    "Referer": "https://polymarket.com/",
}


def safe_float(v):
    """Convert volume/price to float safely."""
    try:
        if v is None:
            return 0.0
        if isinstance(v, (int, float)):
            return float(v)
        if isinstance(v, str):
            v = v.strip().replace(',', '')
            return float(v) if v != "" else 0.0
    except Exception:
        return 0.0
    return 0.0


def parse_json_field(field):
    """Parse stringified JSON fields from API."""
    if field is None:
        return None
    if isinstance(field, str):
        try:
            return json.loads(field)
        except json.JSONDecodeError:
            return None
    return field


def calculate_spread(outcome_prices):
    """Calculate bid-ask spread from outcome prices."""
    try:
        if not outcome_prices or len(outcome_prices) < 2:
            return None
        prices = [safe_float(p) for p in outcome_prices]
        prices = [p for p in prices if p > 0]
        if len(prices) >= 2:
            return round(abs(prices[0] - prices[1]), 4)
        return None
    except Exception:
        return None


def fetch_all_markets(limit_per_request=100):
    """
    Fetch all live markets using pagination.
    Polymarket Gamma API doesn't have strict documented limits for GET /markets,
    but we paginate to be safe and handle large datasets efficiently.
    """
    all_markets = []
    offset = 0
    max_total = 1000  # We want top 1000 by volume
    
    logger.info("Starting to fetch markets with pagination...")
    
    while len(all_markets) < max_total:
        try:
            url = (f"{GAMMA_API_BASE}/markets?"
                   f"active=true&closed=false&archived=false"
                   f"&limit={limit_per_request}&offset={offset}")
            
            logger.info(f"Fetching batch: offset={offset}, limit={limit_per_request}")
            resp = requests.get(url, headers=DEFAULT_HEADERS, timeout=15)
            resp.raise_for_status()
            
            batch = resp.json()
            
            # Handle different response formats
            if isinstance(batch, dict):
                if "data" in batch and isinstance(batch["data"], list):
                    batch = batch["data"]
                elif "markets" in batch and isinstance(batch["markets"], list):
                    batch = batch["markets"]
                else:
                    logger.warning(f"Unexpected response format: {batch.keys()}")
                    break
            
            if not batch or len(batch) == 0:
                logger.info("No more markets to fetch")
                break
            
            all_markets.extend(batch)
            logger.info(f"Fetched {len(batch)} markets. Total: {len(all_markets)}")
            
            # If we got fewer than requested, we've reached the end
            if len(batch) < limit_per_request:
                break
            
            offset += limit_per_request
            
        except requests.RequestException as e:
            logger.error(f"Error fetching batch at offset {offset}: {e}")
            break
    
    logger.info(f"Total markets fetched: {len(all_markets)}")
    return all_markets


def process_market_data(markets):
    """Process and enrich market data with all essential fields."""
    processed = []
    
    for m in markets:
        try:
            # Parse JSON fields
            outcomes = parse_json_field(m.get("outcomes"))
            outcome_prices = parse_json_field(m.get("outcomePrices"))
            clob_token_ids = parse_json_field(m.get("clobTokenIds"))
            
            # Calculate probability (first outcome price, typically YES)
            probability = None
            if outcome_prices and len(outcome_prices) > 0:
                probability = safe_float(outcome_prices[0])
            
            # Calculate spread
            spread = calculate_spread(outcome_prices)
            
            # Volume and liquidity
            volume = safe_float(m.get("volume"))
            liquidity = safe_float(m.get("liquidity"))
            
            # Dates
            created_at = m.get("createdAt") or m.get("startDate")
            end_date = m.get("endDate")
            game_start_time = m.get("gameStartTime")
            
            processed.append({
                # Core identifiers
                "id": m.get("id"),
                "condition_id": m.get("conditionId"),
                "question_id": m.get("questionId"),
                "slug": m.get("slug"),
                
                # Market question and details
                "question": m.get("question"),
                "description": m.get("description"),
                "category": m.get("category"),
                "tags": m.get("tags", []),
                
                # Pricing and probability
                "probability": probability,
                "outcomes": outcomes,
                "outcome_prices": outcome_prices,
                "spread": spread,
                
                # Volume and liquidity metrics
                "volume": volume,
                "liquidity": liquidity,
                "volume_24h": safe_float(m.get("volume24h")),
                
                # Trading info
                "enable_order_book": m.get("enableOrderBook"),
                "clob_token_ids": clob_token_ids,
                "neg_risk": m.get("negRisk", False),
                "minimum_order_size": safe_float(m.get("minimumOrderSize")),
                "minimum_tick_size": safe_float(m.get("minimumTickSize")),
                
                # Dates
                "created_at": created_at,
                "end_date": end_date,
                "game_start_time": game_start_time,
                "accepting_orders": m.get("acceptingOrders"),
                "accepting_order_timestamp": m.get("acceptingOrderTimestamp"),
                
                # Additional metadata
                "image": m.get("image"),
                "icon": m.get("icon"),
                "is_50_50_outcome": m.get("is5050Outcome"),
                "notifications_enabled": m.get("notificationsEnabled"),
                
                # Status flags
                "active": m.get("active"),
                "closed": m.get("closed"),
                "archived": m.get("archived"),
                
                # FPMM address (for on-chain trading)
                "fpmm": m.get("fpmm"),
            })
        except Exception as e:
            logger.error(f"Error processing market {m.get('id')}: {e}")
            continue
    
    return processed


@app.route("/", methods=["GET"])
def home():
    """Health check endpoint."""
    return jsonify({
        "service": "Polymarket Backend API",
        "status": "running",
        "endpoints": {
            "/api/markets": "Get top 1000 live markets sorted by volume",
            "/api/markets/top/{n}": "Get top N markets (default: 20)",
            "/api/market/{id}": "Get single market by ID (coming soon)",
            "/health": "Service health status"
        }
    }), 200


@app.route("/health", methods=["GET"])
def health():
    """Health check for monitoring."""
    return jsonify({"status": "healthy", "timestamp": datetime.utcnow().isoformat()}), 200


@app.route("/api/markets", methods=["GET"])
def get_all_markets():
    """
    Returns all live markets (up to 1000) sorted by volume descending.
    Implements caching to reduce API calls.
    
    Query params:
    - limit: max markets to return (default: 1000)
    - min_volume: minimum volume filter (default: 0)
    - category: filter by category
    """
    try:
        # Check cache
        now = datetime.utcnow()
        if (cache["data"] is not None and 
            cache["timestamp"] is not None and 
            (now - cache["timestamp"]).total_seconds() < CACHE_DURATION):
            logger.info("Returning cached data")
            markets = cache["data"]
        else:
            logger.info("Cache miss or expired, fetching fresh data")
            raw_markets = fetch_all_markets()
            markets = process_market_data(raw_markets)
            
            # Sort by volume descending
            markets.sort(key=lambda x: x.get("volume", 0), reverse=True)
            
            # Update cache
            cache["data"] = markets
            cache["timestamp"] = now
            logger.info(f"Cached {len(markets)} markets")
        
        # Apply filters from query params
        limit = int(request.args.get("limit", 1000))
        min_volume = float(request.args.get("min_volume", 0))
        category = request.args.get("category")
        
        filtered_markets = markets
        
        if min_volume > 0:
            filtered_markets = [m for m in filtered_markets if m.get("volume", 0) >= min_volume]
        
        if category:
            filtered_markets = [m for m in filtered_markets if m.get("category") == category]
        
        result = filtered_markets[:limit]
        
        return jsonify({
            "success": True,
            "count": len(result),
            "total_available": len(markets),
            "cached": cache["timestamp"] is not None,
            "cache_age_seconds": int((now - cache["timestamp"]).total_seconds()) if cache["timestamp"] else None,
            "markets": result
        }), 200
        
    except Exception as e:
        logger.exception(f"Error in get_all_markets: {e}")
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "detail": str(e)
        }), 500


@app.route("/api/markets/top/<int:n>", methods=["GET"])
def get_top_n_markets(n):
    """Get top N markets by volume."""
    if n <= 0 or n > 1000:
        return jsonify({"error": "N must be between 1 and 1000"}), 400
    
    try:
        # Reuse the main endpoint logic
        request.args = {"limit": str(n)}
        return get_all_markets()
    except Exception as e:
        logger.exception(f"Error in get_top_n_markets: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/categories", methods=["GET"])
def get_categories():
    """Get list of all available categories with market counts."""
    try:
        # Check cache first
        if cache["data"] is None:
            raw_markets = fetch_all_markets()
            markets = process_market_data(raw_markets)
            cache["data"] = markets
            cache["timestamp"] = datetime.utcnow()
        else:
            markets = cache["data"]
        
        # Count markets per category
        categories = {}
        for m in markets:
            cat = m.get("category", "Uncategorized")
            categories[cat] = categories.get(cat, 0) + 1
        
        # Sort by count descending
        sorted_cats = sorted(categories.items(), key=lambda x: x[1], reverse=True)
        
        return jsonify({
            "success": True,
            "categories": [{"name": cat, "count": count} for cat, count in sorted_cats]
        }), 200
        
    except Exception as e:
        logger.exception(f"Error in get_categories: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    logger.info(f"Starting Polymarket Backend on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
