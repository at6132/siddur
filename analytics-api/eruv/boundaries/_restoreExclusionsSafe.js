/**
 * Restore outer borders (pre-exclusion-reprocess quality strategies),
 * then attach only named exclusion polygons as holes — never rewrite outer
 * via a blind preferBorders re-fetch.
 *
 * Run: node eruv/boundaries/_restoreExclusionsSafe.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchGoogleMyMapsGeometry,
  kmlToGeometry,
  stitchLineStringsToRings,
  countHoles,
  attachExclusionHoles,
  pointInRing,
} from './kmlToGeojson.js';
import { US_ERUV_CATALOG_SEED } from '../catalogSeed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inboxRoot = path.join(__dirname, 'inbox');
const byId = Object.fromEntries(US_ERUV_CATALOG_SEED.map((e) => [e.id, e]));
const now = new Date().toISOString();

const NAME_HINTS = {
  'us-ny-flatbush': 'flatbush eruv',
  'us-ny-sephardic-brooklyn': 'sepharadi',
  'us-fl-boca': 'east boca community',
};

/** Eruvs that need LineString soft-stitch for the outer (not polygon prefer). */
const FORCE_LINE_STITCH = new Set([
  'us-nj-cherry-hill-west',
  'us-nj-passaic-clifton',
  'us-ny-far-rockaway',
  'us-ny-great-neck',
  'us-ny-willowbrook',
  'us-ny-white-plains',
]);

function haversineKm(a, b) {
  const R = 6371;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLng = toR(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function geomStats(geom) {
  if (!geom) return null;
  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity,
    n = 0;
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      minLng = Math.min(minLng, c[0]);
      maxLng = Math.max(maxLng, c[0]);
      minLat = Math.min(minLat, c[1]);
      maxLat = Math.max(maxLat, c[1]);
      n++;
    } else c.forEach(walk);
  };
  walk(geom.coordinates);
  const w = haversineKm({ lat: minLat, lng: minLng }, { lat: minLat, lng: maxLng });
  const h = haversineKm({ lat: minLat, lng: minLng }, { lat: maxLat, lng: minLng });
  return {
    n,
    diag: Math.sqrt(w * w + h * h),
    cx: (minLng + maxLng) / 2,
    cy: (minLat + maxLat) / 2,
  };
}

function parseCoordTuples(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number))
    .filter((c) => c.length >= 2 && Number.isFinite(c[0]))
    .map(([lng, lat]) => [lng, lat]);
}

function closeRing(ring) {
  if (ring.length < 3) return null;
  const f = ring[0];
  const l = ring[ring.length - 1];
  if (f[0] !== l[0] || f[1] !== l[1]) return [...ring, [f[0], f[1]]];
  return ring;
}

function extractAllLines(kml) {
  const lines = [];
  for (const lb of kml.match(/<LineString\b[\s\S]*?<\/LineString>/gi) || []) {
    const m = lb.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
    if (!m) continue;
    const c = parseCoordTuples(m[1]);
    if (c.length >= 2) lines.push(c);
  }
  return lines;
}

/** Soft-stitch all border-ish LineStrings; drop tiny scraps. */
function lineStitchOuter(kml, eps = 5e-4) {
  const lines = extractAllLines(kml);
  // Prefer lines from placemarks that aren't exclusions
  const EX = /exclu|karfef|karpaf|not in|outside|water|stream|pond|lake\b/i;
  const DENY = /shared\s*border/i;
  const borderLines = [];
  const pms = kml.match(/<Placemark\b[\s\S]*?<\/Placemark>/gi) || [];
  for (const pm of pms) {
    const name = (pm.match(/<name>([^<]*)<\/name>/i)?.[1] || '').trim();
    if (EX.test(name) && !DENY.test(name) && /exclu|karfef|karpaf|not in|outside/i.test(name)) {
      continue;
    }
    if (EX.test(name) && /water|stream|pond|lake/i.test(name) && !/border|eruv|line/i.test(name)) {
      continue;
    }
    for (const lb of pm.match(/<LineString\b[\s\S]*?<\/LineString>/gi) || []) {
      const m = lb.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
      if (!m) continue;
      const c = parseCoordTuples(m[1]);
      if (c.length >= 2) borderLines.push(c);
    }
  }
  const use = borderLines.length ? borderLines : lines;
  const rings = stitchLineStringsToRings(use, eps);
  if (!rings.length) return null;
  // Keep largest ring(s) — drop tiny scraps (< 5% of max bbox area proxy via point count)
  const scored = rings.map((r) => ({ r, n: r.length }));
  scored.sort((a, b) => b.n - a.n);
  const bestN = scored[0].n;
  const kept = scored.filter((s) => s.n >= Math.max(12, bestN * 0.25)).map((s) => s.r);
  if (kept.length === 1) return { type: 'Polygon', coordinates: [kept[0]] };
  return { type: 'MultiPolygon', coordinates: kept.map((r) => [r]) };
}

