# Siddur Analytics API

Deploy to Railway. Ingests events from the app and serves the admin dashboard / exports.

## Setup on Railway

1. New project → Deploy from repo (this repo, root or monorepo with `analytics-api` as root).
2. Add **Postgres** plugin; Railway sets `DATABASE_URL`.
3. Set **Root Directory** to `analytics-api` if repo root is parent.
4. Build: `npm install` (or use Nixpacks default).
5. Start: `npm start` (runs `node server.js`).

## Environment

- `PORT` – set by Railway.
- `DATABASE_URL` – set by Railway Postgres. If missing, runs with in-memory store (dev only).

## App config

In the Siddur app, set the analytics backend URL:

- **EAS / Expo:** `EXPO_PUBLIC_ANALYTICS_URL=https://your-app.railway.app` in env or `app.config.js` extra.
- **Local dev:** use your Railway dev URL (e.g. `https://siddur-analytics-api-dev.up.railway.app`) so events go to the deployed API.

## Endpoints

- `POST /api/events` – batch ingest `{ events: [...] }`
- `GET /api/events` – query with `start_date`, `end_date`, `event_name`, `limit`, etc.
- `GET /api/stats/active-users` – DAU, WAU, MAU
- `GET /api/stats/event-series?event_name=app_open&days=30`
- `GET /api/stats/event-counts?start_date=&end_date=` – counts by event name (funnel)
- `POST /api/identities/merge` – `{ anonymous_id, user_id, profile? }`
- `POST /api/identities/profile` – `{ anonymous_id, profile }`
- `GET /api/health` – health check

## Admin dashboard

Open **`/dashboard`** in the browser (e.g. `https://your-app.railway.app/dashboard`). You get:

- **Filters:** date range, event name
- **Overview:** DAU, WAU, MAU
- **Event counts:** table of event_name → count (funnel/overview)
- **Recent events:** table with time, event, anonymous_id, session, screen
- **Export:** CSV download of the currently loaded events
