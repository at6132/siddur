/**
 * Promote hard-case eruvs from newly found My Maps mids / embedded map-data.
 */
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
  return {
    n,
    diag: Math.sqrt(w * w + h * h),
    cx: (minLng + maxLng) / 2,
    cy: (minLat + maxLat) / 2,
    bbox: [minLng, minLat, maxLng, maxLat],
  };
}

function qualityOk(st, cat) {
  if (!st || st.diag < 1.0 || st.n < 12) return { ok: false, reason: 'tiny' };
  if (cat?.latitude != null) {
    const dist = haversineKm(
      { lat: cat.latitude, lng: cat.longitude },
      { lat: st.cy, lng: st.cx },
    );
    if (dist > 40) return { ok: false, reason: `far_${dist.toFixed(1)}km` };
  }
  return { ok: true };
}

function writeInbox(batch, eruvId, payload) {
  const dir = path.join(inboxRoot, batch);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${eruvId}.json`);
  fs.writeFileSync(out, JSON.stringify(payload, null, 2) + '\n');
  console.log('wrote', out, payload.status);
}

async function tryMid(eruvId, batch, mid, notesExtra = '') {
  const cat = byId[eruvId];
  console.log(`\n==== ${eruvId} mid=${mid} ====`);
  const { geometry, kml, kmlBytes, sourceUrl } = await fetchGoogleMyMapsGeometry(mid, {
    preferBorders: true,
  });
  const names = [...(kml?.matchAll(/<name>([^<]*)<\/name>/gi) || [])].map((m) => m[1]);
  console.log('kmlBytes', kmlBytes, 'sample names', names.slice(0, 15).join(' | '));
  const st = geomStats(geometry);
  if (!geometry || !st) {
    console.log('NO GEOM');
    return null;
  }
  const dist = cat
    ? haversineKm({ lat: cat.latitude, lng: cat.longitude }, { lat: st.cy, lng: st.cx })
    : null;
  const q = qualityOk(st, cat);
  console.log(
    `geom ${geometry.type} pts=${st.n} diag=${st.diag.toFixed(2)}km dist=${dist?.toFixed(2)} ${q.ok ? 'OK' : q.reason}`,
  );
  if (!q.ok) return { ok: false, st, reason: q.reason };
  writeInbox(batch, eruvId, {
    eruvId,
    status: 'ready',
    sourceType: 'google_my_maps',
    sourceUrl: sourceUrl || `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`,
    googleMyMapsMid: mid,
    notes: `HARD HUNT 2026-11-20: Promoted from My Maps mid=${mid}. pts=${st.n} diag=${st.diag.toFixed(1)}km. ${notesExtra}`.trim(),
    checkedAt: new Date().toISOString(),
    geometry,
  });
  return { ok: true, st };
}

async function scrapeEruvHomesMid(slug) {
  const url = `https://eruvhomes.com/eruv/${slug}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  const html = await res.text();
  const mids = [...html.matchAll(/mid=([A-Za-z0-9_-]{15,})/g)].map((m) => m[1]);
  const uniq = [...new Set(mids)];
  console.log(`eruvhomes ${slug}: status=${res.status} mids=${uniq.join(',') || '-'}`);
  return { url, uniq, html };
}

// Extract Cincinnati #map-data
function extractCincinnati() {
  const htmlPath = path.join(__dirname, 'cincinnati.html');
  if (!fs.existsSync(htmlPath)) return null;
  const html = fs.readFileSync(htmlPath, 'utf8');
  const m = html.match(/<script id="map-data"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) {
    console.log('cincinnati: no map-data');
    return null;
  }
  const data = JSON.parse(m[1]);
  fs.writeFileSync(path.join(__dirname, 'cincinnati-map-data.json'), JSON.stringify(data, null, 2));
  console.log('cincinnati map-data keys', Object.keys(data));
  console.log(JSON.stringify(data).slice(0, 500));
  return data;
}

