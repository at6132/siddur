/**
 * Eruv catalog + status persistence (Postgres or in-memory).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../db.js';
import { US_ERUV_CATALOG_SEED, ERUV_DISCLAIMER } from './catalogSeed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEOJSON_DIR = path.join(__dirname, 'boundaries', 'geojson');

let memory = {
  eruvs: [],
  statusCurrent: new Map(),
  statusHistory: [],
  boundaries: new Map(), // eruvId -> { geometry, sourceUrl, sourceType }
};

export function getEruvDisclaimer() {
  return ERUV_DISCLAIMER;
}

export async function initEruvTables() {
  const p = getPool();
  if (!p) {
    await seedEruvCatalog();
    await loadBoundariesFromDisk();
    console.log('[analytics-api] Eruv tables: in-memory');
    return;
  }

  await p.query(`
    CREATE TABLE IF NOT EXISTS eruvs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT 'US',
      area_label TEXT NOT NULL DEFAULT '',
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      status_source_url TEXT,
      status_hotline TEXT,
      map_url TEXT,
      provider TEXT NOT NULL DEFAULT 'none'
        CHECK (provider IN ('eruvstat_us', 'official_site', 'hotline', 'none')),
      provider_key TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_eruvs_country_state ON eruvs(country, state);
    CREATE INDEX IF NOT EXISTS idx_eruvs_provider ON eruvs(provider) WHERE active = TRUE;

    CREATE TABLE IF NOT EXISTS eruv_status_current (
      eruv_id TEXT PRIMARY KEY REFERENCES eruvs(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'unknown'
        CHECK (status IN ('up', 'down', 'awaiting', 'unknown')),
      status_text TEXT,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      source_updated_at TEXT,
      fetch_ok BOOLEAN NOT NULL DEFAULT FALSE,
      error TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS eruv_status_history (
      id BIGSERIAL PRIMARY KEY,
      eruv_id TEXT NOT NULL REFERENCES eruvs(id) ON DELETE CASCADE,
      status TEXT NOT NULL
        CHECK (status IN ('up', 'down', 'awaiting', 'unknown')),
      status_text TEXT,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      source_updated_at TEXT,
      fetch_ok BOOLEAN NOT NULL DEFAULT FALSE,
      error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_eruv_history_eruv_time
      ON eruv_status_history(eruv_id, checked_at DESC);

    CREATE TABLE IF NOT EXISTS eruv_boundaries (
      eruv_id TEXT PRIMARY KEY REFERENCES eruvs(id) ON DELETE CASCADE,
      geometry JSONB NOT NULL,
      source_type TEXT,
      source_url TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await seedEruvCatalog();
  await loadBoundariesFromDisk();
  console.log('[analytics-api] Eruv tables initialized.');
}

/** Load Feature GeoJSON files from boundaries/geojson into memory + Postgres. */
export async function loadBoundariesFromDisk() {
  memory.boundaries = new Map();
  if (!fs.existsSync(GEOJSON_DIR)) return { loaded: 0 };
  const files = fs.readdirSync(GEOJSON_DIR).filter((f) => f.endsWith('.geojson'));
  let loaded = 0;
  const p = getPool();
  const loadedIds = [];
  for (const file of files) {
    try {
      const feature = JSON.parse(fs.readFileSync(path.join(GEOJSON_DIR, file), 'utf8'));
      const eruvId = feature?.properties?.eruvId || file.replace(/\.geojson$/, '');
      const geometry = feature?.geometry;
      if (!geometry) continue;
      const row = {
        geometry,
        sourceType: feature?.properties?.sourceType || null,
        sourceUrl: feature?.properties?.sourceUrl || null,
      };
      memory.boundaries.set(eruvId, row);
      loadedIds.push(eruvId);
      if (p) {
        await p.query(
          `
          INSERT INTO eruv_boundaries (eruv_id, geometry, source_type, source_url, updated_at)
          VALUES ($1, $2::jsonb, $3, $4, NOW())
          ON CONFLICT (eruv_id) DO UPDATE SET
            geometry = EXCLUDED.geometry,
            source_type = EXCLUDED.source_type,
            source_url = EXCLUDED.source_url,
            updated_at = NOW()
          `,
          [eruvId, JSON.stringify(geometry), row.sourceType, row.sourceUrl],
        );
      }
      loaded += 1;
    } catch (e) {
      console.warn('[eruv] bad geojson', file, e?.message || e);
    }
  }
  // Drop DB rows that are no longer on disk (upsert alone leaves orphans).
  if (p) {
    if (loadedIds.length === 0) {
      await p.query(`DELETE FROM eruv_boundaries`);
    } else {
      await p.query(`DELETE FROM eruv_boundaries WHERE NOT (eruv_id = ANY($1::text[]))`, [
        loadedIds,
      ]);
    }
  }
  console.log(`[analytics-api] Loaded ${loaded} eruv boundaries from disk`);
  return { loaded };
}

