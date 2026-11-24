import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchGoogleMyMapsGeometry, kmlToGeometry } from '../kmlToGeojson.js';
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

const mid = '1u2KYZZZVl03cS8hsl5jclDl_pPWxIHSg';
const { kml, sourceUrl } = await fetchGoogleMyMapsGeometry(mid, { preferBorders: false });
const geom = kmlToGeometry(kml, { preferBorders: true, nameIncludes: 'east boca community' });
const st = geomStats(geom);
const cat = byId['us-fl-boca'];
const dist = haversineKm(
  { lat: cat.latitude, lng: cat.longitude },
  { lat: st.cy, lng: st.cx },
);
console.log(st, dist.toFixed(2));
if (st.diag < 1 || st.n < 12 || dist > 40) throw new Error('quality');

fs.writeFileSync(
  path.join(inboxRoot, 'southmidwest', 'us-fl-boca.json'),
  JSON.stringify(
    {
      eruvId: 'us-fl-boca',
      status: 'ready',
      sourceType: 'google_my_maps',
      sourceUrl: sourceUrl || `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`,
      googleMyMapsMid: mid,
      notes: `HARD HUNT 2026-11-20: Named "East Boca Community Eruv" placemark from Boca-area My Maps (not full multi-eruv layer). pts=${st.n} diag=${st.diag.toFixed(1)}km.`,
      checkedAt: new Date().toISOString(),
      geometry: geom,
    },
    null,
    2,
  ) + '\n',
);
console.log('wrote us-fl-boca ready');
