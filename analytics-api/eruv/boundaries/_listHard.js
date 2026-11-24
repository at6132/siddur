import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { US_ERUV_CATALOG_SEED } from '../catalogSeed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const byId = Object.fromEntries(US_ERUV_CATALOG_SEED.map((e) => [e.id, e]));
const rows = [];

for (const batch of ['ne', 'midatlantic', 'southmidwest', 'west']) {
  const dir = path.join(__dirname, 'inbox', batch);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json') && !x.startsWith('_'))) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (j.status === 'ready' && j.geometry) continue;
    const cat = byId[j.eruvId];
    rows.push({
      id: j.eruvId,
      batch,
      status: j.status,
      name: cat?.name || '?',
      city: cat?.city || '?',
      state: cat?.state || '?',
      mid: j.googleMyMapsMid || null,
      sourceUrl: j.sourceUrl || cat?.mapUrl || cat?.statusSourceUrl || null,
      sourceType: j.sourceType || null,
      notes: j.notes || '',
      kind: j.googleMyMapsMid
        ? 'has_mid'
        : /\.pdf|pdf/i.test(j.sourceUrl || '') || j.sourceType === 'pdf'
          ? 'pdf'
          : j.sourceType === 'image' || /\.png|\.jpg|image/i.test(j.sourceUrl || '')
            ? 'image'
            : j.status === 'skipped_contested'
              ? 'contested'
              : j.status === 'not_found'
                ? 'not_found'
                : 'hunt',
    });
  }
}

rows.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
fs.writeFileSync(path.join(__dirname, '_hard_queue.json'), JSON.stringify(rows, null, 2));

const byKind = {};
for (const r of rows) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
console.log({ total: rows.length, byKind });
for (const r of rows) {
  console.log(`${r.kind.padEnd(12)} ${r.id.padEnd(28)} ${r.status.padEnd(18)} mid=${r.mid ? 'Y' : 'n'} ${(r.sourceUrl || '').slice(0, 60)}`);
}
