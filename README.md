# Real Manhunt - Complete Setup

GPS-based real-life manhunt game with shrinking zones, hunter visibility radius, and dual sabotage system.

## Project Structure
```
real-manhunt/
├── server/          # Railway backend (Node.js + Express + Socket.io)
└── frontend/        # Vercel frontend (Next.js + React + Leaflet)
```

## Features
- **GPS Landlocking**: Draw any shape polygon as hunt zone
- **Shrinking Zone**: Area reduces over time (auto-shrink mechanism)
- **Hunter Visibility**: Hunters visible only within 300m radius to hunted players
- **Dual Sabotage**: GPS Jam (15s) and False Lead (30s) with 60s cooldown
- **No Attribution**: Victims notified but don't know who sabotaged
- **Real-time GPS**: Live location tracking via browser geolocation
- **Role Assignment**: Random hunter/hunted assignment on game start

## Quick Start

### Backend (Railway)
1. Deploy server/ to Railway
2. Add PostgreSQL database
3. Set environment variables from .env.example
4. Run: `npm start`

### Frontend (Vercel)
1. Deploy frontend/ to Vercel
2. Set environment variables from .env.local.example
3. Update API URLs to point to Railway backend

### Database (Supabase)
1. Create Supabase project
2. Run SQL to create tables from db-schema.json
3. Get URL and keys for both backend and frontend

## Tech Stack
- **Backend**: Node.js, Express, Socket.io, Supabase, Turf.js
- **Frontend**: Next.js 14, React 18, Leaflet, Tailwind CSS
- **Maps**: OpenStreetMap (free, no API key)
- **Hosting**: Vercel (frontend), Railway (backend)

## Game Flow
1. Host creates game and draws zone polygon on map
2. Players join with game code
3. Host starts game -> roles assigned randomly
4. Players track GPS, stay in zone
5. Hunted players see hunters within 300m only
6. Hunted players can sabotage hunters (GPS Jam or False Lead) with cooldown
7. Zone shrinks over time, forcing players together
8. Last hunted standing wins!

## API Endpoints
### Games
- POST /api/games/create
- GET /api/games/:id
- POST /api/games/:id/start
- POST /api/games/:id/shrink

### Players
- POST /api/players/join
- POST /api/players/position
- GET /api/players/game/:gameId
- GET /api/players/visible/:playerId

### Sabotage
- POST /api/sabotage/use
- GET /api/sabotage/cooldown/:playerId

## Deployment Notes
- For GPS to work in production, must use HTTPS (Vercel provides this)
- WebSocket connections need proper CORS configuration
- Supabase realtime should be enabled for live updates
- Railway free tier is sufficient for testing
