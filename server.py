# server.py
"""
Flask service: returns top 20 live Polymarket markets by volume.
Designed to run on Render (uses PORT env var) or locally.
"""

import os
import json
import logging
from flask import Flask, jsonify
from flask_cors import CORS
import requests

# Basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("polymarket-top20")

app = Flask(__name__)
CORS(app)

GAMMA_API_BASE = "https://gamma-api.polymarket.com"
# We request many markets and then pick the top 20 live ones by volume
FETCH_LIMIT = 1000

# Browser-like headers to reduce Cloudflare / 403 issues
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/118.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://polymarket.com",
    "Referer": "https://polymarket.com/",
}

def safe_float(v):
    """Convert different volume formats to float safely."""
    try:
        if v is None:
            return 0.0
        if isinstance(v, (int, float)):
            return float(v)
        # sometimes API sends numeric strings with commas
        if isinstance(v, str):
            # try direct conversion
            v = v.strip().replace(',', '')
            return float(v) if v != "" else 0.0
    except Exception:
        return 0.0
    return 0.0


@app.route("/", methods=["GET"])
def home():
    return "Polymarket top20live service (use /api/top20live)", 200


@app.route("/api/top20live", methods=["GET"])
def get_top20_live_markets():
    """
    Returns JSON array of top 20 live markets sorted by volume (desc).
    Each entry includes: id, question, category, volume, endDate, outcomes, outcomePrices, image
    """
    try:
        url = f"{GAMMA_API_BASE}/markets?active=true&closed=false&limit={FETCH_LIMIT}"
        logger.info("Requesting Gamma API: %s", url)

        resp = requests.get(url, headers=DEFAULT_HEADERS, timeout=15)
        logger.info("Gamma status: %s", resp.status_code)
        resp.raise_for_status()

        raw = resp.json()

        # The API sometimes returns { "data": [...] } or returns list directly.
        if isinstance(raw, dict) and "data" in raw and isinstance(raw["data"], list):
            markets = raw["data"]
        elif isinstance(raw, list):
            markets = raw
        elif isinstance(raw, dict) and "markets" in raw and isinstance(raw["markets"], list):
            markets = raw["markets"]
        else:
            # fallback: try to find a list inside the JSON
            markets = []
            for v in raw.values() if isinstance(raw, dict) else []:
                if isinstance(v, list):
                    markets = v
                    break

        logger.info("Fetched %d market records (raw).", len(markets))

        # Filter just in case (ensure active & not closed)
        live = [m for m in markets if m.get("active") and not m.get("closed")]
        logger.info("Filtered to %d live markets.", len(live))

        # Sort by volume descending (safe parse)
        live_sorted = sorted(live, key=lambda x: safe_float(x.get("volume")), reverse=True)

        top20 = live_sorted[:20]

        # Format a clean output
        output = []
        for m in top20:
            output.append({
                "id": m.get("id"),
                "question": m.get("question"),
                "category": m.get("category"),
                "volume": m.get("volume"),
                "volume_num": safe_float(m.get("volume")),
                "endDate": m.get("endDate"),
                "outcomes": m.get("outcomes"),
                "outcomePrices": m.get("outcomePrices"),
                "image": m.get("image"),
                "slug": m.get("slug"),
            })

        return jsonify(output), 200

    except requests.HTTPError as http_err:
        logger.exception("HTTP error while fetching Gamma API: %s", str(http_err))
        return jsonify({"error": "HTTP error", "detail": str(http_err)}), 502
    except requests.RequestException as req_err:
        logger.exception("Request exception fetching Gamma API: %s", str(req_err))
        return jsonify({"error": "Request exception", "detail": str(req_err)}), 502
    except Exception as e:
        logger.exception("Unexpected error: %s", str(e))
        return jsonify({"error": "Unexpected error", "detail": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    logger.info("Starting server on port %d", port)
    app.run(host="0.0.0.0", port=port)
