# Polymarket Backend API

A Flask-based REST API that fetches and serves live Polymarket prediction market data with comprehensive metrics.

## Features

✅ **Top 1000 Live Markets** - Sorted by volume  
✅ **Comprehensive Data** - Price, volume, spread, liquidity, dates, and more  
✅ **Smart Caching** - 5-minute cache to reduce API calls  
✅ **Pagination Support** - Efficient data fetching  
✅ **Category Filtering** - Filter by market categories  
✅ **Production Ready** - Optimized for Render.com deployment  

## API Endpoints

### `GET /`
Health check and API documentation

### `GET /health`
Service health status

### `GET /api/markets`
Get all live markets (up to 1000)

**Query Parameters:**
- `limit` - Max markets to return (default: 1000)
- `min_volume` - Minimum volume filter (default: 0)
- `category` - Filter by category (e.g., "Sports", "Politics")

**Example:**
```bash
curl "https://your-app.onrender.com/api/markets?limit=100&min_volume=1000"
```

### `GET /api/markets/top/{n}`
Get top N markets by volume

**Example:**
```bash
curl "https://your-app.onrender.com/api/markets/top/20"
```

### `GET /api/categories`
Get all available categories with market counts

## Market Data Fields

Each market includes:

### Core Info
- `id`, `condition_id`, `question_id`, `slug`
- `question`, `description`, `category`, `tags`

### Pricing & Probability
- `probability` - Current probability (0-1)
- `outcomes` - Array of outcome names (e.g., ["Yes", "No"])
- `outcome_prices` - Array of prices for each outcome
- `spread` - Bid-ask spread

### Volume & Liquidity
- `volume` - Total volume in USDC
- `liquidity` - Current liquidity
- `volume_24h` - 24-hour volume

### Trading Info
- `enable_order_book` - Can be traded via CLOB
- `clob_token_ids` - Token IDs for trading
- `neg_risk` - Negative risk market flag
- `minimum_order_size`, `minimum_tick_size`

### Dates
- `created_at` - Market creation date
- `end_date` - Market end date
- `game_start_time` - Game/event start time (if applicable)

### Status
- `active`, `closed`, `archived`, `accepting_orders`

## Deployment to Render.com

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/predibet.git
git push -u origin main
```

### Step 2: Create Render Web Service

1. Go to [Render.com](https://render.com) and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `polymarket-backend` (or your choice)
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Root Directory:** Leave blank (unless in subfolder)
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn server:app`
   - **Instance Type:** `Free` (or choose paid for better performance)

5. **Environment Variables:**
   - Render automatically sets `PORT` - no need to add it

6. Click **"Create Web Service"**

### Step 3: Wait for Deployment
- Render will automatically build and deploy
- First deployment takes 2-3 minutes
- You'll get a URL like: `https://polymarket-backend.onrender.com`

### Step 4: Test Your API
```bash
# Test health
curl https://your-app.onrender.com/health

# Get top 20 markets
curl https://your-app.onrender.com/api/markets/top/20

# Get markets by category
curl https://your-app.onrender.com/api/markets?category=Sports&limit=50
```

## Rate Limiting & Best Practices

### Polymarket API Limits
- **Gamma API** has no strict documented limits for GET /markets
- Uses Cloudflare throttling (requests are queued, not rejected)
- Our implementation uses pagination (100 markets per request) to be safe

### Our Caching Strategy
- **5-minute cache** reduces API calls significantly
- Cache is in-memory (resets on deployment/restart)
- For production, consider Redis for persistent caching

### Recommendations
1. **Free Tier:** Works well, but services sleep after 15 min inactivity
2. **Paid Tier ($7/mo):** No sleep, better performance, recommended for production
3. **Monitoring:** Enable Render's metrics to track performance

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python server.py

# Test
curl http://localhost:8080/api/markets/top/20
```

## Advanced Configuration

### Increase Cache Duration
In `server.py`, change:
```python
CACHE_DURATION = 300  # 5 minutes
```
To:
```python
CACHE_DURATION = 600  # 10 minutes
```

### Fetch More Markets
Change pagination limit:
```python
def fetch_all_markets(limit_per_request=100):
```
To:
```python
def fetch_all_markets(limit_per_request=200):  # Fetch 200 at a time
```

### Add Redis Caching (Optional)
For production with multiple instances:

1. Add to `requirements.txt`:
```
redis==5.0.0
```

2. Modify caching logic to use Redis instead of in-memory dict

## Troubleshooting

### 502 Bad Gateway
- Check Render logs for errors
- Verify `gunicorn server:app` command is correct
- Ensure `server.py` is in root directory

### Slow Response Times
- Free tier sleeps after inactivity (first request takes ~30s)
- Upgrade to paid tier to eliminate cold starts
- Increase cache duration

### Empty Data
- Check Render logs: `gunicorn server:app --log-level debug`
- Verify Polymarket API is accessible
- Check if Cloudflare is blocking requests

## Next Steps

- [ ] Add Redis caching for production
- [ ] Implement WebSocket for real-time updates
- [ ] Add market search functionality
- [ ] Create single market detail endpoint
- [ ] Add historical data tracking
- [ ] Build frontend dashboard

## Support

For issues, check:
- Render logs: Dashboard → Your Service → Logs
- GitHub Issues: [Your Repo Issues Page]
- Polymarket API Docs: https://docs.polymarket.com

---

**Built with Flask | Deployed on Render | Powered by Polymarket API**
