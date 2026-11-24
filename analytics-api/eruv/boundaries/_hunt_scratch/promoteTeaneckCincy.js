/**
 * Promote Teaneck from eruvData.xml + Cincinnati from #map-data.
 * Demote Miami combined if still wrongly ready.
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
    minLat,
    maxLat,
  };
}

function writeInbox(batch, eruvId, payload) {
  fs.writeFileSync(
    path.join(inboxRoot, batch, `${eruvId}.json`),
    JSON.stringify(payload, null, 2) + '\n',
  );
  console.log('wrote', eruvId, payload.status, payload.notes?.slice(0, 80));
}

function demote(batch, eruvId, notes, sourceUrl, mid, sourceType) {
  writeInbox(batch, eruvId, {
    eruvId,
    status: 'pending_digitize',
    sourceType,
    sourceUrl,
    googleMyMapsMid: mid,
    notes,
    checkedAt: new Date().toISOString(),
    geometry: null,
  });
}

// Fetch Teaneck XML
const xmlRes = await fetch('https://www.tberuv.org/eruvData.xml', {
  headers: { 'User-Agent': 'Mozilla/5.0 SiddurEruvHarvest/1.0' },
});
const xml = await xmlRes.text();
fs.writeFileSync(path.join(__dirname, 'eruvData.xml'), xml);
console.log('teaneck xml status', xmlRes.status, 'bytes', xml.length);
console.log(xml.slice(0, 500));

// Parse eruv polygons from XML: <eruv name="..."><point lat=".." lng=".."/>...
function parseTeaneckXml(xmlText) {
  const eruvBlocks = [...xmlText.matchAll(/<eruv\b([^>]*)>([\s\S]*?)<\/eruv>/gi)];
  const polys = [];
  for (const m of eruvBlocks) {
    const attrs = m[1];
    const body = m[2];
    const name = (attrs.match(/name=["']([^"']*)["']/i)?.[1] || '').trim();
    const pts = [...body.matchAll(/<point\b([^/>\/]*)\/?>/gi)].map((pm) => {
      const a = pm[1];
      const lat = Number(a.match(/lat=["']?(-?\d+\.?\d*)/i)?.[1]);
      const lng = Number(
        a.match(/lng=["']?(-?\d+\.?\d*)/i)?.[1] ||
          a.match(/lon=["']?(-?\d+\.?\d*)/i)?.[1],
      );
      return [lng, lat];
    }).filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]));
    console.log('eruv', name || '(unnamed)', 'pts', pts.length);
    if (pts.length >= 3) {
      const ring = [...pts];
      const f = ring[0];
      const l = ring[ring.length - 1];
      if (f[0] !== l[0] || f[1] !== l[1]) ring.push([f[0], f[1]]);
      polys.push({ name, ring });
    }
  }
  return polys;
}

const teaneckPolys = parseTeaneckXml(xml);
if (teaneckPolys.length) {
  const geometry =
    teaneckPolys.length === 1
      ? { type: 'Polygon', coordinates: [teaneckPolys[0].ring] }
      : {
          type: 'MultiPolygon',
          coordinates: teaneckPolys.map((p) => [p.ring]),
        };
  const st = geomStats(geometry);
  const cat = byId['us-nj-teaneck'];
  const dist = haversineKm(
    { lat: cat.latitude, lng: cat.longitude },
    { lat: st.cy, lng: st.cx },
  );
  console.log('teaneck geom', geometry.type, st, 'dist', dist.toFixed(2));
  if (st.diag >= 1 && st.n >= 12 && dist < 40) {
    writeInbox('ne', 'us-nj-teaneck', {
      eruvId: 'us-nj-teaneck',
      status: 'ready',
      sourceType: 'web_map',
      sourceUrl: 'https://www.tberuv.org/eruvData.xml',
      googleMyMapsMid: null,
      notes: `HARD HUNT 2026-11-20: Official tberuv.org Map.html loads eruvData.xml (North+South eruv polygons). Extracted ${teaneckPolys.length} rings pts=${st.n} diag=${st.diag.toFixed(1)}km.`,
      checkedAt: new Date().toISOString(),
      geometry,
    });
  }
} else {
  console.log('teaneck parse failed — try alternate point tags');
  // dump tags
  const tags = [...xml.matchAll(/<([A-Za-z0-9_:-]+)/g)].map((m) => m[1]);
  console.log('tags', [...new Set(tags)].join(', '));
}

// Cincinnati
{
  const html = fs.readFileSync(path.join(__dirname, 'cincinnati.html'), 'utf8');
  const m = html.match(/<script id="map-data"[^>]*>([\s\S]*?)<\/script>/i);
  const data = JSON.parse(m[1]);
  fs.writeFileSync(
    path.join(__dirname, 'cincinnati-map-data.json'),
    JSON.stringify(data, null, 2),
  );
  console.log('cincinnati exclusion sample', JSON.stringify(data.exclusion)?.slice(0, 300));

  const ring = data.boundary.map(([lng, lat]) => [lng, lat]);
  const f = ring[0];
  const l = ring[ring.length - 1];
  if (f[0] !== l[0] || f[1] !== l[1]) ring.push([f[0], f[1]]);

  let holes = [];
  if (Array.isArray(data.exclusion) && data.exclusion.length) {
    // Could be [[lng,lat],...] single hole OR [[[lng,lat],...], ...] multiple
    const first = data.exclusion[0];
    if (typeof first[0] === 'number') {
      // flat list of points = one hole
      const hole = data.exclusion.map(([lng, lat]) => [lng, lat]);
      const a = hole[0];
      const b = hole[hole.length - 1];
      if (a[0] !== b[0] || a[1] !== b[1]) hole.push([a[0], a[1]]);
      holes = [hole];
    } else if (Array.isArray(first[0])) {
      holes = data.exclusion.map((h) => {
        const hole = h.map(([lng, lat]) => [lng, lat]);
        const a = hole[0];
        const b = hole[hole.length - 1];
        if (a[0] !== b[0] || a[1] !== b[1]) hole.push([a[0], a[1]]);
        return hole;
      });
    }
  }

  const geometry = { type: 'Polygon', coordinates: [ring, ...holes] };
  const st = geomStats(geometry);
  const cat = byId['us-oh-cincinnati'];
  const dist = haversineKm(
    { lat: cat.latitude, lng: cat.longitude },
    { lat: st.cy, lng: st.cx },
  );
  console.log('cincinnati', st, 'dist', dist.toFixed(2), 'holes', holes.length);
  writeInbox('southmidwest', 'us-oh-cincinnati', {
    eruvId: 'us-oh-cincinnati',
    status: 'ready',
    sourceType: 'web_map',
    sourceUrl: 'https://www.cincinnatieruv.org/',
    googleMyMapsMid: null,
    notes: `HARD HUNT 2026-11-20: Official #map-data on cincinnatieruv.org (pts=${st.n} diag=${st.diag.toFixed(1)}km, holes=${holes.length}).`,
    checkedAt: new Date().toISOString(),
    geometry,
  });
}

// Fix Miami: if wrongly ready with huge multipolygon, demote
for (const id of ['us-fl-miami-beach', 'us-fl-surfside-33154']) {
  const p = path.join(inboxRoot, 'southmidwest', `${id}.json`);
  if (!fs.existsSync(p)) continue;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (j.status === 'ready' && j.geometry) {
    const st = geomStats(j.geometry);
    console.log(id, 'current ready diag', st.diag.toFixed(2));
    if (st.diag > 15) {
      demote(
        'southmidwest',
        id,
        'HARD HUNT: Reverted — previous promote used full South Florida MultiPolygon, not post-2025-09-12 split. Keep pending until separate MB south-of-73rd / 33154 north vectors exist.',
        j.sourceUrl,
        j.googleMyMapsMid,
        'google_my_maps',
      );
    }
  }
}

// Also try named placemark only for MB
{
  const mid = '1XhSNBTYm0pkAkbe7SfBZnTkULJ3G3r0U';
  const { kml } = await fetchGoogleMyMapsGeometry(mid, { preferBorders: false });
  const pms = kml.match(/<Placemark[\s\S]*?<\/Placemark>/gi) || [];
  for (const pm of pms) {
    const name = (pm.match(/<name>([^<]*)<\/name>/i)?.[1] || '').trim();
    if (!/miami\s*beach/i.test(name)) continue;
    const geom = kmlToGeometry(`<kml>${pm}</kml>`, { preferBorders: true });
    const st = geomStats(geom);
    console.log('named', name, geom?.type, st);
  }
}
