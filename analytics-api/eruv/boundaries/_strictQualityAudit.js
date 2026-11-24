/**
 * Strict quality audit of every READY border.
 * Flags Passaic-style failures: line-border KMLs reduced to tiny stubs / holes only.
 *
 * Run: node eruv/boundaries/_strictQualityAudit.js
 *      node eruv/boundaries/_strictQualityAudit.js --demote
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { US_ERUV_CATALOG_SEED } from '../catalogSeed.js';
import { fetchGoogleMyMapsGeometry, kmlToGeometry } from './kmlToGeojson.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const byId = Object.fromEntries(US_ERUV_CATALOG_SEED.map((e) => [e.id, e]));
const demote = process.argv.includes('--demote');

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

function walkCoords(geom, fn) {
  const walk = (c) => {
    if (typeof c[0] === 'number') fn(c[0], c[1]);
    else c.forEach(walk);
  };
  walk(geom.coordinates);
}

function geomStats(geom) {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let n = 0;
  const uniq = new Set();
  walkCoords(geom, (lng, lat) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    n += 1;
    uniq.add(`${lng.toFixed(5)},${lat.toFixed(5)}`);
  });
  const w = haversineKm({ lat: minLat, lng: minLng }, { lat: minLat, lng: maxLng });
  const h = haversineKm({ lat: minLat, lng: minLng }, { lat: maxLat, lng: minLng });
  const diag = Math.sqrt(w * w + h * h);
  let polys = 0;
  if (geom.type === 'Polygon') polys = 1;
  else if (geom.type === 'MultiPolygon') polys = geom.coordinates.length;
  return { n, uniq: uniq.size, w, h, diag, polys, minLng, maxLng, minLat, maxLat };
}

async function inspectKml(mid) {
  if (!mid) return null;
  try {
    const url = `https://www.google.com/maps/d/kml?mid=${encodeURIComponent(mid)}&forcekml=1`;
    const kml = await (await fetch(url, { headers: { 'User-Agent': 'SiddurAudit/1.0' } })).text();
    const lineCount = (kml.match(/<LineString\b/gi) || []).length;
    const polyCount = (kml.match(/<Polygon\b/gi) || []).length;
    const names = [...kml.matchAll(/<name>([^<]*)<\/name>/gi)].map((m) => m[1].trim()).slice(0, 30);
    const converted = kmlToGeometry(kml);
    const live = converted ? geomStats(converted) : null;
    return { kmlBytes: kml.length, lineCount, polyCount, names, live, lineHeavy: lineCount > polyCount * 2 && lineCount >= 5 };
  } catch (e) {
    return { error: e.message };
  }
}

function classify(row, stats, kmlInfo) {
  const reasons = [];
  let verdict = 'KEEP';

  // Tiny / stub
  if (stats.diag < 1.2 || stats.uniq < 12) {
    verdict = 'DEMOTE';
    reasons.push(`stub/tiny area (diag=${stats.diag.toFixed(2)}km, uniqPts=${stats.uniq})`);
  }

  // Many tiny multipolygons = likely exclusions only
  if (stats.polys >= 3 && stats.diag < 4 && stats.uniq < 80) {
    verdict = 'DEMOTE';
    reasons.push(`multi tiny polys (${stats.polys}) — likely exclusions not outer border`);
  }

  // Line-heavy KML but we only got small converted geometry
  if (kmlInfo?.lineHeavy && stats.diag < 8) {
    verdict = 'DEMOTE';
    reasons.push(
      `source KML is line-heavy (lines=${kmlInfo.lineCount}, polys=${kmlInfo.polyCount}) but stored area is only ${stats.diag.toFixed(1)}km`,
    );
  }

  // Line-heavy with large KML but converted verts << line complexity
  if (kmlInfo?.lineHeavy && kmlInfo.kmlBytes > 20000 && stats.uniq < 100) {
    verdict = 'DEMOTE';
    reasons.push(`line-border KML (${kmlInfo.kmlBytes}b) collapsed to ${stats.uniq} unique verts`);
  }

  // Notes already admit problems
  const notes = (row.notes || '').toLowerCase();
  if (/overview|approximate|proposed|not for|generalized|fragment|partial/.test(notes)) {
    verdict = 'DEMOTE';
    reasons.push('notes admit approximate/partial/overview');
  }

  // No mid and no clean kml source — higher scrutiny
  if (!row.googleMyMapsMid && !/\.kml|geojson|leaflet|#map-data/i.test(row.sourceUrl || row.notes || '')) {
    if (stats.diag < 3 || stats.uniq < 40) {
      verdict = 'DEMOTE';
      reasons.push('no My Maps mid + weak geometry; likely non-KML scrape');
    } else if (verdict === 'KEEP') {
      verdict = 'REVIEW';
      reasons.push('no easy My Maps KML — manual confirm needed');
    }
  }

  // Source type pdf/image shouldn't be ready
  if (['pdf', 'image'].includes(row.sourceType)) {
    verdict = 'DEMOTE';
    reasons.push(`sourceType=${row.sourceType}`);
  }

  return { verdict, reasons };
}

const results = [];
for (const batch of ['ne', 'midatlantic', 'southmidwest', 'west']) {
  const dir = path.join(__dirname, 'inbox', batch);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json') && !x.startsWith('_'))) {
    const row = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (row.status !== 'ready' || !row.geometry) continue;
    const stats = geomStats(row.geometry);
    const kmlInfo = await inspectKml(row.googleMyMapsMid);
    const { verdict, reasons } = classify(row, stats, kmlInfo);
    const cat = byId[row.eruvId];
    results.push({
      eruvId: row.eruvId,
      batch,
      name: cat?.name,
      city: cat?.city,
      state: cat?.state,
      mid: row.googleMyMapsMid || null,
      sourceType: row.sourceType,
      sourceUrl: row.sourceUrl,
      notes: row.notes,
      stats: {
        diagKm: Math.round(stats.diag * 10) / 10,
        uniq: stats.uniq,
        polys: stats.polys,
        verts: stats.n,
      },
      kml: kmlInfo
        ? {
            bytes: kmlInfo.kmlBytes,
            lines: kmlInfo.lineCount,
            polys: kmlInfo.polyCount,
            lineHeavy: kmlInfo.lineHeavy,
            error: kmlInfo.error,
            liveDiag: kmlInfo.live ? Math.round(kmlInfo.live.diag * 10) / 10 : null,
          }
        : null,
      verdict,
      reasons,
    });
  }
}

results.sort((a, b) => {
  const rank = { DEMOTE: 0, REVIEW: 1, KEEP: 2 };
  return rank[a.verdict] - rank[b.verdict] || a.eruvId.localeCompare(b.eruvId);
});

fs.writeFileSync(path.join(__dirname, '_strict_audit.json'), JSON.stringify(results, null, 2));

console.log('=== SUMMARY ===');
console.log({
  total: results.length,
  DEMOTE: results.filter((r) => r.verdict === 'DEMOTE').length,
  REVIEW: results.filter((r) => r.verdict === 'REVIEW').length,
  KEEP: results.filter((r) => r.verdict === 'KEEP').length,
});

console.log('\n=== DEMOTE ===');
for (const r of results.filter((x) => x.verdict === 'DEMOTE')) {
  console.log(
    `${r.eruvId}  diag=${r.stats.diagKm}km uniq=${r.stats.uniq} polys=${r.stats.polys}  kml lines=${r.kml?.lines ?? '-'} polys=${r.kml?.polys ?? '-'}`,
  );
  console.log(`  ${r.reasons.join('; ')}`);
}

console.log('\n=== REVIEW (no easy KML / needs eyes) ===');
for (const r of results.filter((x) => x.verdict === 'REVIEW')) {
  console.log(`${r.eruvId}  ${r.reasons.join('; ')}  src=${r.sourceUrl || r.sourceType}`);
}

console.log('\n=== KEEP ===');
for (const r of results.filter((x) => x.verdict === 'KEEP')) {
  console.log(
    `${r.eruvId.padEnd(28)} diag=${String(r.stats.diagKm).padStart(5)}  uniq=${String(r.stats.uniq).padStart(4)}  lines=${r.kml?.lines ?? '-'}`,
  );
}

if (demote) {
  let n = 0;
  for (const r of results.filter((x) => x.verdict === 'DEMOTE')) {
    const p = path.join(__dirname, 'inbox', r.batch, `${r.eruvId}.json`);
    const prev = JSON.parse(fs.readFileSync(p, 'utf8'));
    fs.writeFileSync(
      p,
      JSON.stringify(
        {
          eruvId: r.eruvId,
          status: 'pending_digitize',
          sourceType: prev.sourceType || 'google_my_maps',
          sourceUrl: prev.sourceUrl || null,
          googleMyMapsMid: prev.googleMyMapsMid || null,
          notes: `STRICT AUDIT: ${r.reasons.join(' | ')}`,
          checkedAt: new Date().toISOString(),
          geometry: null,
        },
        null,
        2,
      ),
    );
    const geo = path.join(__dirname, 'geojson', `${r.eruvId}.geojson`);
    if (fs.existsSync(geo)) fs.unlinkSync(geo);
    n += 1;
    console.log('demoted', r.eruvId);
  }
  console.log(`demoted ${n} borders`);
}