/** Extract exclusion rings from KML (named carve-outs with Polygon geometry). */
function extractExclusionRings(kml) {
  const rings = [];
  const pms = kml.match(/<Placemark\b[\s\S]*?<\/Placemark>/gi) || [];
  for (const pm of pms) {
    const name = (pm.match(/<name>([^<]*)<\/name>/i)?.[1] || '').trim();
    if (!name) continue;
    if (/shared\s*border/i.test(name)) continue;
    const isExcl =
      /\b(exclu|karfef|karpaf|not in|outside)\b/i.test(name) ||
      (/water|stream|pond|lake\b/i.test(name) && /exclu|not|outside/i.test(name));
    if (!isExcl) continue;
    const polyBlocks = pm.match(/<Polygon\b[\s\S]*?<\/Polygon>/gi) || [];
    for (const pb of polyBlocks) {
      const m = pb.match(
        /<outerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i,
      );
      if (!m) continue;
      const ring = closeRing(parseCoordTuples(m[1]));
      if (ring && ring.length >= 4) rings.push(ring);
    }
  }
  return rings;
}

function qualityOk(st, cat) {
  if (!st || st.diag < 1.0 || st.n < 12) return false;
  if (cat?.latitude != null) {
    const dist = haversineKm(
      { lat: cat.latitude, lng: cat.longitude },
      { lat: st.cy, lng: st.cx },
    );
    if (dist > 40) return false;
  }
  return true;
}

function walkInbox() {
  const out = [];
  for (const batch of fs.readdirSync(inboxRoot)) {
    const dir = path.join(inboxRoot, batch);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.json') || name.startsWith('_')) continue;
      out.push({ batch, file: path.join(dir, name) });
    }
  }
  return out;
}

const report = [];

for (const { batch, file } of walkInbox()) {
  const row = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (row.status !== 'ready' || !row.geometry) continue;
  const mid = row.googleMyMapsMid;
  if (!mid) {
    report.push({ id: row.eruvId, action: 'skip-no-mid', holes: countHoles(row.geometry) });
    continue;
  }

  const cat = byId[row.eruvId];
  const before = geomStats(row.geometry);
  const holesBefore = countHoles(row.geometry);

  try {
    const { kml, kmlBytes, sourceUrl } = await fetchGoogleMyMapsGeometry(mid, {
      preferBorders: true,
      includeExclusions: false,
    });

    let outer = null;
    let strategy = 'preferBorders';

    if (FORCE_LINE_STITCH.has(row.eruvId)) {
      outer = lineStitchOuter(kml);
      strategy = 'line-stitch';
    }

    const hint = NAME_HINTS[row.eruvId] || null;
    if (!outer) {
      outer = kmlToGeometry(kml, {
        preferBorders: true,
        nameIncludes: hint,
        includeExclusions: false,
      });
      strategy = hint ? `preferBorders+hint:${hint}` : 'preferBorders';
    }

    // If line-stitch failed quality, fall back to preferBorders
    let st = geomStats(outer);
    if ((!qualityOk(st, cat) || !outer) && FORCE_LINE_STITCH.has(row.eruvId)) {
      outer = kmlToGeometry(kml, {
        preferBorders: true,
        nameIncludes: hint,
        includeExclusions: false,
      });
      st = geomStats(outer);
      strategy = 'preferBorders-fallback';
    }

    if (!outer || !qualityOk(st, cat)) {
      // Keep previous geometry if new extract is worse
      report.push({
        id: row.eruvId,
        action: 'keep-previous-bad-extract',
        strategy,
        beforeDiag: before?.diag,
        afterDiag: st?.diag,
        holesBefore,
      });
      continue;
    }

    const exclRings = extractExclusionRings(kml);
    let finalGeom = outer;
    if (exclRings.length) {
      finalGeom = attachExclusionHoles(outer, exclRings);
    }
    const after = geomStats(finalGeom);
    const holesAfter = countHoles(finalGeom);

    // Guard: if diag shrank a lot vs before without being a known line-stitch restore, keep previous
    if (
      before &&
      after &&
      before.diag > 2 &&
      after.diag < before.diag * 0.45 &&
      !FORCE_LINE_STITCH.has(row.eruvId)
    ) {
      report.push({
        id: row.eruvId,
        action: 'keep-previous-diag-shrink',
        beforeDiag: +before.diag.toFixed(2),
        afterDiag: +after.diag.toFixed(2),
        strategy,
      });
      continue;
    }

    row.geometry = finalGeom;
    row.sourceUrl = sourceUrl || row.sourceUrl;
    row.checkedAt = now;
    row.notes = `RESTORE ${now}: outer=${strategy} holes=${holesAfter} (was ${holesBefore}) diag=${after.diag.toFixed(1)}km kmlBytes=${kmlBytes}. | ${String(row.notes || '').slice(0, 140)}`;
    fs.writeFileSync(file, JSON.stringify(row, null, 2) + '\n');

    report.push({
      id: row.eruvId,
      batch,
      action: 'restored',
      strategy,
      holesBefore,
      holesAfter,
      beforeDiag: before ? +before.diag.toFixed(2) : null,
      afterDiag: +after.diag.toFixed(2),
      exclCandidates: exclRings.length,
    });
    console.log(
      `${row.eruvId}: ${strategy} diag ${before?.diag.toFixed(1)}→${after.diag.toFixed(1)} holes ${holesBefore}→${holesAfter}`,
    );
  } catch (e) {
    report.push({ id: row.eruvId, action: 'error', reason: e.message });
    console.log(`${row.eruvId}: ERR ${e.message}`);
  }
}

fs.writeFileSync(
  path.join(__dirname, '_restore_exclusions_report.json'),
  JSON.stringify(report, null, 2) + '\n',
);
const withHoles = report.filter((r) => (r.holesAfter || 0) > 0);
console.log('\nRestored', report.filter((r) => r.action === 'restored').length);
console.log('With holes:', withHoles.map((r) => `${r.id}:${r.holesAfter}`).join(', ') || '(none)');
