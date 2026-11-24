/** Promote Teaneck from official eruvData.xml lechi rings. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { US_ERUV_CATALOG_SEED } from '../../catalogSeed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inboxRoot = path.join(__dirname, '..', 'inbox');
const byId = Object.fromEntries(US_ERUV_CATALOG_SEED.map((e) => [e.id, e]));

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
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let n = 0;
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      minLng = Math.min(minLng, c[0]);
      maxLng = Math.max(maxLng, c[0]);
      minLat = Math.min(minLat, c[1]);
      maxLat = Math.max(maxLat, c[1]);
      n += 1;
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

const xml = fs.readFileSync(path.join(__dirname, 'eruvData.xml'), 'utf8');
const eruvBlocks = [...xml.matchAll(/<eruv\b([^>]*)>([\s\S]*?)<\/eruv>/gi)];
const polys = [];

for (const m of eruvBlocks) {
  const attrs = m[1];
  const body = m[2];
  const desc = (attrs.match(/description=["']([^"']*)["']/i)?.[1] || '').trim();
  const color = (attrs.match(/color=["']([^"']*)["']/i)?.[1] || '').trim();
  const pts = [...body.matchAll(/<lechi\b([^>]*)\/?>/gi)]
    .map((pm) => {
      const a = pm[1];
      const lat = Number(a.match(/latitude=["'](-?\d+\.?\d*)["']/i)?.[1]);
      const lng = Number(a.match(/longitude=["'](-?\d+\.?\d*)["']/i)?.[1]);
      return [lng, lat];
    })
    .filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]));
  console.log(`eruv desc=${desc} color=${color} lechis=${pts.length}`);
  if (pts.length < 3) continue;
  const ring = [...pts];
  const f = ring[0];
  const l = ring[ring.length - 1];
  if (f[0] !== l[0] || f[1] !== l[1]) ring.push([f[0], f[1]]);
  polys.push({ desc, color, ring });
}

if (!polys.length) {
  console.error('no polygons');
  process.exit(1);
}

const geometry =
  polys.length === 1
    ? { type: 'Polygon', coordinates: [polys[0].ring] }
    : { type: 'MultiPolygon', coordinates: polys.map((p) => [p.ring]) };

const st = geomStats(geometry);
const cat = byId['us-nj-teaneck'];
const dist = haversineKm(
  { lat: cat.latitude, lng: cat.longitude },
  { lat: st.cy, lng: st.cx },
);
console.log('geom', geometry.type, st, 'dist', dist.toFixed(2));

if (st.diag < 1 || st.n < 12 || dist > 40) {
  console.error('quality fail');
  process.exit(1);
}

const payload = {
  eruvId: 'us-nj-teaneck',
  status: 'ready',
  sourceType: 'web_map',
  sourceUrl: 'https://www.tberuv.org/eruvData.xml',
  googleMyMapsMid: null,
  notes: `HARD HUNT 2026-11-20: Official tberuv.org Map.html downloads eruvData.xml; North+South eruv lechi rings → MultiPolygon (${polys.map((p) => p.desc).join('+')}). pts=${st.n} diag=${st.diag.toFixed(1)}km.`,
  checkedAt: new Date().toISOString(),
  geometry,
};

fs.writeFileSync(
  path.join(inboxRoot, 'ne', 'us-nj-teaneck.json'),
  JSON.stringify(payload, null, 2) + '\n',
);
console.log('wrote us-nj-teaneck ready');
