/** Teaneck North+South only (skip crossover stubs). Re-promote WO/KGH if demoted. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchGoogleMyMapsGeometry } from '../kmlToGeojson.js';
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

function write(batch, eruvId, payload) {
  fs.writeFileSync(
    path.join(inboxRoot, batch, `${eruvId}.json`),
    JSON.stringify(payload, null, 2) + '\n',
  );
  console.log('wrote', eruvId, payload.status);
}

// Teaneck North+South
{
  const xml = fs.readFileSync(path.join(__dirname, 'eruvData.xml'), 'utf8');
  const eruvBlocks = [...xml.matchAll(/<eruv\b([^>]*)>([\s\S]*?)<\/eruv>/gi)];
  const polys = [];
  for (const m of eruvBlocks) {
    const desc = (m[1].match(/description=["']([^"']*)["']/i)?.[1] || '').trim();
    if (!/^(North|South)$/i.test(desc)) continue;
    const pts = [...m[2].matchAll(/<lechi\b([^>]*)\/?>/gi)]
      .map((pm) => {
        const a = pm[1];
        return [
          Number(a.match(/longitude=["'](-?\d+\.?\d*)["']/i)?.[1]),
          Number(a.match(/latitude=["'](-?\d+\.?\d*)["']/i)?.[1]),
        ];
      })
      .filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]));
    const ring = [...pts];
    const f = ring[0],
      l = ring[ring.length - 1];
    if (f[0] !== l[0] || f[1] !== l[1]) ring.push([f[0], f[1]]);
    console.log(desc, 'pts', ring.length);
    polys.push(ring);
  }
  const geometry = { type: 'MultiPolygon', coordinates: polys.map((r) => [r]) };
  const st = geomStats(geometry);
  const cat = byId['us-nj-teaneck'];
  const dist = haversineKm(
    { lat: cat.latitude, lng: cat.longitude },
    { lat: st.cy, lng: st.cx },
  );
  console.log('teaneck NS', st, dist.toFixed(2));
  write('ne', 'us-nj-teaneck', {
    eruvId: 'us-nj-teaneck',
    status: 'ready',
    sourceType: 'web_map',
    sourceUrl: 'https://www.tberuv.org/eruvData.xml',
    googleMyMapsMid: null,
    notes: `HARD HUNT 2026-11-20: Official eruvData.xml North+South lechi rings only (crossovers excluded). pts=${st.n} diag=${st.diag.toFixed(1)}km.`,
    checkedAt: new Date().toISOString(),
    geometry,
  });
}

async function promoteMid(eruvId, batch, mid, note) {
  const cat = byId[eruvId];
  const { geometry, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(mid, {
    preferBorders: true,
  });
  const st = geomStats(geometry);
  const dist = haversineKm(
    { lat: cat.latitude, lng: cat.longitude },
    { lat: st.cy, lng: st.cx },
  );
  console.log(eruvId, st, dist.toFixed(2), 'kml', kmlBytes);
  if (st.diag < 1 || st.n < 12 || dist > 40) {
    console.log('SKIP quality', eruvId);
    return;
  }
  write(batch, eruvId, {
    eruvId,
    status: 'ready',
    sourceType: 'google_my_maps',
    sourceUrl: sourceUrl || `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`,
    googleMyMapsMid: mid,
    notes: `HARD HUNT 2026-11-20: ${note}. pts=${st.n} diag=${st.diag.toFixed(1)}km.`,
    checkedAt: new Date().toISOString(),
    geometry,
  });
}

await promoteMid(
  'us-nj-west-orange',
  'ne',
  '1Wh8Ac_wB2LRT933JCWImUiX7cdy1uBWb',
  'Eruv Homes mid West Orange/Livingston',
);
await promoteMid(
  'us-ny-kgh',
  'ne',
  '1biE2l51qVq-PW3ov7cTT55SVIYg',
  'Eruv Homes mid Kew Gardens Hills',
);
await promoteMid(
  'us-ny-great-neck',
  'ne',
  '1G5xK1KP8fw99aI6PudKpAb-JJhj-zOE',
  'Eruv Homes mid Great Neck',
);
await promoteMid(
  'us-ny-west-hempstead',
  'ne',
  '1HiUdjPCu1itXXN6T81KmI0iOtdM',
  'Eruv Homes mid West Hempstead',
);