export async function listEruvBoundaries() {
  const p = getPool();
  if (!p) {
    return Array.from(memory.boundaries.entries()).map(([eruvId, row]) => ({
      eruvId,
      geometry: row.geometry,
      sourceType: row.sourceType,
      sourceUrl: row.sourceUrl,
    }));
  }
  // Prefer DB; fall back to memory if empty
  const { rows } = await p.query(
    `SELECT eruv_id, geometry, source_type, source_url FROM eruv_boundaries`,
  );
  if (rows.length === 0 && memory.boundaries.size > 0) {
    return Array.from(memory.boundaries.entries()).map(([eruvId, row]) => ({
      eruvId,
      geometry: row.geometry,
      sourceType: row.sourceType,
      sourceUrl: row.sourceUrl,
    }));
  }
  return rows.map((r) => ({
    eruvId: r.eruv_id,
    geometry: r.geometry,
    sourceType: r.source_type,
    sourceUrl: r.source_url,
  }));
}

export async function getEruvBoundary(eruvId) {
  const all = await listEruvBoundaries();
  return all.find((b) => b.eruvId === eruvId) || null;
}

export async function seedEruvCatalog() {
  const p = getPool();
  if (!p) {
    memory.eruvs = US_ERUV_CATALOG_SEED.map((e) => ({ ...e }));
    for (const e of memory.eruvs) {
      if (!memory.statusCurrent.has(e.id)) {
        memory.statusCurrent.set(e.id, {
          eruv_id: e.id,
          status: e.provider === 'eruvstat_us' ? 'awaiting' : 'unknown',
          status_text: null,
          checked_at: null,
          source_updated_at: null,
          fetch_ok: false,
          error: null,
        });
      }
    }
    return { upserted: memory.eruvs.length };
  }

  let upserted = 0;
  for (const e of US_ERUV_CATALOG_SEED) {
    await p.query(
      `
      INSERT INTO eruvs (
        id, name, city, state, country, area_label, lat, lng,
        status_source_url, status_hotline, map_url, provider, provider_key, active, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        country = EXCLUDED.country,
        area_label = EXCLUDED.area_label,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        status_source_url = EXCLUDED.status_source_url,
        status_hotline = EXCLUDED.status_hotline,
        map_url = EXCLUDED.map_url,
        provider = EXCLUDED.provider,
        provider_key = EXCLUDED.provider_key,
        active = EXCLUDED.active,
        updated_at = NOW()
      `,
      [
        e.id,
        e.name,
        e.city,
        e.state,
        e.country,
        e.areaLabel,
        e.latitude,
        e.longitude,
        e.statusSourceUrl,
        e.statusHotline,
        e.mapUrl,
        e.provider,
        e.providerKey,
        e.active !== false,
      ],
    );
    upserted += 1;
  }
  return { upserted };
}

function rowToListing(row) {
  const status = row.status || (row.provider === 'eruvstat_us' ? 'awaiting' : 'unknown');
  const statusLive = Boolean(row.fetch_ok);
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    state: row.state,
    country: row.country || 'US',
    areaLabel: row.area_label || row.areaLabel || '',
    status,
    statusUpdatedAt: row.source_updated_at || null,
    statusSourceUrl: row.status_source_url || row.statusSourceUrl || null,
    statusHotline: row.status_hotline || row.statusHotline || null,
    mapUrl: row.map_url || row.mapUrl || null,
    latitude: row.lat ?? row.latitude ?? null,
    longitude: row.lng ?? row.longitude ?? null,
    statusLive,
    checkedAt: row.checked_at || null,
  };
}

