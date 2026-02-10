# Analytics setup

The app sends events to your own analytics backend (no PII). Deploy the backend to Railway and point the app at it.

## 1. Deploy the backend (Railway)

1. In your repo, the backend lives in **`analytics-api/`**.
2. In Railway: **New Project** → **Deploy from GitHub** (select this repo).
3. Set **Root Directory** to `analytics-api` (if your repo root is the app).
4. Add **Postgres** in Railway; it will set `DATABASE_URL`. Without it, the API runs with an in-memory store (dev only).
5. Deploy. Note the public URL (e.g. `https://siddur-analytics-api-production.up.railway.app`).

## 2. Point the app at the backend

Set the analytics base URL (no trailing slash) in one of these ways:

- **EAS / build:** In EAS secrets or `.env`, set  
  `EXPO_PUBLIC_ANALYTICS_URL=https://your-app.railway.app`
- **app.json:** In `expo.extra`, set  
  `"analyticsUrl": "https://your-app.railway.app"`  
  (Use a build-time value or leave empty and rely on `EXPO_PUBLIC_ANALYTICS_URL`.)

Rebuild the app so the URL is baked in.

## 3. Admin dashboard

Open **`https://your-app.railway.app/dashboard`** in a browser. You get:

- **DAU / WAU / MAU** (unique users, last 1 / 7 / 30 days)
- **Event counts** (funnel: e.g. `onboarding_started`, `onboarding_completed`, `app_open`)
- **Daily active users** (app_open by day)
- **Retention** (cohort by first app_open, Day 1 / 7 / 30 retained)
- **User explorer** (timeline of events by `anonymous_id`)
- **Recent events** with filters (date range, event name)
- **Export** events to CSV

## 4. When you add login/signup

After a successful login or signup, call:

```ts
import { mergeIdentityOnBackend } from './src/analytics';
import { getAnonymousId } from './src/analytics';
import { setUserId } from './src/analytics';

// After you have the server-returned user id:
const anonymousId = await getAnonymousId();
await mergeIdentityOnBackend(anonymousId, serverUserId, { account_created_at: new Date().toISOString() });
await setUserId(serverUserId);
```

This merges the anonymous user into the logged-in user so history is preserved.

## Events sent by the app

- **Lifecycle:** `app_install`, `app_open`, `app_background`, `app_foreground`, `app_close`, `session_start`, `session_end`, `app_update`
- **Screen:** `screen_view` (with `screen_name`, `previous_screen`, `time_on_previous_screen_ms`)
- **Feature:** `feature_<name>_entry` is sent automatically when the user opens a known screen (home, hub, tehillim, siddur, calendar, library, settings, omer, habits, tzedakah, etc.). Use `events.feature.action('tehillim')` / `events.feature.success()` / `events.feature.error()` for key actions inside a feature.
- **Onboarding:** `onboarding_started`, `onboarding_step_viewed`, `onboarding_step_completed`, `onboarding_skipped`, `onboarding_completed`, `permission_prompt_shown`, `permission_response`
- **Reliability:** `app_start_time` (cold_start_ms), `api_error` (on ingest failure), `ui_error` (from error boundary), `validation_error` (e.g. invalid time or missing title).

All events include: `event_uuid`, `event_time_utc`, `anonymous_id`, `user_id` (if set), `session_id`, `app_version`, `platform`, `os_version`, `device_model`, `network_type`, `locale`, `timezone`, `environment`, `release_channel`, `screen_name`, and schema version. No emails, names, or phone numbers are sent.
