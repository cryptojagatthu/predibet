from flask import Flask, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

GAMMA_API_BASE = "https://gamma-api.polymarket.com"

@app.route("/api/top20live", methods=["GET"])
def get_top20_live_markets():
    try:
        # 🔹 Directly fetch only live markets from Gamma API
        url = f"{GAMMA_API_BASE}/markets?active=true&closed=false&limit=1000"
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()

        data = resp.json()
        markets = data.get("data", data if isinstance(data, list) else [])

        # 🔹 Sort by volume (descending)
        live_sorted = sorted(markets, key=lambda x: float(x.get("volume", 0)), reverse=True)

        # 🔹 Pick top 20
        top20 = live_sorted[:20]

        # 🔹 Format output
        output = [
            {
                "id": m.get("id"),
                "question": m.get("question"),
                "category": m.get("category"),
                "volume": m.get("volume"),
                "endDate": m.get("endDate"),
                "outcomes": m.get("outcomes"),
                "outcomePrices": m.get("outcomePrices"),
                "image": m.get("image"),
            }
            for m in top20
        ]

        return jsonify(output)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
