/**
 * Re-fetch every ready My Maps eruv with exclusion holes attached.
 * Run: node eruv/boundaries/_reprocessExclusions.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchGoogleMyMapsGeometry,
  kmlToGeometry,
  countHoles,
} from './kmlToGeojson.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inboxRoot = path.join(__dirname, 'inbox');
const now = new Date().toISOString();

/** Catalog ids that need a name filter on multi-eruv My Maps. */
const NAME_HINTS = {
  'us-ny-flatbush': 'flatbush eruv',
  'us-ny-sephardic-brooklyn': 'sepharadi',
  'us-fl-boca': 'east boca community',
};

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
  const row = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (row.status !== 'ready' || !row.geometry) continue;

  const mid = row.googleMyMapsMid;
  if (!mid) {
    report.push({
      id: row.eruvId,
      action: 'keep-no-mid',
      holes: countHoles(row.geometry),
      sourceType: row.sourceType,
    });
    continue;
  }

  try {
    const { kml, kmlBytes, sourceUrl } = await fetchGoogleMyMapsGeometry(mid, {
      preferBorders: true,
      includeExclusions: true,
    });
    const hint = NAME_HINTS[row.eruvId] || null;
    const geometry = kmlToGeometry(kml, {
      preferBorders: true,
      nameIncludes: hint,
      includeExclusions: true,
    });
    if (!geometry) {
      report.push({ id: row.eruvId, action: 'skip-null', batch });
      continue;
    }

    const before = countHoles(row.geometry);
    const after = countHoles(geometry);
    row.geometry = geometry;
    row.sourceUrl = sourceUrl || row.sourceUrl;
    row.checkedAt = now;
    row.notes = `EXCLUSIONS ${now}: mid reprocess holes=${after} (was ${before}) kmlBytes=${kmlBytes}${hint ? ` hint=${hint}` : ''}. | ${String(row.notes || '').slice(0, 180)}`;
    fs.writeFileSync(file, JSON.stringify(row, null, 2) + '\n');

    const action =
      after > before ? 'holes-added' : after > 0 ? 'holes-present' : 'no-holes';
    report.push({ id: row.eruvId, batch, action, holesBefore: before, holesAfter: after });
    console.log(`${row.eruvId}: holes ${before} → ${after} [${action}]`);
  } catch (e) {
    report.push({ id: row.eruvId, action: 'error', reason: e.message });
    console.log(`${row.eruvId}: ERR ${e.message}`);
  }
}

fs.writeFileSync(
  path.join(__dirname, '_exclusion_reprocess_report.json'),
  JSON.stringify(report, null, 2) + '\n',
);

const withHoles = report.filter((r) => (r.holesAfter ?? r.holes) > 0);
console.log('\nEruvs with holes after reprocess:', withHoles.length);
console.log(
  withHoles.map((r) => `${r.id}:${r.holesAfter ?? r.holes}`).join('\n'),
);
