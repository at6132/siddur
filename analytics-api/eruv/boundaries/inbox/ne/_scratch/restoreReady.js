import { fetchGoogleMyMapsGeometry } from '../../../kmlToGeojson.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..');
const checkedAt = new Date().toISOString();

const mids = {
  'us-nj-passaic-clifton': {
    mid: '1i1k6AOCv68pODbvRirBdwd-egTEq5GlY',
    notes:
      'Passaic Clifton Eruv Google My Maps embed on eruvstat.us/pceruv (official also publishes PDF at pceruv.com/s/2026-map.pdf)',
  },
  'us-ny-great-neck': {
    mid: '1Yp-cRqlZDN8zA_ynPToE3Dm2PLI',
    notes: 'Great Neck Eiruv My Maps linked from Young Israel of Great Neck eiruv page',
  },
  'us-ny-flatbush': {
    mid: '1VLdHiyP0wgl5KO5i_HEiKe2IDvA',
    notes:
      'Brooklyn Eruv Maps My Maps via eruv.org Flatbush listing goo.gl/zo64N3 / Avenue N Jewish Center boundaries',
  },
  'us-ny-manhattan': {
    mid: '1AJc3ptGTXtSJvLlCmLfmFMCT0To',
    notes:
      'Manhattan Eruv Map My Maps (Mechon LHoyroa / YU Stern guidance). Cross-check eruv.nyc PDF for latest contested edge cases',
  },
};

const summary = {};
for (const [eruvId, meta] of Object.entries(mids)) {
  const r = await fetchGoogleMyMapsGeometry(meta.mid);
  if (!r.geometry) {
    summary[eruvId] = { ok: false, kmlBytes: r.kmlBytes };
    continue;
  }
  const record = {
    eruvId,
    status: 'ready',
    sourceType: 'google_my_maps',
    sourceUrl: `https://www.google.com/maps/d/viewer?mid=${meta.mid}`,
    googleMyMapsMid: meta.mid,
    notes: meta.notes,
    checkedAt,
    geometry: r.geometry,
  };
  fs.writeFileSync(path.join(outDir, `${eruvId}.json`), JSON.stringify(record, null, 2));
  summary[eruvId] = { ok: true, geomType: r.geometry.type, kmlBytes: r.kmlBytes };
}

// Rebuild summary
const files = fs
  .readdirSync(outDir)
  .filter((f) => f.endsWith('.json') && f !== '_summary.json' && !f.startsWith('_'));
const counts = {
  batch: 'ne',
  ready: 0,
  pending_digitize: 0,
  not_found: 0,
  skipped_contested: 0,
  eruvIdsReady: [],
};
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'));
  if (j.status === 'ready') {
    counts.ready += 1;
    counts.eruvIdsReady.push(j.eruvId);
  } else if (j.status === 'pending_digitize') counts.pending_digitize += 1;
  else if (j.status === 'not_found') counts.not_found += 1;
  else if (j.status === 'skipped_contested') counts.skipped_contested += 1;
}
counts.eruvIdsReady.sort();
fs.writeFileSync(path.join(outDir, '_summary.json'), JSON.stringify(counts, null, 2));
console.log(JSON.stringify({ restore: summary, counts }, null, 2));
