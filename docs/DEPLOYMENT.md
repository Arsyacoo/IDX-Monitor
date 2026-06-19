# Deployment Guide

IDX Monitor is split into a FastAPI backend and a Vite React frontend.

## Frontend: Vercel or Netlify

Use these settings:

- Root directory: `frontend`
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`

Set this environment variable:

```env
VITE_API_BASE_URL=https://your-backend-domain.com/api
```

## Backend: Render, Railway, or Fly.io

Use these settings:

- Root directory: `backend`
- Install command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/api/health`

## Production Checklist

- Restrict CORS origins in `backend/main.py` before public production use.
- Keep `.env` values out of Git.
- Confirm `/api/health` reports `status: ok` after deploy.
- Point `VITE_API_BASE_URL` to the deployed backend `/api` URL.
