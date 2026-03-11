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
  await initTehillimTables();
  console.log('[analytics-api] DB initialized.');
}

// --- Shared Tehillim (campaigns + commitments/completions) ---
export async function initTehillimTables() {
  const p = getPool();
  if (!p) return;
  await p.query(`
    CREATE TABLE IF NOT EXISTS tehillim_campaigns (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('split', 'shared')),
      title TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL DEFAULT '',
      deadline TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by TEXT
    );
    CREATE TABLE IF NOT EXISTS tehillim_commitments (
      campaign_id TEXT NOT NULL REFERENCES tehillim_campaigns(id) ON DELETE CASCADE,
      perek_number INT NOT NULL CHECK (perek_number >= 1 AND perek_number <= 150),
      participant_id TEXT NOT NULL,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(campaign_id, perek_number)
    );
    CREATE TABLE IF NOT EXISTS tehillim_completions (
      campaign_id TEXT NOT NULL REFERENCES tehillim_campaigns(id) ON DELETE CASCADE,
      perek_number INT NOT NULL CHECK (perek_number >= 1 AND perek_number <= 150),
      participant_id TEXT NOT NULL,
      completed_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(campaign_id, perek_number, participant_id)
    );
    CREATE INDEX IF NOT EXISTS idx_tehillim_commitments_campaign ON tehillim_commitments(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_tehillim_completions_campaign ON tehillim_completions(campaign_id);
    CREATE TABLE IF NOT EXISTS tehillim_participants (
      campaign_id TEXT NOT NULL REFERENCES tehillim_campaigns(id) ON DELETE CASCADE,
      participant_id TEXT NOT NULL,
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (campaign_id, participant_id)
    );
    CREATE INDEX IF NOT EXISTS idx_tehillim_participants_campaign ON tehillim_participants(campaign_id);
  `);
  console.log('[analytics-api] Tehillim tables initialized.');
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

// --- Shared Tehillim ---
function shortId() {
  return Math.random().toString(36).slice(2, 10);
}

export async function createTehillimCampaign({ type, title, reason, deadline, createdBy }) {
  const p = getPool();
  if (!p) throw new Error('Database not available');
  const id = shortId();
  await p.query(
    `INSERT INTO tehillim_campaigns (id, type, title, reason, deadline, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, type, title || '', reason || '', deadline || null, createdBy || null]
  );
  return { id, type, title: title || '', reason: reason || '', deadline: deadline || null };
}

export async function getTehillimCampaign(id) {
  const p = getPool();
  if (!p) return null;
  const r = await p.query(
    `SELECT id, type, title, reason, deadline, created_at, created_by FROM tehillim_campaigns WHERE id = $1`,
    [id]
  );
  if (!r.rows[0]) return null;
  const row = r.rows[0];
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    reason: row.reason,
    deadline: row.deadline ? row.deadline.toISOString() : null,
    created_at: row.created_at?.toISOString(),
    created_by: row.created_by,
  };
}

/** For split: commitments (one per perek). For shared: completions (many per perek). */
export async function getTehillimCampaignPereks(campaignId) {
  const p = getPool();
  if (!p) return { commitments: [], completions: [] };
  const campaign = await getTehillimCampaign(campaignId);
  if (!campaign) return null;
  if (campaign.type === 'split') {
    const r = await p.query(
      `SELECT perek_number, participant_id, completed_at, created_at FROM tehillim_commitments WHERE campaign_id = $1 ORDER BY perek_number`,
      [campaignId]
    );
    return {
      commitments: r.rows.map((row) => ({
        perek_number: row.perek_number,
        participant_id: row.participant_id,
        completed_at: row.completed_at ? row.completed_at.toISOString() : null,
        created_at: row.created_at?.toISOString(),
      })),
      completions: [],
    };
  }
  const r = await p.query(
    `SELECT perek_number, participant_id, completed_at, created_at FROM tehillim_completions WHERE campaign_id = $1 ORDER BY perek_number`,
    [campaignId]
  );
  return {
    commitments: [],
    completions: r.rows.map((row) => ({
      perek_number: row.perek_number,
      participant_id: row.participant_id,
      completed_at: row.completed_at ? row.completed_at.toISOString() : null,
      created_at: row.created_at?.toISOString(),
    })),
  };
}

/** Split mode: claim a range. Fails if any perek already claimed. */
export async function claimTehillimRange(campaignId, perekStart, perekEnd, participantId) {
  const p = getPool();
  if (!p) throw new Error('Database not available');
  const campaign = await getTehillimCampaign(campaignId);
  if (!campaign || campaign.type !== 'split') throw new Error('Campaign not found or not split mode');
  for (let n = perekStart; n <= perekEnd; n++) {
    const existing = await p.query(
      `SELECT 1 FROM tehillim_commitments WHERE campaign_id = $1 AND perek_number = $2`,
      [campaignId, n]
    );
    if (existing.rows.length > 0) throw new Error(`Perek ${n} already claimed`);
  }
  for (let n = perekStart; n <= perekEnd; n++) {
    await p.query(
      `INSERT INTO tehillim_commitments (campaign_id, perek_number, participant_id) VALUES ($1, $2, $3)`,
      [campaignId, n, participantId]
    );
  }
  return { claimed: perekEnd - perekStart + 1 };
}

/** Mark perek(s) complete. Split: update commitment row. Shared: insert into completions. */
export async function completeTehillimPereks(campaignId, perekNumbers, participantId) {
  const p = getPool();
  if (!p) throw new Error('Database not available');
  const campaign = await getTehillimCampaign(campaignId);
  if (!campaign) throw new Error('Campaign not found');
  for (const perek of perekNumbers) {
    if (campaign.type === 'split') {
      await p.query(
        `UPDATE tehillim_commitments SET completed_at = NOW() WHERE campaign_id = $1 AND perek_number = $2 AND participant_id = $3`,
        [campaignId, perek, participantId]
      );
    } else {
      await p.query(
        `INSERT INTO tehillim_completions (campaign_id, perek_number, participant_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (campaign_id, perek_number, participant_id) DO UPDATE SET completed_at = NOW()`,
        [campaignId, perek, participantId]
      );
    }
  }
  return { completed: perekNumbers.length };
}

/** Status for UI: campaign + perek state (claimed/completed). */
export async function getTehillimCampaignStatus(campaignId, participantId) {
  const campaign = await getTehillimCampaign(campaignId);
  if (!campaign) return null;
  const data = await getTehillimCampaignPereks(campaignId);
  if (!data) return null;
  const byPerek = {};
  if (campaign.type === 'split') {
    data.commitments.forEach((c) => {
      byPerek[c.perek_number] = { participant_id: c.participant_id, completed_at: c.completed_at, is_mine: c.participant_id === participantId };
    });
  } else {
    data.completions.filter((c) => c.participant_id === participantId).forEach((c) => {
      byPerek[c.perek_number] = { completed_at: c.completed_at };
    });
  }
  return { campaign, byPerek };
}

const EXPIRED_GRACE_DAYS = 3;

/** Delete campaigns that have a deadline and it passed more than EXPIRED_GRACE_DAYS ago. */
export async function cleanupExpiredTehillimCampaigns() {
  const p = getPool();
  if (!p) return 0;
  const r = await p.query(
    `DELETE FROM tehillim_campaigns
     WHERE deadline IS NOT NULL AND deadline < NOW() - INTERVAL '${EXPIRED_GRACE_DAYS} days'
     RETURNING id`
  );
  return r.rowCount ?? 0;
}

/** Join a campaign so it appears in "Your Tehillim pages". Idempotent. */
export async function joinTehillimCampaign(campaignId, participantId) {
  const p = getPool();
  if (!p) throw new Error('Database not available');
  const campaign = await getTehillimCampaign(campaignId);
  if (!campaign) throw new Error('Campaign not found');
  await p.query(
    `INSERT INTO tehillim_participants (campaign_id, participant_id) VALUES ($1, $2) ON CONFLICT (campaign_id, participant_id) DO NOTHING`,
    [campaignId, participantId]
  );
  return { joined: true };
}

/** List campaigns for a participant: created by them or they have commitments/completions or joined. Excludes expired+grace. */
export async function listTehillimCampaignsForParticipant(participantId) {
  const p = getPool();
  if (!p) return [];
  await cleanupExpiredTehillimCampaigns();
  const r = await p.query(
    `SELECT c.id, c.type, c.title, c.reason, c.deadline, c.created_at, c.created_by
     FROM tehillim_campaigns c
     LEFT JOIN tehillim_commitments cm ON cm.campaign_id = c.id AND cm.participant_id = $1
     LEFT JOIN tehillim_completions cp ON cp.campaign_id = c.id AND cp.participant_id = $1
     LEFT JOIN tehillim_participants tp ON tp.campaign_id = c.id AND tp.participant_id = $1
     WHERE (c.created_by = $1 OR cm.campaign_id IS NOT NULL OR cp.campaign_id IS NOT NULL OR tp.campaign_id IS NOT NULL)
       AND (c.deadline IS NULL OR c.deadline >= NOW() - INTERVAL '${EXPIRED_GRACE_DAYS} days')
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [participantId]
  );
  return r.rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    reason: row.reason,
    deadline: row.deadline ? row.deadline.toISOString() : null,
    created_at: row.created_at?.toISOString(),
    created_by: row.created_by,
    is_creator: row.created_by === participantId,
  }));
}

