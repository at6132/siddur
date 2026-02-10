/**
 * Postgres client for analytics. Uses DATABASE_URL on Railway.
 * Falls back to in-memory store if no DATABASE_URL (dev without DB).
 */
import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
let pool = null;
let memoryStore = { events: [], identities: [] };

export function getPool() {
  if (pool) return pool;
  if (connectionString) {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('railway') ? { rejectUnauthorized: false } : undefined,
    });
    return pool;
  }
  return null;
}

export async function initDb() {
  const p = getPool();
  if (!p) {
    console.warn('[analytics-api] No DATABASE_URL; using in-memory store (not persisted).');
    return;
  }
  await p.query(`
    CREATE TABLE IF NOT EXISTS identities (
      id SERIAL PRIMARY KEY,
      anonymous_id TEXT UNIQUE NOT NULL,
      user_id TEXT,
      device_id TEXT,
      merged_into_user_id TEXT,
      profile JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_identities_user_id ON identities(user_id);
    CREATE INDEX IF NOT EXISTS idx_identities_anonymous_id ON identities(anonymous_id);
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL PRIMARY KEY,
      event_uuid TEXT UNIQUE,
      event_name TEXT NOT NULL,
      event_time_utc TIMESTAMPTZ NOT NULL,
      anonymous_id TEXT NOT NULL,
      user_id TEXT,
      session_id TEXT,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_events_name ON events(event_name);
    CREATE INDEX IF NOT EXISTS idx_events_time ON events(event_time_utc);
    CREATE INDEX IF NOT EXISTS idx_events_anonymous ON events(anonymous_id);
    CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
    CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
  `);
  console.log('[analytics-api] DB initialized.');
}

export async function insertEvents(events) {
  const p = getPool();
  if (!p) {
    memoryStore.events.push(...events);
    return { inserted: events.length, duplicate: 0 };
  }
  let inserted = 0;
  let duplicate = 0;
  for (const ev of events) {
    try {
      const payload = { ...ev };
      const res = await p.query(
        `INSERT INTO events (event_uuid, event_name, event_time_utc, anonymous_id, user_id, session_id, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (event_uuid) DO NOTHING
         RETURNING id`,
        [
          ev.event_uuid || null,
          ev.event_name,
          ev.event_time_utc,
          ev.anonymous_id,
          ev.user_id ?? null,
          ev.session_id ?? null,
          JSON.stringify(payload),
        ]
      );
      if (res.rowCount > 0) inserted++;
      else if (ev.event_uuid) duplicate++;
    } catch (e) {
      if (e.code === '23505') duplicate++;
      else throw e;
    }
  }
  return { inserted, duplicate };
}

