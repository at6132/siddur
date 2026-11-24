import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchGoogleMyMapsGeometry, pointInRing } from '../kmlToGeojson.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function load(id) {
  for (const batch of ['ne', 'southmidwest', 'midatlantic', 'west']) {
    const p = path.join(__dirname, '..', 'inbox', batch, `${id}.json`);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  return null;
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
  const f = ring[0],
    l = ring[ring.length - 1];
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

for (const id of ['us-nj-passaic-clifton', 'us-ny-willowbrook', 'us-oh-columbus']) {
  const row = load(id);
  const { kml, geometry } = await fetchGoogleMyMapsGeometry(row.googleMyMapsMid, {
    preferBorders: true,
    includeExclusions: true,
  });
  const outers =
    geometry.type === 'Polygon'
      ? [geometry.coordinates[0]]
      : geometry.coordinates.map((p) => p[0]);
  console.log(`\n==== ${id} type=${geometry.type} outers=${outers.length} ====`);
  const pms = kml.match(/<Placemark[\s\S]*?<\/Placemark>/gi) || [];
  for (const pm of pms) {
    const name = (pm.match(/<name>([^<]*)<\/name>/i)?.[1] || '').trim();
    if (!/<Polygon\b/i.test(pm)) continue;
    if (/border|line|eruv|section|upgrade|playground|play ground|polygon \d+/i.test(name) || !name) {
      const m = pm.match(/<outerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i);
      if (!m) continue;
      const ring = closeRing(parseCoordTuples(m[1]));
      if (!ring) continue;
      const c = centroid(ring);
      const inside = outers.some((o) => pointInRing(c, o));
      const desc = (pm.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || '')
        .replace(/<[^>]+>/g, ' ')
        .trim()
        .slice(0, 80);
      if (inside || /play|exclu|polygon|upgrade|unnamed|^$/i.test(name)) {
        console.log(JSON.stringify({ name: name || '(unnamed)', pts: ring.length, inside, desc }));
      }
    }
  }
  // Folder names
  const folders = [...kml.matchAll(/<Folder>[\s\S]*?<name>([^<]*)<\/name>/gi)].map((m) => m[1]);
  console.log('folders:', folders.join(' | '));
}
