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

function demote(batch, eruvId, notes, sourceUrl, mid, sourceType) {
  fs.writeFileSync(
    path.join(inboxRoot, batch, `${eruvId}.json`),
    JSON.stringify(
      {
        eruvId,
        status: 'pending_digitize',
        sourceType,
        sourceUrl,
        googleMyMapsMid: mid,
        notes,
        checkedAt: new Date().toISOString(),
        geometry: null,
      },
      null,
      2,
    ) + '\n',
  );
  console.log('demoted', eruvId);
}

const check = [
  'ne/us-ny-willowbrook.json',
  'ne/us-ny-white-plains.json',
  'ne/us-ny-sephardic-brooklyn.json',
  'ne/us-ny-hillcrest.json',
  'ne/us-ny-rockland.json',
  'midatlantic/us-md-potomac.json',
];

for (const rel of check) {
  const p = path.join(inboxRoot, rel);
  if (!fs.existsSync(p)) {
    console.log('missing', rel);
    continue;
  }
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const st = geomStats(j.geometry);
  const id = j.eruvId;
  const cat = byId[id];
  const dist =
    st && cat
      ? haversineKm({ lat: cat.latitude, lng: cat.longitude }, { lat: st.cy, lng: st.cx })
      : null;
  console.log(
    JSON.stringify({
      id,
      status: j.status,
      sourceType: j.sourceType,
      mid: j.googleMyMapsMid,
      notes: (j.notes || '').slice(0, 140),
      ...st,
      dist,
    }),
  );
  // Demote tiny willowbrook stub if ready
  if (id === 'us-ny-willowbrook' && j.status === 'ready' && st && st.diag < 1) {
    demote(
      'ne',
      id,
      'HARD HUNT: Eruv Homes mid yields tiny ~0.4km stub, not Willowbrook coverage. Keep pending_digitize.',
      j.sourceUrl,
      j.googleMyMapsMid,
      j.sourceType,
    );
  }
}

// Boca: inspect placemark names and promote East Boca only if reasonable
{
  const mid = '1u2KYZZZVl03cS8hsl5jclDl_pPWxIHSg';
  const { kml, kmlBytes } = await fetchGoogleMyMapsGeometry(mid, { preferBorders: false });
  console.log('\nBoca kml', kmlBytes);
  const pms = kml.match(/<Placemark[\s\S]*?<\/Placemark>/gi) || [];
  for (const pm of pms) {
    const name = (pm.match(/<name>([^<]*)<\/name>/i)?.[1] || '').trim();
    const geom = kmlToGeometry(`<kml>${pm}</kml>`, { preferBorders: true });
    const st = geomStats(geom);
    if (!st) {
      console.log(' ', name, 'no geom');
      continue;
    }
    console.log(
      ' ',
      JSON.stringify({ name, type: geom.type, pts: st.n, diag: +st.diag.toFixed(2), cy: +st.cy.toFixed(4) }),
    );
  }
  // Try nameIncludes east boca / community
  for (const hint of ['east boca', 'boca', 'community', 'brs', 'young israel']) {
    const g = kmlToGeometry(kml, { preferBorders: true, nameIncludes: hint });
    const st = geomStats(g);
    if (st)
      console.log(
        'hint',
        hint,
        st.diag.toFixed(2),
        st.n,
        'dist',
        haversineKm(
          { lat: byId['us-fl-boca'].latitude, lng: byId['us-fl-boca'].longitude },
          { lat: st.cy, lng: st.cx },
        ).toFixed(2),
      );
  }
}
