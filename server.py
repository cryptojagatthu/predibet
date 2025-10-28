"""
Flask server to fetch top 10 live Polymarket markets by volume
Deployable on Render or any Python host
Run locally with:  python server.py
"""

from flask import Flask, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

GAMMA_API_BASE = "https://gamma-api.polymarket.com"

@app.route('/api/markets', methods=['GET'])
def get_top_live_markets():
    try:
        # Fetch all markets from Polymarket Gamma API
        response = requests.get(f"{GAMMA_API_BASE}/markets?limit=1000", timeout=15)
        response.raise_for_status()
        markets = response.json()
        
        # Filter only active, not closed markets
        live_markets = [m for m in markets if m.get("active") and not m.get("closed")]

        # Sort by volume (descending) and take top 10
        top_markets = sorted(live_markets, key=lambda x: x.get("volume", 0), reverse=True)[:10]

        # Simplify the response for readability
        formatted = []
        for m in top_markets:
            formatted.append({
                "id": m.get("id"),
                "question": m.get("question"),
                "category": m.get("category"),
                "volume": m.get("volume"),
                "image": m.get("image"),
                "endDate": m.get("endDate"),
                "outcomes": m.get("outcomes"),
                "outcomePrices": m.get("outcomePrices")
            })

        return jsonify(formatted)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