export async function queryEvents(filters = {}) {
  const {
    start_date,
    end_date,
    event_name,
    app_version,
    environment,
    anonymous_id,
    user_id,
    limit = 1000,
    offset = 0,
  } = filters;

  const p = getPool();
  if (!p) {
    let list = [...memoryStore.events];
    if (start_date) list = list.filter((e) => e.event_time_utc >= start_date);
    if (end_date) list = list.filter((e) => e.event_time_utc <= end_date);
    if (event_name) list = list.filter((e) => e.event_name === event_name);
    return list.slice(offset, offset + limit);
  }

  const conditions = [];
  const params = [];
  let i = 1;
  if (start_date) {
    conditions.push(`event_time_utc >= $${i}`);
    params.push(start_date);
    i++;
  }
  if (end_date) {
    conditions.push(`event_time_utc <= $${i}`);
    params.push(end_date);
    i++;
  }
  if (event_name) {
    conditions.push(`event_name = $${i}`);
    params.push(event_name);
    i++;
  }
  if (anonymous_id) {
    conditions.push(`anonymous_id = $${i}`);
    params.push(anonymous_id);
    i++;
  }
  if (user_id) {
    conditions.push(`(user_id = $${i} OR (user_id IS NULL AND anonymous_id = $${i}))`);
    params.push(user_id);
    i++;
  }
  if (app_version) {
    conditions.push(`payload->>'app_version' = $${i}`);
    params.push(app_version);
    i++;
  }
  if (environment) {
    conditions.push(`payload->>'environment' = $${i}`);
    params.push(environment);
    i++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);
  const res = await p.query(
    `SELECT event_uuid, event_name, event_time_utc, anonymous_id, user_id, session_id, payload, created_at
     FROM events ${where}
     ORDER BY event_time_utc DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    params
  );
  return res.rows.map((r) => ({
    ...r.payload,
    event_uuid: r.event_uuid,
    event_name: r.event_name,
    event_time_utc: r.event_time_utc,
    anonymous_id: r.anonymous_id,
    user_id: r.user_id,
    session_id: r.session_id,
    created_at: r.created_at,
  }));
}

export async function aggregateByDay(eventName, startDate, endDate) {
  const p = getPool();
  if (!p) {
    const list = memoryStore.events.filter(
      (e) => e.event_name === eventName && e.event_time_utc >= startDate && e.event_time_utc <= endDate
    );
    const byDay = {};
    list.forEach((e) => {
      const d = e.event_time_utc.slice(0, 10);
      byDay[d] = (byDay[d] || 0) + 1;
    });
    return Object.entries(byDay).map(([date, count]) => ({ date, count }));
  }
  const res = await p.query(
    `SELECT date_trunc('day', event_time_utc AT TIME ZONE 'UTC')::date AS date, COUNT(*) AS count
     FROM events
     WHERE event_name = $1 AND event_time_utc >= $2 AND event_time_utc <= $3
     GROUP BY 1 ORDER BY 1`,
    [eventName, startDate, endDate]
  );
  return res.rows.map((r) => ({ date: r.date.toISOString().slice(0, 10), count: Number(r.count) }));
}

export async function getEventCountsByName(startDate, endDate) {
  const p = getPool();
  if (!p) {
    let list = memoryStore.events;
    if (startDate) list = list.filter((e) => e.event_time_utc >= startDate);
    if (endDate) list = list.filter((e) => e.event_time_utc <= endDate);
    const byName = {};
    list.forEach((e) => {
      byName[e.event_name] = (byName[e.event_name] || 0) + 1;
    });
    return Object.entries(byName).map(([event_name, count]) => ({ event_name, count }));
  }
  const conditions = [];
  const params = [];
  let i = 1;
  if (startDate) {
    conditions.push(`event_time_utc >= $${i}`);
    params.push(startDate);
    i++;
  }
  if (endDate) {
    conditions.push(`event_time_utc <= $${i}`);
    params.push(endDate);
    i++;
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await p.query(
    `SELECT event_name, COUNT(*) AS count FROM events ${where} GROUP BY event_name ORDER BY count DESC`,
    params
  );
  return res.rows.map((r) => ({ event_name: r.event_name, count: Number(r.count) }));
}

export async function uniqueUsersByDay(eventName, startDate, endDate) {
  const p = getPool();
  if (!p) return [];
  const res = await p.query(
    `SELECT date_trunc('day', event_time_utc AT TIME ZONE 'UTC')::date AS date,
            COUNT(DISTINCT COALESCE(user_id, anonymous_id)) AS count
     FROM events
     WHERE event_name = $1 AND event_time_utc >= $2 AND event_time_utc <= $3
     GROUP BY 1 ORDER BY 1`,
    [eventName, startDate, endDate]
  );
  return res.rows.map((r) => ({ date: r.date.toISOString().slice(0, 10), count: Number(r.count) }));
}

/** Unique users in a date range (single number for DAU/WAU/MAU). */
export async function uniqueUsersInRange(eventName, startDate, endDate) {
  const p = getPool();
  if (!p) {
    const list = memoryStore.events.filter(
      (e) => e.event_name === eventName && e.event_time_utc >= startDate && e.event_time_utc <= endDate
    );
    const set = new Set(list.map((e) => e.user_id || e.anonymous_id));
    return set.size;
  }
  const res = await p.query(
    `SELECT COUNT(DISTINCT COALESCE(user_id, anonymous_id)) AS count
     FROM events
     WHERE event_name = $1 AND event_time_utc >= $2 AND event_time_utc <= $3`,
    [eventName, startDate, endDate]
  );
  return Number(res.rows[0]?.count ?? 0);
}

/** Retention: cohort by first app_open date, with retained counts at day 1, 7, 30. */
export async function getRetention(startDate, endDate) {
  const p = getPool();
  if (!p) return [];
  const res = await p.query(
    `WITH first_open AS (
       SELECT COALESCE(user_id, anonymous_id) AS uid,
              MIN((event_time_utc AT TIME ZONE 'UTC')::date) AS cohort_date
       FROM events
       WHERE event_name = 'app_open' AND event_time_utc >= $1 AND event_time_utc <= $2
       GROUP BY 1
     ),
     cohort_sizes AS (
       SELECT cohort_date, COUNT(*) AS cohort_size FROM first_open GROUP BY 1
     ),
     r1 AS (
       SELECT f.cohort_date, COUNT(DISTINCT f.uid) AS cnt
       FROM first_open f
       JOIN events e ON e.event_name = 'app_open'
         AND (e.anonymous_id = f.uid OR e.user_id = f.uid)
         AND (e.event_time_utc AT TIME ZONE 'UTC')::date = f.cohort_date + 1
       GROUP BY f.cohort_date
     ),
     r7 AS (
       SELECT f.cohort_date, COUNT(DISTINCT f.uid) AS cnt
       FROM first_open f
       JOIN events e ON e.event_name = 'app_open'
         AND (e.anonymous_id = f.uid OR e.user_id = f.uid)
         AND (e.event_time_utc AT TIME ZONE 'UTC')::date = f.cohort_date + 7
       GROUP BY f.cohort_date
     ),
     r30 AS (
       SELECT f.cohort_date, COUNT(DISTINCT f.uid) AS cnt
       FROM first_open f
       JOIN events e ON e.event_name = 'app_open'
         AND (e.anonymous_id = f.uid OR e.user_id = f.uid)
         AND (e.event_time_utc AT TIME ZONE 'UTC')::date = f.cohort_date + 30
       GROUP BY f.cohort_date
     )
     SELECT c.cohort_date::text AS cohort_date,
            c.cohort_size,
            COALESCE(r1.cnt, 0) AS retained_1,
            COALESCE(r7.cnt, 0) AS retained_7,
            COALESCE(r30.cnt, 0) AS retained_30
     FROM cohort_sizes c
     LEFT JOIN r1 ON r1.cohort_date = c.cohort_date
     LEFT JOIN r7 ON r7.cohort_date = c.cohort_date
     LEFT JOIN r30 ON r30.cohort_date = c.cohort_date
     ORDER BY c.cohort_date DESC
     LIMIT 90`,
    [startDate, endDate]
  );
  return res.rows.map((r) => ({
    cohort_date: r.cohort_date,
    cohort_size: Number(r.cohort_size),
    retained_1: Number(r.retained_1),
    retained_7: Number(r.retained_7),
    retained_30: Number(r.retained_30),
  }));
}

export async function mergeIdentity(anonymousId, userId, profile = {}) {
  const p = getPool();
  if (!p) {
    const idx = memoryStore.identities.findIndex((i) => i.anonymous_id === anonymousId);
    if (idx >= 0) {
      memoryStore.identities[idx].user_id = userId;
      memoryStore.identities[idx].merged_into_user_id = userId;
      memoryStore.identities[idx].profile = { ...memoryStore.identities[idx].profile, ...profile };
    } else {
      memoryStore.identities.push({
        anonymous_id: anonymousId,
        user_id: userId,
        device_id: null,
        merged_into_user_id: userId,
        profile,
      });
    }
    return;
  }
  await p.query(
    `INSERT INTO identities (anonymous_id, user_id, profile, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (anonymous_id) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       merged_into_user_id = EXCLUDED.user_id,
       profile = identities.profile || EXCLUDED.profile,
       updated_at = NOW()`,
    [anonymousId, userId, JSON.stringify(profile)]
  );
}

export async function upsertIdentityProfile(anonymousId, profile) {
  const p = getPool();
  if (!p) {
    const idx = memoryStore.identities.findIndex((i) => i.anonymous_id === anonymousId);
    if (idx >= 0) memoryStore.identities[idx].profile = { ...memoryStore.identities[idx].profile, ...profile };
    else memoryStore.identities.push({ anonymous_id: anonymousId, user_id: null, profile });
    return;
  }
  await p.query(
    `INSERT INTO identities (anonymous_id, profile, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (anonymous_id) DO UPDATE SET
       profile = identities.profile || EXCLUDED.profile,
       updated_at = NOW()`,
    [anonymousId, JSON.stringify(profile)]
  );
}
