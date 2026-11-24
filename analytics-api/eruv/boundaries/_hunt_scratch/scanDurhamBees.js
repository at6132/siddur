import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

for (const f of ['durham.html', 'bees.html', 'slp.html']) {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) {
    console.log('missing', f);
    continue;
  }
  const html = fs.readFileSync(p, 'utf8');
  console.log('\n====', f, html.length);
  const mids = [...html.matchAll(/mid[=:]["']?([A-Za-z0-9_-]{15,})/g)].map((m) => m[1]);
  console.log('mids', [...new Set(mids)]);
  const coords = [...html.matchAll(/(-?\d{2}\.\d{4,}),\s*(-?\d{2,3}\.\d{4,})/g)].slice(0, 20);
  console.log(
    'coord samples',
    coords.map((m) => m[0]),
  );
  const imgs = [...html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:png|jpg|jpeg|gif|webp|pdf)/gi)].map(
    (m) => m[0],
  );
  console.log(
    'media',
    [...new Set(imgs)].filter((u) => /eruv|map|boundary/i.test(u)).slice(0, 15),
  );
  // wix image ids that look like maps
  const wix = [...html.matchAll(/static\.wixstatic\.com\/media\/[A-Za-z0-9_~.-]+/g)].map((m) => m[0]);
  console.log('wix media', [...new Set(wix)].slice(0, 10));
  if (html.includes('map-data')) console.log('HAS map-data');
  if (/leaflet|L\.map|geojson/i.test(html)) console.log('HAS leaflet-ish');
}

// Update hard queue from inbox
const inboxRoot = path.join(__dirname, '..', 'inbox');
const batches = ['ne', 'midatlantic', 'southmidwest', 'west'];
const hard = [];
for (const b of batches) {
  const dir = path.join(inboxRoot, b);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json') && !x.startsWith('_'))) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (j.status === 'ready') continue;
    hard.push({
      id: j.eruvId,
      batch: b,
      status: j.status,
      sourceUrl: j.sourceUrl || null,
      sourceType: j.sourceType || null,
      mid: j.googleMyMapsMid || null,
      notes: j.notes || null,
      kind:
        j.status === 'skipped_contested'
          ? 'contested'
          : j.status === 'not_found'
            ? 'not_found'
            : j.sourceType === 'pdf'
              ? 'pdf'
              : j.sourceType === 'image'
                ? 'image'
                : j.googleMyMapsMid
                  ? 'has_mid'
                  : 'hunt',
    });
  }
}
fs.writeFileSync(
  path.join(__dirname, '..', '_hard_queue.json'),
  JSON.stringify(hard, null, 2) + '\n',
);
console.log('\nhard remaining', hard.length);
console.log(hard.map((h) => `${h.id}\t${h.status}\t${h.kind}`).join('\n'));
