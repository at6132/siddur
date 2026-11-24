/**
 * Merge inbox harvest JSON into geojson/ + manifest.json
 * Run: node eruv/boundaries/ingestInbox.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inboxRoot = path.join(__dirname, 'inbox');
const geojsonDir = path.join(__dirname, 'geojson');
const manifestPath = path.join(__dirname, 'manifest.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function walkInbox() {
  const out = [];
  if (!fs.existsSync(inboxRoot)) return out;
  for (const batch of fs.readdirSync(inboxRoot)) {
    const dir = path.join(inboxRoot, batch);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.json') || name.startsWith('_')) continue;
      out.push(path.join(dir, name));
    }
  }
  return out;
}

const manifest = fs.existsSync(manifestPath)
  ? readJson(manifestPath)
  : { updatedAt: null, entries: {} };

let ready = 0;
let pending = 0;
let other = 0;

for (const file of walkInbox()) {
  const row = readJson(file);
  if (!row?.eruvId) continue;
  manifest.entries[row.eruvId] = {
    status: row.status,
    sourceType: row.sourceType,
    sourceUrl: row.sourceUrl ?? null,
    googleMyMapsMid: row.googleMyMapsMid ?? null,
    notes: row.notes ?? '',
    checkedAt: row.checkedAt ?? null,
    hasGeometry: Boolean(row.geometry),
  };
  if (row.status === 'ready' && row.geometry) {
    const dest = path.join(geojsonDir, `${row.eruvId}.geojson`);
    fs.writeFileSync(
      dest,
      JSON.stringify(
        {
          type: 'Feature',
          properties: {
            eruvId: row.eruvId,
            sourceType: row.sourceType,
            sourceUrl: row.sourceUrl,
          },
          geometry: row.geometry,
        },
        null,
        2,
      ),
    );
    ready += 1;
  } else if (row.status === 'pending_digitize') {
    pending += 1;
  } else {
    other += 1;
  }
}

manifest.updatedAt = new Date().toISOString();
manifest.counts = {
  ready,
  pending_digitize: pending,
  other,
  entries: Object.keys(manifest.entries).length,
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('ingest complete', manifest.counts);
