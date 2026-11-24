/**
 * Content bug reports from in-app reader bug button.
 */
import { getPool } from './db.js';

const memoryBugs = [];

const CATEGORIES = new Set(['hard_to_read', 'incorrect', 'missing', 'other']);
const STATUSES = new Set(['new', 'in_progress', 'resolved']);

function mapRow(row, { includeScreenshot = true } = {}) {
  if (!row) return null;
  const out = {
    id: Number(row.id),
    source: row.source || '',
    title: row.title || '',
    context: row.context || '',
    category: row.category || 'other',
    note: row.note || '',
    screenshot_mime: row.screenshot_mime || null,
    has_screenshot: Boolean(row.screenshot_base64),
    app_version: row.app_version || null,
    platform: row.platform || null,
    status: row.status,
    admin_notes: row.admin_notes || '',
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
  if (includeScreenshot) {
    out.screenshot_base64 = row.screenshot_base64 || null;
  }
  return out;
}

export async function initContentBugTables() {
  const p = getPool();
  if (!p) return;
  await p.query(`
    CREATE TABLE IF NOT EXISTS content_bug_reports (
      id BIGSERIAL PRIMARY KEY,
      source TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      context TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('hard_to_read', 'incorrect', 'missing', 'other')),
      note TEXT NOT NULL DEFAULT '',
      screenshot_base64 TEXT,
      screenshot_mime TEXT,
      app_version TEXT,
      platform TEXT,
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
      admin_notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_content_bugs_status ON content_bug_reports(status);
    CREATE INDEX IF NOT EXISTS idx_content_bugs_created ON content_bug_reports(created_at DESC);
  `);
  console.log('[analytics-api] Content bug report tables initialized.');
}

export async function createContentBugReport({
  source,
  title,
  context,
  category,
  note,
  screenshotBase64,
  screenshotMime,
  appVersion,
  platform,
}) {
  const p = getPool();
  const cat = CATEGORIES.has(category) ? category : 'other';
  const shot =
    typeof screenshotBase64 === 'string' && screenshotBase64.length > 0
      ? screenshotBase64.slice(0, 1_500_000)
      : null;
  if (!p) {
    const now = new Date().toISOString();
    const row = {
      id: memoryBugs.length + 1,
      source: source || '',
      title: title || '',
      context: context || '',
      category: cat,
      note: note || '',
      screenshot_base64: shot,
      screenshot_mime: shot ? screenshotMime || 'image/jpeg' : null,
      app_version: appVersion || null,
      platform: platform || null,
      status: 'new',
      admin_notes: '',
      created_at: now,
      updated_at: now,
    };
    memoryBugs.unshift(row);
    return mapRow(row, { includeScreenshot: false });
  }
  const res = await p.query(
    `INSERT INTO content_bug_reports
      (source, title, context, category, note, screenshot_base64, screenshot_mime, app_version, platform)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, source, title, context, category, note, screenshot_mime, app_version, platform, status, admin_notes, created_at, updated_at,
       (screenshot_base64 IS NOT NULL AND length(screenshot_base64) > 0) AS has_shot`,
    [
      source || '',
      title || '',
      context || '',
      cat,
      note || '',
      shot,
      shot ? screenshotMime || 'image/jpeg' : null,
      appVersion || null,
      platform || null,
    ]
  );
  const row = res.rows[0];
  return {
    id: Number(row.id),
    source: row.source || '',
    title: row.title || '',
    context: row.context || '',
    category: row.category,
    note: row.note || '',
    screenshot_mime: row.screenshot_mime || null,
    has_screenshot: Boolean(row.has_shot),
    app_version: row.app_version || null,
    platform: row.platform || null,
    status: row.status,
    admin_notes: row.admin_notes || '',
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

export async function listContentBugReports({
  status,
  limit = 200,
  offset = 0,
  includeScreenshots = false,
} = {}) {
  const p = getPool();
  if (!p) {
    let list = [...memoryBugs];
    if (status && STATUSES.has(status)) list = list.filter((r) => r.status === status);
    return list
      .slice(offset, offset + limit)
      .map((r) => mapRow(r, { includeScreenshot: includeScreenshots }));
  }
  const params = [];
  let where = '';
  if (status && STATUSES.has(status)) {
    params.push(status);
    where = 'WHERE status = $1';
  }
  params.push(Math.min(Number(limit) || 200, 500), Number(offset) || 0);
  const limitIdx = params.length - 1;
  const shotCols = includeScreenshots
    ? 'screenshot_base64, screenshot_mime'
    : 'screenshot_mime, (screenshot_base64 IS NOT NULL AND length(screenshot_base64) > 0) AS has_shot_flag';
  const res = await p.query(
    `SELECT id, source, title, context, category, note, ${shotCols}, app_version, platform, status, admin_notes, created_at, updated_at
     FROM content_bug_reports ${where}
     ORDER BY created_at DESC
     LIMIT $${limitIdx} OFFSET $${limitIdx + 1}`,
    params
  );
  return res.rows.map((row) => {
    if (includeScreenshots) return mapRow(row, { includeScreenshot: true });
    return {
      id: Number(row.id),
      source: row.source || '',
      title: row.title || '',
      context: row.context || '',
      category: row.category || 'other',
      note: row.note || '',
      screenshot_mime: row.screenshot_mime || null,
      has_screenshot: Boolean(row.has_shot_flag),
      app_version: row.app_version || null,
      platform: row.platform || null,
      status: row.status,
      admin_notes: row.admin_notes || '',
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    };
  });
}

export async function getContentBugReport(id) {
  const p = getPool();
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId < 1) throw new Error('Invalid id');
  if (!p) {
    const row = memoryBugs.find((r) => r.id === numericId);
    return mapRow(row, { includeScreenshot: true });
  }
  const res = await p.query(
    `SELECT id, source, title, context, category, note, screenshot_base64, screenshot_mime, app_version, platform, status, admin_notes, created_at, updated_at
     FROM content_bug_reports WHERE id = $1`,
    [numericId]
  );
  return mapRow(res.rows[0], { includeScreenshot: true });
}

export async function updateContentBugReport(id, { status, adminNotes } = {}) {
  const p = getPool();
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId < 1) throw new Error('Invalid id');
  if (status != null && !STATUSES.has(status)) throw new Error('Invalid status');

  if (!p) {
    const row = memoryBugs.find((r) => r.id === numericId);
    if (!row) return null;
    if (status) row.status = status;
    if (adminNotes != null) row.admin_notes = String(adminNotes);
    row.updated_at = new Date().toISOString();
    return mapRow(row, { includeScreenshot: false });
  }

  const sets = ['updated_at = NOW()'];
  const params = [];
  let i = 1;
  if (status) {
    sets.push(`status = $${i++}`);
    params.push(status);
  }
  if (adminNotes != null) {
    sets.push(`admin_notes = $${i++}`);
    params.push(String(adminNotes));
  }
  params.push(numericId);
  const res = await p.query(
    `UPDATE content_bug_reports SET ${sets.join(', ')} WHERE id = $${i}
     RETURNING id, source, title, context, category, note, screenshot_mime, app_version, platform, status, admin_notes, created_at, updated_at,
       (screenshot_base64 IS NOT NULL AND length(screenshot_base64) > 0) AS has_shot`,
    params
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    source: row.source || '',
    title: row.title || '',
    context: row.context || '',
    category: row.category,
    note: row.note || '',
    screenshot_mime: row.screenshot_mime || null,
    has_screenshot: Boolean(row.has_shot),
    app_version: row.app_version || null,
    platform: row.platform || null,
    status: row.status,
    admin_notes: row.admin_notes || '',
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

export async function getContentBugStats() {
  const p = getPool();
  if (!p) {
    return {
      total: memoryBugs.length,
      new: memoryBugs.filter((r) => r.status === 'new').length,
      in_progress: memoryBugs.filter((r) => r.status === 'in_progress').length,
      resolved: memoryBugs.filter((r) => r.status === 'resolved').length,
    };
  }
  const res = await p.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'new')::int AS new,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
      COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved
    FROM content_bug_reports
  `);
  const row = res.rows[0] || {};
  return {
    total: Number(row.total || 0),
    new: Number(row.new || 0),
    in_progress: Number(row.in_progress || 0),
    resolved: Number(row.resolved || 0),
  };
}