/** Remove this participant from the campaign (their commitments, completions, and participant record). */
export async function leaveTehillimCampaign(campaignId, participantId) {
  const p = getPool();
  if (!p) throw new Error('Database not available');
  await p.query(`DELETE FROM tehillim_commitments WHERE campaign_id = $1 AND participant_id = $2`, [campaignId, participantId]);
  await p.query(`DELETE FROM tehillim_completions WHERE campaign_id = $1 AND participant_id = $2`, [campaignId, participantId]);
  await p.query(`DELETE FROM tehillim_participants WHERE campaign_id = $1 AND participant_id = $2`, [campaignId, participantId]);
  return { left: true };
}

/** Delete campaign entirely; only allowed if created_by matches. */
export async function deleteTehillimCampaign(campaignId, participantId) {
  const p = getPool();
  if (!p) throw new Error('Database not available');
  const campaign = await getTehillimCampaign(campaignId);
  if (!campaign) throw new Error('Campaign not found');
  if (campaign.created_by !== participantId) throw new Error('Only the creator can delete the campaign');
  await p.query(`DELETE FROM tehillim_campaigns WHERE id = $1`, [campaignId]);
  return { deleted: true };
}

/** Count of tehillim_perek_completed events with source=private (for admin stats). */
export async function getPrivateTehillimPerekCount(startDate, endDate) {
  const p = getPool();
  if (!p) return 0;
  const conditions = ["event_name = 'tehillim_perek_completed'", "(payload->>'source' = 'private' OR payload->>'source' IS NULL)"];
  const params = [];
  let i = 1;
  if (startDate) {
    conditions.push(`event_time_utc >= $${i}`);
    params.push(startDate);
    i++;
  }
  if (endDate) {
    conditions.push(`event_time_utc <= $${i}`);
    params.push(endDate + 'T23:59:59.999Z');
    i++;
  }
  const where = conditions.join(' AND ');
  const res = await p.query(
    `SELECT COUNT(*) AS count FROM events WHERE ${where}`,
    params
  );
  return Number(res.rows[0]?.count ?? 0);
}

/** Admin Tehillim stats: shared pages created, shared perakim completed (from DB), private perakim completed (from events). */
export async function getTehillimStats(startDate, endDate) {
  const p = getPool();
  let sharedPagesCreated = 0;
  let sharedPerakimCompleted = 0;
  if (p) {
    const [pagesRes, commitRes, complRes] = await Promise.all([
      p.query(`SELECT COUNT(*) AS count FROM tehillim_campaigns`),
      p.query(`SELECT COUNT(*) AS count FROM tehillim_commitments WHERE completed_at IS NOT NULL`),
      p.query(`SELECT COUNT(*) AS count FROM tehillim_completions`),
    ]);
    sharedPagesCreated = Number(pagesRes.rows[0]?.count ?? 0);
    sharedPerakimCompleted = Number(commitRes.rows[0]?.count ?? 0) + Number(complRes.rows[0]?.count ?? 0);
  }
  const privatePerakimCompleted = await getPrivateTehillimPerekCount(startDate, endDate);
  return {
    shared_pages_created: sharedPagesCreated,
    shared_perakim_completed: sharedPerakimCompleted,
    private_perakim_completed: privatePerakimCompleted,
  };
}
