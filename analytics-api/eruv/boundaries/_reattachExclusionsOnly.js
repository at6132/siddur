/**
 * Keep existing outers; re-fetch My Maps KML and attach named exclusion holes only.
 * Never replaces the outer border.
 *
 * Run: node eruv/boundaries/_reattachExclusionsOnly.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchGoogleMyMapsGeometry,
  countHoles,
  attachExclusionHoles,
  stripHoles,
  normalizePolygonWinding,
  isExclusionName,
} from './kmlToGeojson.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inboxRoot = path.join(__dirname, 'inbox');
const geojsonDir = path.join(__dirname, 'geojson');
const now = new Date().toISOString();

function closeRing(ring) {
  if (ring.length < 3) return null;
  const f = ring[0];
  const l = ring[ring.length - 1];
  if (f[0] !== l[0] || f[1] !== l[1]) return [...ring, [f[0], f[1]]];
  return ring;
}

function parseCoordTuples(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number))
    .filter((c) => c.length >= 2 && Number.isFinite(c[0]))
    .map(([lng, lat]) => [lng, lat]);
}

/** Named carve-out rings (Polygon outers + closed LineStrings). */
function extractExclusionRings(kml) {
  const rings = [];
  const pms = String(kml).match(/<Placemark\b[\s\S]*?<\/Placemark>/gi) || [];
  for (const pm of pms) {
    const name = (pm.match(/<name>([^<]*)<\/name>/i)?.[1] || '').trim();
    if (!isExclusionName(name)) continue;

    for (const pb of pm.match(/<Polygon\b[\s\S]*?<\/Polygon>/gi) || []) {
      const m = pb.match(
        /<outerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i,
      );
      if (!m) continue;
      const ring = closeRing(parseCoordTuples(m[1]));
      if (ring && ring.length >= 4) rings.push(ring);
    }

    for (const lb of pm.match(/<LineString\b[\s\S]*?<\/LineString>/gi) || []) {
      const m = lb.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
      if (!m) continue;
      const coords = parseCoordTuples(m[1]);
      if (coords.length < 3) continue;
      const f = coords[0];
      const l = coords[coords.length - 1];
      const closed =
        Math.abs(f[0] - l[0]) < 1e-4 && Math.abs(f[1] - l[1]) < 1e-4
          ? closeRing(coords)
          : null;
      if (closed && closed.length >= 4) rings.push(closed);
    }
  }
  return rings;
}

function loadGeojsonOuterWithHoles(eruvId) {
  const p = path.join(geojsonDir, `${eruvId}.geojson`);
  if (!fs.existsSync(p)) return null;
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  return raw.geometry || raw.features?.[0]?.geometry || null;
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
  let row;
  try {
    row = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    continue;
  }
  if (row.status !== 'ready' || !row.geometry) continue;

  // Prefer disk geojson outer when inbox was accidentally hole-stripped
  const diskGeom = loadGeojsonOuterWithHoles(row.eruvId);
  const baseGeom =
    diskGeom && countHoles(diskGeom) >= countHoles(row.geometry)
      ? diskGeom
      : row.geometry;

  const mid = row.googleMyMapsMid;
  if (!mid) {
    const before = countHoles(baseGeom);
    row.geometry = normalizePolygonWinding(baseGeom);
    fs.writeFileSync(file, JSON.stringify(row, null, 2));
    report.push({ id: row.eruvId, action: 'normalize-only', holes: countHoles(row.geometry) });
    if (before > 0) console.log(`${row.eruvId}: normalize-only holes=${before}`);
    continue;
  }

  const holesBefore = countHoles(baseGeom);
  const outer = stripHoles(baseGeom);

  try {
    const { kml, kmlBytes } = await fetchGoogleMyMapsGeometry(mid, {
      preferBorders: true,
      includeExclusions: false,
    });
    const exclRings = extractExclusionRings(kml);
    let finalGeom = attachExclusionHoles(outer, exclRings);
    // Never drop existing holes if re-extract found fewer (name/PIP flakiness)
    if (countHoles(finalGeom) < holesBefore && holesBefore > 0) {
      finalGeom = normalizePolygonWinding(baseGeom);
    }
    const holesAfter = countHoles(finalGeom);

    row.geometry = finalGeom;
    row.updatedAt = now;
    row.notes = `REATTACH_HOLES ${now}: holes ${holesBefore}→${holesAfter} exclRings=${exclRings.length} kmlBytes=${kmlBytes}. | ${String(row.notes || '').slice(0, 160)}`;
    fs.writeFileSync(file, JSON.stringify(row, null, 2));
    report.push({
      id: row.eruvId,
      batch,
      action: holesAfter > 0 ? 'holes' : 'no-holes',
      holesBefore,
      holesAfter,
      exclRings: exclRings.length,
    });
    console.log(
      `${row.eruvId}: holes ${holesBefore}→${holesAfter} (exclRings=${exclRings.length})`,
    );
  } catch (e) {
    report.push({
      id: row.eruvId,
      action: 'error',
      error: e?.message || String(e),
      holesBefore,
    });
    console.warn(`${row.eruvId}: ERROR`, e?.message || e);
  }
}

fs.writeFileSync(
  path.join(__dirname, '_reattach_exclusions_report.json'),
  JSON.stringify(report, null, 2),
);
const withHoles = report.filter((r) => (r.holesAfter || r.holes || 0) > 0);
console.log('\nWith holes:', withHoles.length);
console.log(withHoles.map((r) => `${r.id}:${r.holesAfter ?? r.holes}`).join(', '));
