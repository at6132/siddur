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
- **Features** — unique people + action counts per feature; click a feature to see top users and jump to their timeline
- **Event counts** (funnel: e.g. `onboarding_started`, `onboarding_completed`, `app_open`, product actions)
- **Daily active users** (app_open by day)
- **Retention** (cohort by first app_open, Day 1 / 7 / 30 retained)
- **User explorer** (timeline of events by `anonymous_id`)
- **Recent events** with filters (date range, event name)
- **Export** events to CSV

API helpers used by the Features tab:

- `GET /api/stats/feature-usage?start_date=&end_date=`
- `GET /api/stats/feature-users?feature=&start_date=&end_date=&limit=`

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

Schema version: **1.1**. Product and feature events include a `feature` property so the dashboard can answer “who uses what.”

- **Lifecycle:** `app_install`, `app_open`, `app_background`, `app_foreground`, `app_close`, `session_start`, `session_end`, `app_update`
- **Screen:** `screen_view` (with `screen_name`, `previous_screen`, `time_on_previous_screen_ms`)
- **Feature entry:** `feature_<name>_entry` is sent automatically when the user opens a known screen (home, hub, tehillim, siddur, calendar, library, search, settings, omer, habits, tzedakah, shared_tehillim, coming_soon, etc.)
- **Product actions (deeper usage):**
  - Intro / onboarding: `intro_began`, `nusach_changed`, onboarding funnel + permission events
  - Siddur: `prayer_opened` (`service`), `prayer_english_toggled`
  - Tehillim: `tehillim_perek_opened`, `tehillim_perek_completed` (`source`: private|shared), campaign `created` / `joined` / `claimed` / `shared`
  - Hub practice: `goal_added`, `goal_toggled`, `gratitude_added`, `brachos_added`, `habit_toggled`, `tzedakah_logged`, `omer_counted`
  - Discovery: `search_result_tapped`, `coming_soon_viewed` (demand signal for gated learning)
  - Settings: `nusach_changed`, `custom_reminder_saved`
- **Onboarding:** `onboarding_started`, `onboarding_step_viewed`, `onboarding_step_completed`, `onboarding_skipped`, `onboarding_completed`, `permission_prompt_shown`, `permission_response`
- **Reliability:** `app_start_time` (cold_start_ms), `api_error` (on ingest failure), `ui_error` (from error boundary), `validation_error` (e.g. invalid time or missing title).

### Profile (non-PII)

Synced to `/api/identities/profile` on app open and after onboarding / nusach changes:

- `nusach`, `push_opt_in`, `onboarding_completed`, `timezone`, `first_open_at`, `last_seen_at`

### Helpers

```ts
import { trackProduct, PRODUCT_EVENTS, trackFeatureAction } from './src/analytics';

trackProduct(PRODUCT_EVENTS.PRAYER_OPENED, 'siddur', { service: 'mincha' });
trackFeatureAction('tehillim', 'mark_complete', { perek_number: 23 });
```

All events include: `event_uuid`, `event_time_utc`, `anonymous_id`, `user_id` (if set), `session_id`, `app_version`, `platform`, `os_version`, `device_model`, `network_type`, `locale`, `timezone`, `environment`, `release_channel`, `screen_name`, and schema version. No emails, names, or phone numbers are sent.
