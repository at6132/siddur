import { fetchGoogleMyMapsGeometry, kmlToGeometry, countHoles, attachExclusionHoles, pointInRing } from '../kmlToGeojson.js';

const EX =
  /exclu|karfef|karpaf|\bhole\b|gap|not in|outside|water|stream|pond|lake\b/i;

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
  let sx = 0, sy = 0;
  const n = ring.length - 1;
  for (let i = 0; i < n; i++) {
    sx += ring[i][0];
    sy += ring[i][1];
  }
  return [sx / n, sy / n];
}

const cases = [
  ['us-nj-highland-park', '1Lc9bhHT4Z2wImel5vsh7qTjynQpupw4X'], // wrong? need real mid
  ['us-nj-cherry-hill-west', null],
];

// Load mids from inbox
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const inbox = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'inbox');

const targets = [
  'us-nj-highland-park',
  'us-nj-new-brunswick',
  'us-ny-five-towns',
  'us-il-chicago-lakeview',
  'us-il-skokie',
  'us-wi-bayside',
  'us-ma-malden',
  'us-ny-far-rockaway',
  'us-nj-cherry-hill-west',
];

for (const id of targets) {
  let mid = null;
  for (const batch of fs.readdirSync(inbox)) {
    const p = path.join(inbox, batch, `${id}.json`);
    if (fs.existsSync(p)) {
      mid = JSON.parse(fs.readFileSync(p, 'utf8')).googleMyMapsMid;
      break;
    }
  }
  console.log(`\n==== ${id} mid=${mid} ====`);
  if (!mid) continue;
  const { kml, geometry } = await fetchGoogleMyMapsGeometry(mid, {
    preferBorders: true,
    includeExclusions: true,
  });
  console.log('result holes', countHoles(geometry), geometry?.type);

  const pms = kml.match(/<Placemark[\s\S]*?<\/Placemark>/gi) || [];
  for (const pm of pms) {
    const name = (pm.match(/<name>([^<]*)<\/name>/i)?.[1] || '').trim();
    if (!EX.test(name)) continue;
    const hasPoly = /<Polygon\b/i.test(pm);
    const hasLine = /<LineString\b/i.test(pm);
    const hasPoint = /<Point\b/i.test(pm);
    let ring = null;
    if (hasPoly) {
      const m = pm.match(/<outerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i);
      if (m) ring = closeRing(parseCoordTuples(m[1]));
    } else if (hasLine) {
      const m = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
      if (m) {
        const coords = parseCoordTuples(m[1]);
        ring = closeRing(coords);
      }
    }
    let inside = null;
    if (ring && geometry) {
      const c = centroid(ring);
      const outers =
        geometry.type === 'Polygon'
          ? [geometry.coordinates[0]]
          : geometry.coordinates.map((p) => p[0]);
      inside = outers.some((o) => pointInRing(c, o));
    }
    console.log(
      JSON.stringify({
        name,
        hasPoly,
        hasLine,
        hasPoint,
        ringPts: ring?.length || 0,
        inside,
      }),
    );
  }
}
