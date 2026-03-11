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
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3333;

await initDb();

// Health for Railway
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'siddur-analytics-api' });
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

// Admin dashboard (static)
const publicDir = path.join(__dirname, 'public');
app.use('/dashboard', express.static(publicDir));
app.get('/dashboard', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

app.listen(PORT, () => {
  console.log(`[analytics-api] Listening on port ${PORT}`);
});
