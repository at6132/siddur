/**
 * Audit every ready eruv border vs catalog centroid + source notes.
 * Run: node eruv/boundaries/_auditBorders.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { US_ERUV_CATALOG_SEED } from '../catalogSeed.js';
import { fetchGoogleMyMapsGeometry } from './kmlToGeojson.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const byId = Object.fromEntries(US_ERUV_CATALOG_SEED.map((e) => [e.id, e]));

function centroid(geom) {
  const rings = [];
  if (geom.type === 'Polygon') rings.push(geom.coordinates[0]);
  else if (geom.type === 'MultiPolygon') {
    for (const p of geom.coordinates) rings.push(p[0]);
  }
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const ring of rings) {
    for (const c of ring) {
      if (Array.isArray(c) && c.length >= 2) {
        sx += c[0];
        sy += c[1];
        n += 1;
      }
    }
  }
  if (!n) return null;
  return { lng: sx / n, lat: sy / n };
}

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

function bboxKm(geom) {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      minLng = Math.min(minLng, c[0]);
      maxLng = Math.max(maxLng, c[0]);
      minLat = Math.min(minLat, c[1]);
      maxLat = Math.max(maxLat, c[1]);
    } else {
      c.forEach(walk);
    }
  };
  walk(geom.coordinates);
  const w = haversineKm({ lat: minLat, lng: minLng }, { lat: minLat, lng: maxLng });
  const h = haversineKm({ lat: minLat, lng: minLng }, { lat: maxLat, lng: minLng });
  return { w, h, diag: Math.sqrt(w * w + h * h) };
}

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function catalogInside(geom, cat) {
  if (!cat || cat.latitude == null || cat.longitude == null) return null;
  const lng = cat.longitude;
  const lat = cat.latitude;
  const polys =
    geom.type === 'Polygon'
      ? [geom.coordinates]
      : geom.type === 'MultiPolygon'
        ? geom.coordinates
        : [];
  for (const poly of polys) {
    if (poly[0] && pointInRing(lng, lat, poly[0])) return true;
  }
  return false;
}

const rows = [];
for (const batch of ['ne', 'midatlantic', 'southmidwest', 'west']) {
  const dir = path.join(__dirname, 'inbox', batch);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json') && !x.startsWith('_'))) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (j.status !== 'ready' || !j.geometry) continue;
    const cat = byId[j.eruvId];
    const c = centroid(j.geometry);
    const bb = bboxKm(j.geometry);
    const dist =
      cat && c && cat.latitude != null
        ? haversineKm({ lat: cat.latitude, lng: cat.longitude }, c)
        : null;
    const inside = catalogInside(j.geometry, cat);
    let flag = 'ok';
    const reasons = [];
    if (dist != null && dist > 40) {
      flag = 'WRONG';
      reasons.push(`centroid ${dist.toFixed(1)}km from catalog`);
    } else if (dist != null && dist > 15) {
      flag = 'SUSPECT';
      reasons.push(`centroid ${dist.toFixed(1)}km from catalog`);
    }
    if (bb && bb.diag > 100) {
      flag = flag === 'ok' ? 'SUSPECT' : flag;
      reasons.push(`bbox diagonal ${bb.diag.toFixed(1)}km (huge)`);
    }
    if (bb && bb.diag < 0.4) {
      flag = flag === 'ok' ? 'SUSPECT' : flag;
      reasons.push(`bbox diagonal ${bb.diag.toFixed(1)}km (tiny)`);
    }
    if (inside === false && dist != null && dist > 5) {
      flag = flag === 'ok' ? 'SUSPECT' : flag;
      reasons.push('catalog point outside polygon');
    }
    if (!cat) {
      flag = 'WRONG';
      reasons.push('eruvId not in catalog');
    }
    rows.push({
      id: j.eruvId,
      batch,
      name: cat?.name || '?',
      city: cat?.city || '?',
      state: cat?.state || '?',
      mid: j.googleMyMapsMid || null,
      sourceUrl: j.sourceUrl || null,
      notes: j.notes || '',
      geomType: j.geometry.type,
      distKm: dist != null ? Math.round(dist * 10) / 10 : null,
      bboxKm: bb ? Math.round(bb.diag * 10) / 10 : null,
      inside,
      flag,
      reasons,
    });
  }
}

rows.sort((a, b) => {
  const rank = { WRONG: 0, SUSPECT: 1, ok: 2 };
  return rank[a.flag] - rank[b.flag] || (b.distKm || 0) - (a.distKm || 0);
});

const outPath = path.join(__dirname, '_audit_report.json');
fs.writeFileSync(outPath, JSON.stringify(rows, null, 2));

console.log('=== FLAG SUMMARY ===');
console.log({
  total: rows.length,
  WRONG: rows.filter((r) => r.flag === 'WRONG').length,
  SUSPECT: rows.filter((r) => r.flag === 'SUSPECT').length,
  ok: rows.filter((r) => r.flag === 'ok').length,
});
console.log('\n=== WRONG / SUSPECT ===');
for (const r of rows.filter((r) => r.flag !== 'ok')) {
  console.log(
    `${r.flag}\t${r.id}\t${r.city}, ${r.state}\tdist=${r.distKm}km\tbbox=${r.bboxKm}km\tinside=${r.inside}\t${r.reasons.join('; ')}`,
  );
  console.log(`     mid=${r.mid || '-'}  notes=${(r.notes || '').slice(0, 140)}`);
}

console.log('\n=== ALL (compact) ===');
for (const r of rows) {
  console.log(
    `${r.flag.padEnd(7)} ${r.id.padEnd(28)} ${String(r.distKm).padStart(6)}km  bbox=${String(r.bboxKm).padStart(6)}  ${r.city}, ${r.state}`,
  );
}

// Optional: re-fetch My Maps for wrong/suspect and compare mid still resolves
const checkLive = process.argv.includes('--live');
if (checkLive) {
  console.log('\n=== LIVE MID REFETCH (flagged only) ===');
  for (const r of rows.filter((x) => x.flag !== 'ok' && x.mid)) {
    try {
      const { geometry, kmlBytes } = await fetchGoogleMyMapsGeometry(r.mid);
      const c = geometry ? centroid(geometry) : null;
      const cat = byId[r.id];
      const dist =
        cat && c
          ? haversineKm({ lat: cat.latitude, lng: cat.longitude }, c)
          : null;
      console.log(
        `${r.id} mid ok bytes=${kmlBytes} liveDist=${dist != null ? dist.toFixed(1) : 'n/a'}km type=${geometry?.type}`,
      );
    } catch (e) {
      console.log(`${r.id} mid FAIL ${e.message}`);
    }
  }
}
