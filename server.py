# server.py
from flask import Flask, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

GAMMA_API = "https://gamma-api.polymarket.com/markets?limit=20"

@app.route("/")
def home():
    return "Polymarket data fetcher is running!"

@app.route("/api/markets")
def get_markets():
    try:
        response = requests.get(GAMMA_API, timeout=10)
        response.raise_for_status()
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
