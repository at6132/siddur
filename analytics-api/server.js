/**
 * Analytics API for Siddur app. Deploy to Railway.
 * POST /api/events - ingest batch
 * GET /api/events - list with filters
 * GET /api/stats/active-users - DAU/WAU/MAU
 * GET /api/stats/event-counts - counts by event_name (funnel)
 * POST /api/identities/merge - merge anonymous_id -> user_id
 * GET /api/health - health check
 * Serves admin dashboard from /dashboard
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initDb,
  insertEvents,
  queryEvents,
  uniqueUsersInRange,
  uniqueUsersByDay,
  mergeIdentity,
  upsertIdentityProfile,
  getEventCountsByName,
  getRetention,
  createTehillimCampaign,
  getTehillimCampaign,
  getTehillimCampaignPereks,
  getTehillimCampaignStatus,
  claimTehillimRange,
  completeTehillimPereks,
  listTehillimCampaignsForParticipant,
  leaveTehillimCampaign,
  deleteTehillimCampaign,
  joinTehillimCampaign,
  getTehillimStats,
  getFeatureUsage,
  getFeatureUsers,
  getDetailedUsage,
  getFeatureActionBreakdown,
  getProductActionStats,
  getScreenStats,
  getEventPropertyBreakdown,
  getFeatureSeries,
  getAudienceBreakdown,
  getReminderOptIns,
  createSupportRequest,
  listSupportRequests,
  updateSupportRequest,
  getSupportStats,
} from './db.js';
import {
  initContentBugTables,
  createContentBugReport,
  listContentBugReports,
  getContentBugReport,
  updateContentBugReport,
  getContentBugStats,
} from './contentBugStore.js';
import {
  listEruvs,
  getEruvById,
  getEruvDisclaimer,
  listEruvBoundaries,
  getEruvBoundary,
} from './eruv/store.js';
import {
  refreshEruvStatuses,
  startEruvWorker,
  getEruvWorkerStatus,
} from './eruv/worker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

const PORT = process.env.PORT || 3333;
const ERUV_REFRESH_SECRET = process.env.ERUV_REFRESH_SECRET || '';

await initDb();
await initContentBugTables();
startEruvWorker();

// Health for Railway
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'siddur-analytics-api' });
});

// --- Eruv aggregator (US catalog + status; external fetches happen only on Railway) ---
app.get('/api/eruvs', async (req, res) => {
  try {
    const country = typeof req.query.country === 'string' ? req.query.country : 'US';
    const includeGeometry = req.query.includeGeometry === '1' || req.query.includeGeometry === 'true';
    const eruvs = await listEruvs({ country });
    const boundaries = await listEruvBoundaries();
    const byId = new Map(boundaries.map((b) => [b.eruvId, b]));
    const enriched = eruvs.map((e) => {
      const b = byId.get(e.id);
      const row = { ...e, hasExactBoundary: Boolean(b?.geometry) };
      if (includeGeometry && b?.geometry) {
        row.geometry = b.geometry;
        row.boundarySourceUrl = b.sourceUrl;
      }
      return row;
    });
    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      country,
      disclaimer: getEruvDisclaimer(),
      eruvs: enriched,
      boundaryCount: boundaries.length,
      worker: getEruvWorkerStatus(),
    });
  } catch (e) {
    console.error('[analytics-api] GET /api/eruvs', e);
    res.status(500).json({ error: 'Failed to list eruvs' });
  }
});

app.get('/api/eruvs/boundaries', async (req, res) => {
  try {
    const boundaries = await listEruvBoundaries();
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ boundaries });
  } catch (e) {
    console.error('[analytics-api] GET /api/eruvs/boundaries', e);
    res.status(500).json({ error: 'Failed to list boundaries' });
  }
});

app.get('/api/eruvs/:id', async (req, res) => {
  try {
    const eruv = await getEruvById(req.params.id);
    if (!eruv) return res.status(404).json({ error: 'Eruv not found' });
    const boundary = await getEruvBoundary(eruv.id);
    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      disclaimer: getEruvDisclaimer(),
      eruv: {
        ...eruv,
        hasExactBoundary: Boolean(boundary?.geometry),
        geometry: boundary?.geometry || null,
        boundarySourceUrl: boundary?.sourceUrl || null,
      },
    });
  } catch (e) {
    console.error('[analytics-api] GET /api/eruvs/:id', e);
    res.status(500).json({ error: 'Failed to load eruv' });
  }
});

app.post('/api/eruvs/refresh', async (req, res) => {
  try {
    const secret = req.get('x-eruv-refresh-secret') || req.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!ERUV_REFRESH_SECRET || secret !== ERUV_REFRESH_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Full resync (catalog seed + status) unless ?statusOnly=1
    const statusOnly =
      req.query.statusOnly === '1' ||
      req.query.statusOnly === 'true' ||
      req.body?.statusOnly === true;
    const result = await refreshEruvStatuses({ resyncCatalog: !statusOnly });
    res.json(result);
  } catch (e) {
    console.error('[analytics-api] POST /api/eruvs/refresh', e);
    res.status(500).json({ error: 'Failed to refresh eruv statuses' });
  }
});

// Ingest events (batch)
app.post('/api/events', async (req, res) => {
  try {
    const body = req.body;
    const events = Array.isArray(body.events) ? body.events : Array.isArray(body) ? body : [];
    if (events.length === 0) {
      return res.status(400).json({ error: 'events array required' });
    }
    const result = await insertEvents(events);
    res.status(202).json({ accepted: events.length, ...result });
  } catch (e) {
    console.error('[analytics-api] POST /api/events', e);
    res.status(500).json({ error: 'Failed to ingest events' });
  }
});

// Query events (dashboard)
app.get('/api/events', async (req, res) => {
  try {
    const filters = {
      start_date: req.query.start_date || undefined,
      end_date: req.query.end_date || undefined,
      event_name: req.query.event_name || undefined,
      app_version: req.query.app_version || undefined,
      environment: req.query.environment || undefined,
      anonymous_id: req.query.anonymous_id || undefined,
      user_id: req.query.user_id || undefined,
      limit: Math.min(parseInt(req.query.limit, 10) || 1000, 5000),
      offset: parseInt(req.query.offset, 10) || 0,
    };
    const events = await queryEvents(filters);
    res.json({ events });
  } catch (e) {
    console.error('[analytics-api] GET /api/events', e);
    res.status(500).json({ error: 'Failed to query events' });
  }
});

// DAU / WAU / MAU (unique users in period for app_open)
app.get('/api/stats/active-users', async (req, res) => {
  try {
    const end = new Date();
    const startD = new Date(end);
    startD.setDate(startD.getDate() - 1);
    const startW = new Date(end);
    startW.setDate(startW.getDate() - 7);
    const startM = new Date(end);
    startM.setMonth(startM.getMonth() - 1);

    const toIso = (d) => d.toISOString().slice(0, 19) + 'Z';
    const [dau, wau, mau] = await Promise.all([
      uniqueUsersInRange('app_open', toIso(startD), toIso(end)),
      uniqueUsersInRange('app_open', toIso(startW), toIso(end)),
      uniqueUsersInRange('app_open', toIso(startM), toIso(end)),
    ]);

    res.json({
      dau: typeof dau === 'number' ? dau : 0,
      wau: typeof wau === 'number' ? wau : 0,
      mau: typeof mau === 'number' ? mau : 0,
    });
  } catch (e) {
    console.error('[analytics-api] GET /api/stats/active-users', e);
    res.status(500).json({ error: 'Failed to compute active users' });
  }
});

// Time series for a given event (e.g. app_open for installs)
app.get('/api/stats/event-series', async (req, res) => {
  try {
    const event_name = req.query.event_name || 'app_open';
    const days = Math.min(parseInt(req.query.days, 10) || 30, 90);
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    const toIso = (d) => d.toISOString().slice(0, 19) + 'Z';
    const byDay = await uniqueUsersByDay(event_name, toIso(start), toIso(end));
    res.json({ event_name, by_day: byDay });
  } catch (e) {
    console.error('[analytics-api] GET /api/stats/event-series', e);
    res.status(500).json({ error: 'Failed to get event series' });
  }
});

// Merge identity (on signup/login)
app.post('/api/identities/merge', async (req, res) => {
  try {
    const { anonymous_id, user_id, profile } = req.body || {};
    if (!anonymous_id || !user_id) {
      return res.status(400).json({ error: 'anonymous_id and user_id required' });
    }
    await mergeIdentity(anonymous_id, user_id, profile || {});
    res.json({ ok: true });
  } catch (e) {
    console.error('[analytics-api] POST /api/identities/merge', e);
    res.status(500).json({ error: 'Failed to merge identity' });
  }
});

// Update profile (non-PII)
app.post('/api/identities/profile', async (req, res) => {
  try {
    const { anonymous_id, profile } = req.body || {};
    if (!anonymous_id || !profile) {
      return res.status(400).json({ error: 'anonymous_id and profile required' });
    }
    await upsertIdentityProfile(anonymous_id, profile);
    res.json({ ok: true });
  } catch (e) {
    console.error('[analytics-api] POST /api/identities/profile', e);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Retention (cohort by first app_open, retained at day 1/7/30)
app.get('/api/stats/retention', async (req, res) => {
  try {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 90);
    const start_date = req.query.start_date || start.toISOString().slice(0, 19) + 'Z';
    const end_date = req.query.end_date || end.toISOString().slice(0, 19) + 'Z';
    const rows = await getRetention(start_date, end_date);
    res.json({ retention: rows });
  } catch (e) {
    console.error('[analytics-api] GET /api/stats/retention', e);
    res.status(500).json({ error: 'Failed to get retention' });
  }
});

// Event counts by name (for funnel / overview)
app.get('/api/stats/event-counts', async (req, res) => {
  try {
    const start_date = req.query.start_date || undefined;
    const end_date = req.query.end_date || undefined;
    const counts = await getEventCountsByName(start_date, end_date);
    res.json({ counts });
  } catch (e) {
    console.error('[analytics-api] GET /api/stats/event-counts', e);
    res.status(500).json({ error: 'Failed to get event counts' });
  }
});

// Tehillim stats: private perakim (from events), shared perakim (from DB), shared pages created
app.get('/api/stats/tehillim', async (req, res) => {
  try {
    const start_date = req.query.start_date || undefined;
    const end_date = req.query.end_date || undefined;
    const stats = await getTehillimStats(start_date, end_date);
    res.json(stats);
  } catch (e) {
    console.error('[analytics-api] GET /api/stats/tehillim', e);
    res.status(500).json({ error: 'Failed to get Tehillim stats' });
  }
});

// Feature usage: unique users + event counts per feature (who uses what)
app.get('/api/stats/feature-usage', async (req, res) => {
  try {
    const start_date = req.query.start_date || undefined;
    const end_date = req.query.end_date || undefined;
    const features = await getFeatureUsage(start_date, end_date);
    res.json({ features });
  } catch (e) {
    console.error('[analytics-api] GET /api/stats/feature-usage', e);
    res.status(500).json({ error: 'Failed to get feature usage' });
  }
});

// Top users for a feature (paste id into Users explorer)
app.get('/api/stats/feature-users', async (req, res) => {
  try {
    const start_date = req.query.start_date || undefined;
    const end_date = req.query.end_date || undefined;
    const feature = req.query.feature || undefined;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const users = await getFeatureUsers(feature, start_date, end_date, limit);
    res.json({ feature: feature || null, users });
  } catch (e) {
    console.error('[analytics-api] GET /api/stats/feature-users', e);
    res.status(500).json({ error: 'Failed to get feature users' });
  }
});

// Detailed product analytics for Features dashboard
app.get('/api/stats/detailed', async (req, res) => {
  try {
    const start_date = req.query.start_date || undefined;
    const end_date = req.query.end_date || undefined;
    const data = await getDetailedUsage(start_date, end_date);
    res.json(data);
  } catch (e) {
    console.error('[analytics-api] GET /api/stats/detailed', e);
    res.status(500).json({ error: 'Failed to get detailed usage' });
  }
});

// Event mix inside a feature
app.get('/api/stats/feature-actions', async (req, res) => {
  try {
    const start_date = req.query.start_date || undefined;
    const end_date = req.query.end_date || undefined;
    const feature = req.query.feature || undefined;
    const actions = await getFeatureActionBreakdown(feature, start_date, end_date);
    res.json({ feature: feature || null, actions });
  } catch (e) {
    console.error('[analytics-api] GET /api/stats/feature-actions', e);
    res.status(500).json({ error: 'Failed to get feature actions' });
  }
});

app.get('/api/stats/product-actions', async (req, res) => {
  try {
    const actions = await getProductActionStats(req.query.start_date || undefined, req.query.end_date || undefined);
    res.json({ actions });
  } catch (e) {
    console.error('[analytics-api] GET /api/stats/product-actions', e);
    res.status(500).json({ error: 'Failed to get product actions' });
  }
});

app.get('/api/stats/screens', async (req, res) => {
  try {
    const screens = await getScreenStats(
      req.query.start_date || undefined,
      req.query.end_date || undefined,
      Math.min(parseInt(req.query.limit, 10) || 30, 100)
    );
    res.json({ screens });
  } catch (e) {
    console.error('[analytics-api] GET /api/stats/screens', e);
    res.status(500).json({ error: 'Failed to get screen stats' });
  }
});

app.get('/api/stats/breakdown', async (req, res) => {
  try {
    const event_name = req.query.event_name;
    const property = req.query.property;
    if (!event_name || !property) {
      return res.status(400).json({ error: 'event_name and property required' });
    }
    const rows = await getEventPropertyBreakdown(
      event_name,
      property,
      req.query.start_date || undefined,
      req.query.end_date || undefined,
      Math.min(parseInt(req.query.limit, 10) || 25, 100)
    );
    res.json({ event_name, property, rows });
  } catch (e) {
    console.error('[analytics-api] GET /api/stats/breakdown', e);
    res.status(500).json({ error: 'Failed to get breakdown' });
  }
});

app.get('/api/stats/feature-series', async (req, res) => {
  try {
    const data = await getFeatureSeries(
      req.query.start_date || undefined,
      req.query.end_date || undefined,
      Math.min(parseInt(req.query.top, 10) || 5, 10)
    );
    res.json(data);
  } catch (e) {
    console.error('[analytics-api] GET /api/stats/feature-series', e);
    res.status(500).json({ error: 'Failed to get feature series' });
  }
});

app.get('/api/stats/audience', async (req, res) => {
  try {
    const data = await getAudienceBreakdown(req.query.start_date || undefined, req.query.end_date || undefined);
    res.json(data);
  } catch (e) {
    console.error('[analytics-api] GET /api/stats/audience', e);
    res.status(500).json({ error: 'Failed to get audience breakdown' });
  }
});

app.get('/api/stats/reminders', async (req, res) => {
  try {
    const data = await getReminderOptIns();
    res.json(data);
  } catch (e) {
    console.error('[analytics-api] GET /api/stats/reminders', e);
    res.status(500).json({ error: 'Failed to get reminder opt-ins' });
  }
});

// --- Shared Tehillim ---
// Shareable link base. Set TEHILLIM_BASE_URL in Railway to override (e.g. if domain points to API).
const TEHILLIM_BASE_URL =
  process.env.TEHILLIM_BASE_URL ||
  process.env.RAILWAY_STATIC_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null) ||
  'https://siddur24seven.com';

app.post('/api/tehillim/campaigns', async (req, res) => {
  try {
    const { type, title, reason, deadline, created_by } = req.body || {};
    if (!type || !['split', 'shared'].includes(type)) {
      return res.status(400).json({ error: 'type must be "split" or "shared"' });
    }
    const campaign = await createTehillimCampaign({
      type,
      title: title || '',
      reason: reason || '',
      deadline: deadline || null,
      createdBy: created_by || null,
    });
    const link = `${TEHILLIM_BASE_URL}/tehillim/${campaign.id}`;
    res.status(201).json({ campaign: { ...campaign, link } });
  } catch (e) {
    console.error('[analytics-api] POST /api/tehillim/campaigns', e);
    res.status(500).json({ error: e.message || 'Failed to create campaign' });
  }
});

app.get('/api/tehillim/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const participantId = req.query.participant_id || '';
    const campaign = await getTehillimCampaign(id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const status = await getTehillimCampaignStatus(id, participantId);
    const raw = await getTehillimCampaignPereks(id);
    res.json({
      campaign,
      byPerek: status?.byPerek || {},
      commitments: raw?.commitments || [],
      completions: raw?.completions || [],
    });
  } catch (e) {
    console.error('[analytics-api] GET /api/tehillim/campaigns/:id', e);
    res.status(500).json({ error: 'Failed to get campaign' });
  }
});

app.post('/api/tehillim/campaigns/:id/commit', async (req, res) => {
  try {
    const { id } = req.params;
    const { perek_start, perek_end, participant_id } = req.body || {};
    const start = parseInt(perek_start, 10);
    const end = parseInt(perek_end, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end > 150 || start > end) {
      return res.status(400).json({ error: 'perek_start and perek_end must be 1–150, start <= end' });
    }
    if (!participant_id) return res.status(400).json({ error: 'participant_id required' });
    const result = await claimTehillimRange(id, start, end, participant_id);
    res.json(result);
  } catch (e) {
    if (e.message?.includes('already claimed')) return res.status(409).json({ error: e.message });
    console.error('[analytics-api] POST /api/tehillim/campaigns/:id/commit', e);
    res.status(500).json({ error: e.message || 'Failed to claim range' });
  }
});

app.post('/api/tehillim/campaigns/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { perek_numbers, participant_id } = req.body || {};
    const arr = Array.isArray(perek_numbers) ? perek_numbers : [perek_numbers].filter(Boolean).map((n) => parseInt(n, 10));
    if (arr.length === 0 || arr.some((n) => !Number.isFinite(n) || n < 1 || n > 150)) {
      return res.status(400).json({ error: 'perek_numbers must be array of 1–150' });
    }
    if (!participant_id) return res.status(400).json({ error: 'participant_id required' });
    const result = await completeTehillimPereks(id, arr, participant_id);
    res.json(result);
  } catch (e) {
    console.error('[analytics-api] POST /api/tehillim/campaigns/:id/complete', e);
    res.status(500).json({ error: e.message || 'Failed to complete' });
  }
});

app.get('/api/tehillim/campaigns', async (req, res) => {
  try {
    const participantId = req.query.participant_id || '';
    if (!participantId) return res.status(400).json({ error: 'participant_id required' });
    const campaigns = await listTehillimCampaignsForParticipant(participantId);
    res.json({ campaigns });
  } catch (e) {
    console.error('[analytics-api] GET /api/tehillim/campaigns', e);
    res.status(500).json({ error: 'Failed to list campaigns' });
  }
});

app.post('/api/tehillim/campaigns/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { participant_id } = req.body || {};
    if (!participant_id) return res.status(400).json({ error: 'participant_id required' });
    await joinTehillimCampaign(id, participant_id);
    res.json({ joined: true });
  } catch (e) {
    if (e.message?.includes('not found')) return res.status(404).json({ error: e.message });
    console.error('[analytics-api] POST /api/tehillim/campaigns/:id/join', e);
    res.status(500).json({ error: e.message || 'Failed to join' });
  }
});

app.post('/api/tehillim/campaigns/:id/leave', async (req, res) => {
  try {
    const { id } = req.params;
    const { participant_id } = req.body || {};
    if (!participant_id) return res.status(400).json({ error: 'participant_id required' });
    await leaveTehillimCampaign(id, participant_id);
    res.json({ left: true });
  } catch (e) {
    console.error('[analytics-api] POST /api/tehillim/campaigns/:id/leave', e);
    res.status(500).json({ error: e.message || 'Failed to leave' });
  }
});

app.delete('/api/tehillim/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const participantId = req.query.participant_id || req.body?.participant_id || '';
    if (!participantId) return res.status(400).json({ error: 'participant_id required' });
    await deleteTehillimCampaign(id, participantId);
    res.json({ deleted: true });
  } catch (e) {
    if (e.message?.includes('Only the creator')) return res.status(403).json({ error: e.message });
    if (e.message?.includes('not found')) return res.status(404).json({ error: e.message });
    console.error('[analytics-api] DELETE /api/tehillim/campaigns/:id', e);
    res.status(500).json({ error: e.message || 'Failed to delete' });
  }
});

// Redirect web link to app: GET /tehillim/:id → siddur://tehillim/:id (so opening https://siddur24seven.com/tehillim/xyz opens the app)
app.get('/tehillim/:id', (req, res) => {
  const { id } = req.params;
  if (!id || !/^[a-z0-9]+$/i.test(id)) return res.status(400).send('Invalid campaign id');
  res.redirect(302, `siddur://tehillim/${id}`);
});

// Redirect Refuah share link to app: GET /refuah/add?n=&m=&g= → siddur://refuah/add?...
app.get('/refuah/add', (req, res) => {
  const n = typeof req.query.n === 'string' ? req.query.n.trim() : '';
  const m = typeof req.query.m === 'string' ? req.query.m.trim() : '';
  const g = typeof req.query.g === 'string' ? req.query.g.trim().toLowerCase() : '';
  if (!n || !m || (g !== 'male' && g !== 'female')) {
    return res.status(400).send('Invalid Refuah share link');
  }
  const params = new URLSearchParams({ n, m, g });
  res.redirect(302, `siddur://refuah/add?${params.toString()}`);
});

// --- Support inbox ---
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const supportHits = new Map();

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function isSupportRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const hits = (supportHits.get(ip) || []).filter((t) => now - t < windowMs);
  if (hits.length >= 5) {
    supportHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  supportHits.set(ip, hits);
  return false;
}

function trimField(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

app.post('/api/support', async (req, res) => {
  try {
    const body = req.body || {};
    if (trimField(body.website, 80)) {
      return res.status(201).json({ ok: true });
    }
    const ip = clientIp(req);
    if (isSupportRateLimited(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later or email shevastudios@gmail.com.' });
    }
    const name = trimField(body.name, 100);
    const email = trimField(body.email, 200).toLowerCase();
    const subject = trimField(body.subject, 200);
    const message = trimField(body.message, 4000);
    const appVersion = trimField(body.app_version, 40) || null;
    const platform = trimField(body.platform, 40) || null;
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'A valid email is required so we can reply.' });
    }
    if (subject.length < 3) {
      return res.status(400).json({ error: 'Please add a short subject.' });
    }
    if (message.length < 10) {
      return res.status(400).json({ error: 'Please describe how we can help (at least a sentence).' });
    }
    const row = await createSupportRequest({
      name,
      email,
      subject,
      message,
      appVersion,
      platform,
    });
    res.status(201).json({ ok: true, id: row.id });
  } catch (e) {
    console.error('[analytics-api] POST /api/support', e);
    res.status(500).json({ error: 'Could not send your message. Email shevastudios@gmail.com instead.' });
  }
});

app.get('/api/support', async (req, res) => {
  try {
    const status = req.query.status || undefined;
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
    const offset = parseInt(req.query.offset, 10) || 0;
    const [requests, stats] = await Promise.all([
      listSupportRequests({ status, limit, offset }),
      getSupportStats(),
    ]);
    res.json({ requests, stats });
  } catch (e) {
    console.error('[analytics-api] GET /api/support', e);
    res.status(500).json({ error: 'Failed to list support requests' });
  }
});

app.post('/api/support/:id/status', async (req, res) => {
  try {
    const { status, admin_notes } = req.body || {};
    const row = await updateSupportRequest(req.params.id, {
      status: status || undefined,
      adminNotes: admin_notes != null ? admin_notes : undefined,
    });
    if (!row) return res.status(404).json({ error: 'Request not found' });
    res.json({ request: row });
  } catch (e) {
    if (e.message === 'Invalid status' || e.message === 'Invalid id') {
      return res.status(400).json({ error: e.message });
    }
    console.error('[analytics-api] POST /api/support/:id/status', e);
    res.status(500).json({ error: 'Failed to update support request' });
  }
});

// --- Content bug reports (in-app reader bug button) ---
const contentBugHits = new Map();
function isContentBugRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const hits = (contentBugHits.get(ip) || []).filter((t) => now - t < windowMs);
  if (hits.length >= 20) {
    contentBugHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  contentBugHits.set(ip, hits);
  return false;
}

app.post('/api/content-bugs', async (req, res) => {
  try {
    const body = req.body || {};
    const ip = clientIp(req);
    if (isContentBugRateLimited(ip)) {
      return res.status(429).json({ error: 'Too many reports. Please try again later.' });
    }
    const source = trimField(body.source, 40);
    const title = trimField(body.title, 200);
    const context = trimField(body.context, 300);
    const category = trimField(body.category, 40) || 'other';
    const note = trimField(body.note, 2000);
    const appVersion = trimField(body.app_version, 40) || null;
    const platform = trimField(body.platform, 40) || null;
    let screenshotBase64 = typeof body.screenshot_base64 === 'string' ? body.screenshot_base64 : null;
    if (screenshotBase64 && screenshotBase64.startsWith('data:')) {
      const comma = screenshotBase64.indexOf(',');
      screenshotBase64 = comma >= 0 ? screenshotBase64.slice(comma + 1) : screenshotBase64;
    }
    if (screenshotBase64 && screenshotBase64.length > 1_500_000) {
      screenshotBase64 = screenshotBase64.slice(0, 1_500_000);
    }
    if (!source && !title && !note && !screenshotBase64) {
      return res.status(400).json({ error: 'Add a note or screenshot.' });
    }
    const row = await createContentBugReport({
      source: source || 'unknown',
      title: title || 'Untitled',
      context,
      category,
      note,
      screenshotBase64,
      screenshotMime: trimField(body.screenshot_mime, 40) || 'image/jpeg',
      appVersion,
      platform,
    });
    res.status(201).json({ ok: true, id: row.id });
  } catch (e) {
    console.error('[analytics-api] POST /api/content-bugs', e);
    res.status(500).json({ error: 'Could not save the report.' });
  }
});

app.get('/api/content-bugs', async (req, res) => {
  try {
    const status = req.query.status || undefined;
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
    const offset = parseInt(req.query.offset, 10) || 0;
    const includeScreenshots = req.query.include_screenshots === '1';
    const [reports, stats] = await Promise.all([
      listContentBugReports({ status, limit, offset, includeScreenshots }),
      getContentBugStats(),
    ]);
    res.json({ reports, stats });
  } catch (e) {
    console.error('[analytics-api] GET /api/content-bugs', e);
    res.status(500).json({ error: 'Failed to list content bug reports' });
  }
});

app.get('/api/content-bugs/:id', async (req, res) => {
  try {
    const row = await getContentBugReport(req.params.id);
    if (!row) return res.status(404).json({ error: 'Report not found' });
    res.json({ report: row });
  } catch (e) {
    if (e.message === 'Invalid id') return res.status(400).json({ error: e.message });
    console.error('[analytics-api] GET /api/content-bugs/:id', e);
    res.status(500).json({ error: 'Failed to load report' });
  }
});

app.post('/api/content-bugs/:id/status', async (req, res) => {
  try {
    const { status, admin_notes } = req.body || {};
    const row = await updateContentBugReport(req.params.id, {
      status: status || undefined,
      adminNotes: admin_notes != null ? admin_notes : undefined,
    });
    if (!row) return res.status(404).json({ error: 'Report not found' });
    res.json({ report: row });
  } catch (e) {
    if (e.message === 'Invalid status' || e.message === 'Invalid id') {
      return res.status(400).json({ error: e.message });
    }
    console.error('[analytics-api] POST /api/content-bugs/:id/status', e);
    res.status(500).json({ error: 'Failed to update content bug report' });
  }
});

// Admin dashboard + public legal pages (static)
const publicDir = path.join(__dirname, 'public');
app.use('/dashboard', express.static(publicDir));
app.get('/dashboard', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.get('/legal.css', (req, res) => res.sendFile(path.join(publicDir, 'legal.css')));
app.get(['/privacy', '/privacy.html'], (req, res) => {
  res.sendFile(path.join(publicDir, 'privacy.html'));
});
app.get(['/terms', '/terms.html'], (req, res) => {
  res.sendFile(path.join(publicDir, 'terms.html'));
});
app.get(['/support', '/support.html'], (req, res) => {
  res.sendFile(path.join(publicDir, 'support.html'));
});
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'home.html'));
});

app.listen(PORT, () => {
  console.log(`[analytics-api] Listening on port ${PORT}`);
});
