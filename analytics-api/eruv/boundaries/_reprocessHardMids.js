/**
 * Re-fetch every pending/not_found inbox row that has a My Maps mid,
 * using improved LineString stitching + border-name filtering.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { US_ERUV_CATALOG_SEED } from '../catalogSeed.js';
import { fetchGoogleMyMapsGeometry } from './kmlToGeojson.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
  const diag = Math.sqrt(w * w + h * h);
  const cx = (minLng + maxLng) / 2;
  const cy = (minLat + maxLat) / 2;
  return { n, diag, cx, cy };
}

/** Named-layer hints for multi-eruv maps */
const NAME_HINTS = {
  'us-ny-flatbush': 'flatbush',
  'us-tx-houston': null, // multi-neighborhood — leave demoted unless we find city layer
  'us-fl-miami-beach': 'miami beach',
  'us-fl-surfside-33154': 'bal harbour',
  'us-tx-plano': 'plano',
  'us-il-lincolnwood': 'lincolnwood',
  'us-il-skokie': 'skokie',
  'us-la-new-orleans': 'new orleans',
  'us-ga-atlanta': 'atlanta',
  'us-wi-milwaukee-east': null, // proposed — skip promoting
  'us-mi-detroit': null, // southfield only — skip
};

const SKIP_PROMOTE = new Set([
  'us-wi-milwaukee-east',
  'us-mi-detroit',
  'us-or-portland', // overview only per official site
  'us-nj-lakewood',
]);

const results = [];

for (const batch of ['ne', 'midatlantic', 'southmidwest', 'west']) {
  const dir = path.join(__dirname, 'inbox', batch);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json') && !x.startsWith('_'))) {
    const p = path.join(dir, f);
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (j.status === 'ready' && j.geometry) continue;
    if (!j.googleMyMapsMid) continue;

    const id = j.eruvId;
    const cat = byId[id];
    process.stdout.write(`\n>> ${id} mid=${j.googleMyMapsMid.slice(0, 20)}… `);

    try {
      const hint = NAME_HINTS[id];
      const opts = hint ? { nameIncludes: hint, preferBorders: true } : { preferBorders: true };
      const { geometry, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(
        j.googleMyMapsMid,
        opts,
      );

      if (!geometry) {
        console.log('NO_GEOM');
        results.push({ id, outcome: 'no_geom', kmlBytes });
        continue;
      }

      const st = geomStats(geometry);
      const dist =
        cat && cat.latitude != null
          ? haversineKm({ lat: cat.latitude, lng: cat.longitude }, { lat: st.cy, lng: st.cx })
          : null;

      const tooSmall = st.diag < 0.8 || st.n < 12;
      const tooFar = dist != null && dist > 40;
      const skip = SKIP_PROMOTE.has(id);

      console.log(
        `${geometry.type} pts=${st.n} diag=${st.diag.toFixed(1)}km dist=${dist?.toFixed(1) ?? '-'} ${tooSmall ? 'TINY' : ''} ${tooFar ? 'FAR' : ''} ${skip ? 'SKIP' : ''}`,
      );

      if (skip || tooSmall || tooFar) {
        results.push({
          id,
          outcome: skip ? 'skipped_policy' : tooSmall ? 'still_tiny' : 'too_far',
          diag: st.diag,
          n: st.n,
          dist,
        });
        // keep pending but refresh notes
        j.notes = `${j.notes || ''} | REPROCESS ${new Date().toISOString()}: ${geometry.type} pts=${st.n} diag=${st.diag.toFixed(1)}km outcome=${skip ? 'skip' : tooSmall ? 'tiny' : 'far'}`.trim();
        j.checkedAt = new Date().toISOString();
        fs.writeFileSync(p, JSON.stringify(j, null, 2));
        continue;
      }

      const row = {
        eruvId: id,
        status: 'ready',
        sourceType: 'google_my_maps',
        sourceUrl,
        googleMyMapsMid: j.googleMyMapsMid,
        notes: `REPROCESS stitch/border-filter ${new Date().toISOString()}: ${geometry.type} pts=${st.n} diag=${st.diag.toFixed(1)}km kmlBytes=${kmlBytes}${hint ? ` nameHint=${hint}` : ''}`,
        checkedAt: new Date().toISOString(),
        geometry,
      };
      fs.writeFileSync(p, JSON.stringify(row, null, 2));
      results.push({ id, outcome: 'promoted', diag: st.diag, n: st.n, dist });
      console.log('PROMOTED');
    } catch (e) {
      console.log('ERR', e.message);
      results.push({ id, outcome: 'error', error: e.message });
    }
  }
}

fs.writeFileSync(path.join(__dirname, '_reprocess_results.json'), JSON.stringify(results, null, 2));
console.log('\n=== SUMMARY ===');
console.log({
  promoted: results.filter((r) => r.outcome === 'promoted').length,
  still_tiny: results.filter((r) => r.outcome === 'still_tiny').length,
  skipped_policy: results.filter((r) => r.outcome === 'skipped_policy').length,
  no_geom: results.filter((r) => r.outcome === 'no_geom').length,
  error: results.filter((r) => r.outcome === 'error').length,
});
console.log(
  'promoted ids:',
  results.filter((r) => r.outcome === 'promoted').map((r) => r.id),
);