// Extract Teaneck polygons from inline JS (points arrays)
function extractTeaneck() {
  const htmlPath = path.join(__dirname, 'teaneck.html');
  if (!fs.existsSync(htmlPath)) return null;
  const html = fs.readFileSync(htmlPath, 'utf8');
  // Look for external JS that loads coordinates
  const scripts = [...html.matchAll(/src=["']([^"']+\.js)["']/gi)].map((m) => m[1]);
  console.log('teaneck scripts', scripts);
  // Inline coord pairs like lat,lng sequences after lechi / points
  const coordPairs = [...html.matchAll(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/g)].map((m) => [
    Number(m[2]),
    Number(m[1]),
  ]);
  // Filter to NJ-ish
  const nj = coordPairs.filter(([lng, lat]) => lat > 40.8 && lat < 41.0 && lng > -74.1 && lng < -73.9);
  console.log('teaneck inline coord-ish', coordPairs.length, 'nj-ish', nj.length);
  return { scripts, nj };
}

const jobs = [
  ['us-ny-great-neck', 'ne', '1G5xK1KP8fw99aI6PudKpAb-JJhj-zOE', 'From eruvhomes.com Great Neck page'],
];

const eruvHomesSlugs = [
  ['us-nj-west-orange', 'ne', 'west-orange-eruv'],
  ['us-ny-kgh', 'ne', 'kew-gardens-hills-eruv'],
  ['us-ny-west-hempstead', 'ne', 'west-hempstead-franklin-square-eruv'],
  ['us-ny-willowbrook', 'ne', 'staten-island-willowbrook-eruv'],
  ['us-ny-hillcrest', 'ne', 'hillcrest-eruv'],
  ['us-ny-rockland', 'ne', 'rockland-eruv'],
  ['us-ny-white-plains', 'ne', 'white-plains-scarsdale-eruv'],
  ['us-ny-sephardic-brooklyn', 'ne', 'sephardic-brooklyn-community-erub'],
  ['us-fl-miami-beach', 'southmidwest', 'miami-beach---bal-harbour-eruv'],
  ['us-fl-surfside-33154', 'southmidwest', 'miami-beach---bal-harbour-eruv'],
  ['us-fl-boca', 'southmidwest', 'boca-raton-eruv'],
  ['us-oh-cincinnati', 'southmidwest', 'cincinnati-eruv'],
  ['us-mi-detroit', 'southmidwest', 'detroit-southfield-eruv'],
  ['us-mi-detroit', 'southmidwest', 'detroit-eruv'],
  ['us-oh-beachwood-east', 'southmidwest', 'beachwood-east-eruv'],
  ['us-il-buffalo-grove', 'southmidwest', 'buffalo-grove-eruv'],
  ['us-il-west-rogers-park', 'southmidwest', 'west-rogers-park-eruv'],
  ['us-il-chicago-south-side', 'southmidwest', 'chicago-south-side-eruv'],
  ['us-mn-st-louis-park', 'southmidwest', 'st-louis-park-eruv'],
  ['us-nc-durham', 'southmidwest', 'durham-eruv'],
  ['us-tx-houston', 'southmidwest', 'meyerland-eruv'],
  ['us-tx-houston', 'southmidwest', 'houston-eruv'],
  ['us-wi-milwaukee-east', 'southmidwest', 'milwaukee-east-side-eruv'],
  ['us-md-potomac', 'midatlantic', 'potomac-eruv'],
  ['us-dc-shepherd-park', 'midatlantic', 'shepherd-park-woodside-community-eruv'],
  ['us-ct-new-haven', 'midatlantic', 'new-haven-eruv'],
  ['us-pa-germantown', 'midatlantic', 'germantown-jewish-centre-eruv'],
  ['us-ca-la-jolla', 'west', 'la-jolla-eruv'],
];

extractCincinnati();
extractTeaneck();

for (const [id, batch, mid, note] of jobs) {
  await tryMid(id, batch, mid, note);
}

for (const [id, batch, slug] of eruvHomesSlugs) {
  try {
    const { uniq } = await scrapeEruvHomesMid(slug);
    for (const mid of uniq) {
      await tryMid(id, batch, mid, `From eruvhomes.com/eruv/${slug}`);
    }
  } catch (e) {
    console.log('ERR', slug, e.message);
  }
}