export async function listEruvs({ country = 'US' } = {}) {
  const p = getPool();
  if (!p) {
    const list = memory.eruvs
      .filter((e) => e.active !== false && (!country || e.country === country))
      .map((e) => {
        const st = memory.statusCurrent.get(e.id) || {};
        return rowToListing({
          id: e.id,
          name: e.name,
          city: e.city,
          state: e.state,
          country: e.country,
          area_label: e.areaLabel,
          lat: e.latitude,
          lng: e.longitude,
          status_source_url: e.statusSourceUrl,
          status_hotline: e.statusHotline,
          map_url: e.mapUrl,
          provider: e.provider,
          status: st.status,
          source_updated_at: st.source_updated_at,
          fetch_ok: st.fetch_ok,
          checked_at: st.checked_at,
        });
      })
      .sort((a, b) => {
        if (a.state !== b.state) return a.state.localeCompare(b.state);
        if (a.city !== b.city) return a.city.localeCompare(b.city);
        return a.name.localeCompare(b.name);
      });
    return list;
  }

  const { rows } = await p.query(
    `
    SELECT e.*,
           s.status, s.status_text, s.checked_at, s.source_updated_at, s.fetch_ok, s.error
    FROM eruvs e
    LEFT JOIN eruv_status_current s ON s.eruv_id = e.id
    WHERE e.active = TRUE
      AND ($1::text IS NULL OR e.country = $1)
    ORDER BY e.state ASC, e.city ASC, e.name ASC
    `,
    [country || null],
  );
  return rows.map(rowToListing);
}

export async function getEruvById(id) {
  const p = getPool();
  if (!p) {
    const e = memory.eruvs.find((x) => x.id === id && x.active !== false);
    if (!e) return null;
    const st = memory.statusCurrent.get(e.id) || {};
    return rowToListing({
      id: e.id,
      name: e.name,
      city: e.city,
      state: e.state,
      country: e.country,
      area_label: e.areaLabel,
      lat: e.latitude,
      lng: e.longitude,
      status_source_url: e.statusSourceUrl,
      status_hotline: e.statusHotline,
      map_url: e.mapUrl,
      provider: e.provider,
      status: st.status,
      source_updated_at: st.source_updated_at,
      fetch_ok: st.fetch_ok,
      checked_at: st.checked_at,
    });
  }

  const { rows } = await p.query(
    `
    SELECT e.*,
           s.status, s.status_text, s.checked_at, s.source_updated_at, s.fetch_ok, s.error
    FROM eruvs e
    LEFT JOIN eruv_status_current s ON s.eruv_id = e.id
    WHERE e.id = $1 AND e.active = TRUE
    `,
    [id],
  );
  if (!rows[0]) return null;
  return rowToListing(rows[0]);
}

export async function listEruvsForProvider(provider) {
  const p = getPool();
  if (!p) {
    return memory.eruvs.filter((e) => e.active !== false && e.provider === provider);
  }
  const { rows } = await p.query(
    `
    SELECT id, name, provider, provider_key
    FROM eruvs
    WHERE active = TRUE AND provider = $1 AND provider_key IS NOT NULL
    ORDER BY id
    `,
    [provider],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    provider: r.provider,
    providerKey: r.provider_key,
  }));
}

export async function upsertEruvStatus({
  eruvId,
  status,
  statusText = null,
  sourceUpdatedAt = null,
  fetchOk = false,
  error = null,
}) {
  const checkedAt = new Date().toISOString();
  const p = getPool();
  if (!p) {
    const prev = memory.statusCurrent.get(eruvId);
    const next = {
      eruv_id: eruvId,
      status,
      status_text: statusText,
      checked_at: checkedAt,
      source_updated_at: sourceUpdatedAt,
      fetch_ok: fetchOk,
      error,
    };
    memory.statusCurrent.set(eruvId, next);
    if (!prev || prev.status !== status || prev.source_updated_at !== sourceUpdatedAt) {
      memory.statusHistory.push({ ...next });
    } else {
      memory.statusHistory.push({ ...next });
    }
    return next;
  }

  await p.query(
    `
    INSERT INTO eruv_status_current (
      eruv_id, status, status_text, checked_at, source_updated_at, fetch_ok, error, updated_at
    ) VALUES ($1,$2,$3,NOW(),$4,$5,$6,NOW())
    ON CONFLICT (eruv_id) DO UPDATE SET
      status = EXCLUDED.status,
      status_text = EXCLUDED.status_text,
      checked_at = EXCLUDED.checked_at,
      source_updated_at = EXCLUDED.source_updated_at,
      fetch_ok = EXCLUDED.fetch_ok,
      error = EXCLUDED.error,
      updated_at = NOW()
    `,
    [eruvId, status, statusText, sourceUpdatedAt, fetchOk, error],
  );

  await p.query(
    `
    INSERT INTO eruv_status_history (
      eruv_id, status, status_text, checked_at, source_updated_at, fetch_ok, error
    ) VALUES ($1,$2,$3,NOW(),$4,$5,$6)
    `,
    [eruvId, status, statusText, sourceUpdatedAt, fetchOk, error],
  );

  return {
    eruv_id: eruvId,
    status,
    status_text: statusText,
    checked_at: checkedAt,
    source_updated_at: sourceUpdatedAt,
    fetch_ok: fetchOk,
    error,
  };
}
