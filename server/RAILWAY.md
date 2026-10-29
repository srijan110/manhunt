# Railway Deployment Guide

## Setup
1. Create account at [railway.app](https://railway.app)
2. New Project -> Deploy from GitHub repo or CLI
3. Add PostgreSQL database (Railway will provide DATABASE_URL)
4. Add this server directory

## Environment Variables
Add these in Railway:
```
PORT=3001
NODE_ENV=production
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FRONTEND_URL=https://your-app.vercel.app
DEFAULT_ZONE_SHRINK_RATE=5
DEFAULT_REVEAL_RADIUS=300
DEFAULT_SABOTAGE_COOLDOWN=60000
GAME_TICK_INTERVAL=60000
```

## Start Command
```
npm start
```

## Notes
- Railway auto-detects Node.js
- Health check endpoint: /health
- WebSocket server runs on same port
- Uses Supabase for real-time sync with Vercel frontend
