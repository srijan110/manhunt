# Vercel Deployment Guide

## Setup
1. Go to [vercel.com](https://vercel.com) and sign in
2. New Project -> Import Git Repository
3. Select the `frontend` directory
4. Framework Preset: Next.js
5. Root Directory: `frontend`

## Environment Variables
Add these in Vercel Project Settings:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-railway-app.up.railway.app
```

## Build Settings
- Build Command: `npm run build` (default)
- Output Directory: `.next` (default)
- Install Command: `npm install` (default)

## Notes
- Uses Leaflet for maps (works client-side)
- Requires HTTPS for geolocation in production
- Supabase Realtime will sync with Railway backend
- GPS tracking needs user permission on mobile
