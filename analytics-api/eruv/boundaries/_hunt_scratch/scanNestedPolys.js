/**
 * Find ready My Maps where smaller polygons sit inside the outer border
 * (unnamed or weakly named carve-outs the name filter missed).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchGoogleMyMapsGeometry,
  pointInRing,
  countHoles,
} from '../kmlToGeojson.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inboxRoot = path.join(__dirname, '..', 'inbox');

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
function centroid(ring) {
  let sx = 0,
    sy = 0;
  const n = ring.length - 1;
  for (let i = 0; i < n; i++) {
    sx += ring[i][0];
    sy += ring[i][1];
  }
  return [sx / n, sy / n];
}
function bboxArea(ring) {
  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return Math.max(0, maxLng - minLng) * Math.max(0, maxLat - minLat);
}

const hits = [];

for (const batch of fs.readdirSync(inboxRoot)) {
  const dir = path.join(inboxRoot, batch);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json') || name.startsWith('_')) continue;
    const row = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    if (row.status !== 'ready' || !row.googleMyMapsMid) continue;

    const { kml, geometry } = await fetchGoogleMyMapsGeometry(row.googleMyMapsMid, {
      preferBorders: true,
      includeExclusions: true,
    });
    if (!geometry) continue;

    const outers =
      geometry.type === 'Polygon'
        ? [geometry.coordinates[0]]
        : geometry.coordinates.map((p) => p[0]);
    const outerAreas = outers.map(bboxArea);
    const maxOuter = Math.max(...outerAreas);

    const pms = kml.match(/<Placemark[\s\S]*?<\/Placemark>/gi) || [];
    const nested = [];
    for (const pm of pms) {
      const pname = (pm.match(/<name>([^<]*)<\/name>/i)?.[1] || '').trim();
      const polyBlocks = pm.match(/<Polygon\b[\s\S]*?<\/Polygon>/gi) || [];
      for (const pb of polyBlocks) {
        const m = pb.match(
          /<outerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i,
        );
        if (!m) continue;
        const ring = closeRing(parseCoordTuples(m[1]));
        if (!ring || ring.length < 4) continue;
        const a = bboxArea(ring);
        if (a <= 0 || a >= maxOuter * 0.5) continue; // not a small carve-out
        const c = centroid(ring);
        const inside = outers.some((o) => pointInRing(c, o));
        if (!inside) continue;
        // Skip if this ring IS one of the outers
        const isOuter = outers.some(
          (o) => Math.abs(bboxArea(o) - a) / maxOuter < 0.02 && pointInRing(c, o),
        );
        if (isOuter && a > maxOuter * 0.4) continue;
        nested.push({ name: pname || '(unnamed)', pts: ring.length, areaRatio: +(a / maxOuter).toFixed(4) });
      }
    }

    const holes = countHoles(geometry);
    if (nested.length > holes) {
      hits.push({
        id: row.eruvId,
        holesAttached: holes,
        nestedCandidates: nested.length,
        samples: nested.slice(0, 10),
      });
      console.log(
        row.eruvId,
        `holes=${holes} nestedPolys=${nested.length}`,
        nested
          .slice(0, 6)
          .map((n) => `${n.name}(${n.areaRatio})`)
          .join(' | '),
      );
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'nested_hits.json'), JSON.stringify(hits, null, 2));
console.log('\nhits', hits.length);
