/**
 * Deep audit: shared MIDs, ring quality, official page probes for ready borders.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { US_ERUV_CATALOG_SEED } from '../catalogSeed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const byId = Object.fromEntries(US_ERUV_CATALOG_SEED.map((e) => [e.id, e]));

function ringStats(geom) {
  const rings = [];
  if (geom.type === 'Polygon') rings.push(geom.coordinates[0]);
  else if (geom.type === 'MultiPolygon') {
    for (const p of geom.coordinates) if (p[0]) rings.push(p[0]);
  }
  const verts = rings.reduce((n, r) => n + r.length, 0);
  const polys = rings.length;
  // unique vertices (approx)
  const uniq = new Set();
  for (const r of rings) {
    for (const c of r) uniq.add(`${c[0].toFixed(5)},${c[1].toFixed(5)}`);
  }
  return { polys, verts, uniq: uniq.size };
}

const ready = [];
for (const batch of ['ne', 'midatlantic', 'southmidwest', 'west']) {
  const dir = path.join(__dirname, 'inbox', batch);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json') && !x.startsWith('_'))) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (j.status !== 'ready' || !j.geometry) continue;
    ready.push({ ...j, batch, stats: ringStats(j.geometry) });
  }
}

// Shared MIDs
const byMid = new Map();
for (const r of ready) {
  if (!r.googleMyMapsMid) continue;
  if (!byMid.has(r.googleMyMapsMid)) byMid.set(r.googleMyMapsMid, []);
  byMid.get(r.googleMyMapsMid).push(r.eruvId);
}

console.log('=== SHARED MIDs (same map assigned to multiple eruv IDs) ===');
let sharedCount = 0;
for (const [mid, ids] of byMid) {
  if (ids.length > 1) {
    sharedCount += 1;
    console.log(`MID ${mid}`);
    console.log(`  -> ${ids.join(', ')}`);
  }
}
if (!sharedCount) console.log('(none)');

console.log('\n=== LOW VERTEX / TINY RINGS ===');
for (const r of ready) {
  if (r.stats.uniq < 8 || r.stats.verts < 10) {
    const cat = byId[r.eruvId];
    console.log(
      `${r.eruvId} verts=${r.stats.verts} uniq=${r.stats.uniq} polys=${r.stats.polys} ${cat?.city} notes=${(r.notes || '').slice(0, 100)}`,
    );
  }
}

console.log('\n=== ODD MID FORMAT ===');
for (const r of ready) {
  const mid = r.googleMyMapsMid || '';
  if (mid && (mid.includes('.') || mid.length < 20 || mid.length > 60)) {
    console.log(`${r.eruvId} mid="${mid}"`);
  }
}

console.log('\n=== NOTES THAT ADMIT WRONG/PARTIAL COMMUNITY ===');
const warnRe =
  /southfield|proposed|wrong|partial|portion|not for|overview|generalized|may extend|fragment|line.?segment|restored|assigned id/i;
for (const r of ready) {
  if (warnRe.test(r.notes || '')) {
    console.log(`${r.eruvId}: ${r.notes}`);
  }
}

console.log('\n=== FULL TABLE ===');
for (const r of ready.sort((a, b) => a.eruvId.localeCompare(b.eruvId))) {
  const cat = byId[r.eruvId];
  console.log(
    `${r.eruvId}|${cat?.name}|${r.stats.uniq}pts|mid=${r.googleMyMapsMid || '-'}|${(r.notes || '').replace(/\|/g, '/').slice(0, 90)}`,
  );
}
