/**
 * Fix bad promotions + promote Cincinnati map-data + named Miami Beach layer only.
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
    minLng,
    maxLng,
  };
}

function writeInbox(batch, eruvId, payload) {
  const out = path.join(inboxRoot, batch, `${eruvId}.json`);
  fs.writeFileSync(out, JSON.stringify(payload, null, 2) + '\n');
  console.log('wrote', eruvId, payload.status);
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

// --- Demote bad promotions ---
demote(
  'southmidwest',
  'us-mi-detroit',
  'HARD HUNT: Eruv Homes / My Maps mid=1NZzCc9LzaJY87iTRVX-uDDTV_Dk is Southfield-only (~3.5km), not full Oak Park/Southfield Detroit Eruv. Keep pending until full Project Eruv map found.',
  'https://www.google.com/maps/d/viewer?mid=1NZzCc9LzaJY87iTRVX-uDDTV_Dk',
  '1NZzCc9LzaJY87iTRVX-uDDTV_Dk',
  'google_my_maps',
);

demote(
  'southmidwest',
  'us-tx-houston',
  'HARD HUNT: mid=1DIepzYQLngMdTUpZjKduUZMB1JJsiy0 is Northfield (YI/Beth Rambam/Chabad) only (~3km). Meyerland/UOS are separate image maps. Keep city-wide id pending.',
  'https://www.google.com/maps/d/kml?mid=1DIepzYQLngMdTUpZjKduUZMB1JJsiy0&forcekml=1',
  '1DIepzYQLngMdTUpZjKduUZMB1JJsiy0',
  'google_my_maps',
);

// --- Cincinnati from official #map-data ---
{
  const html = fs.readFileSync(path.join(__dirname, 'cincinnati.html'), 'utf8');
  const m = html.match(/<script id="map-data"[^>]*>([\s\S]*?)<\/script>/i);
  const data = JSON.parse(m[1]);
  const ring = data.boundary.map(([lng, lat]) => [lng, lat]);
  // close ring
  const f = ring[0];
  const l = ring[ring.length - 1];
  if (f[0] !== l[0] || f[1] !== l[1]) ring.push([f[0], f[1]]);
  const holes = (data.exclusion || []).map((hole) => {
    const r = hole.map(([lng, lat]) => [lng, lat]);
    const a = r[0];
    const b = r[r.length - 1];
    if (a[0] !== b[0] || a[1] !== b[1]) r.push([a[0], a[1]]);
    return r;
  });
  const geometry = {
    type: 'Polygon',
    coordinates: [ring, ...holes],
  };
  const st = geomStats(geometry);
  const cat = byId['us-oh-cincinnati'];
  const dist = haversineKm(
    { lat: cat.latitude, lng: cat.longitude },
    { lat: st.cy, lng: st.cx },
  );
  console.log(
    `cincinnati map-data pts=${st.n} diag=${st.diag.toFixed(2)} dist=${dist.toFixed(2)} holes=${holes.length}`,
  );
  // Site said approximate web map / PDF authoritative — but map-data is the published interactive boundary.
  // Promote with note that official site also hosts PDF.
  writeInbox('southmidwest', 'us-oh-cincinnati', {
    eruvId: 'us-oh-cincinnati',
    status: 'ready',
    sourceType: 'web_map',
    sourceUrl: 'https://www.cincinnatieruv.org/',
    googleMyMapsMid: null,
    notes: `HARD HUNT 2026-11-20: Extracted official #map-data GeoJSON boundary from cincinnatieruv.org (pts=${st.n} diag=${st.diag.toFixed(1)}km, exclusion holes=${holes.length}). Site also links PDF as authoritative reference.`,
    checkedAt: new Date().toISOString(),
    geometry,
  });
}

// --- Miami Beach/Bal Harbour: named placemark only, then split at ~73rd St ---
// 73rd Street Miami Beach is approximately lat 25.8565
const LAT_73RD = 25.8565;
{
  const mid = '1XhSNBTYm0pkAkbe7SfBZnTkULJ3G3r0U';
  const { kml, kmlBytes } = await fetchGoogleMyMapsGeometry(mid, { preferBorders: false });
  console.log('\nMiami KML bytes', kmlBytes);

  // Extract only "Miami Beach/Bal Harbour Eruv" placemark
  const pms = kml.match(/<Placemark[\s\S]*?<\/Placemark>/gi) || [];
  let targetPm = null;
  for (const pm of pms) {
    const name = (pm.match(/<name>([^<]*)<\/name>/i)?.[1] || '').trim();
    if (/miami\s*beach\s*\/\s*bal\s*harbour/i.test(name)) {
      targetPm = pm;
      console.log('found placemark', name);
      break;
    }
  }
  if (!targetPm) {
    console.log('NO Miami Beach/Bal Harbour placemark — demoting both');
    demote(
      'southmidwest',
      'us-fl-miami-beach',
      'HARD HUNT: Combined South Florida My Maps still lacks a clean post-2025-09-12 MB south-of-73rd layer; named placemark extract failed. Keep pending.',
      `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`,
      mid,
      'google_my_maps',
    );
    demote(
      'southmidwest',
      'us-fl-surfside-33154',
      'HARD HUNT: Same combined MB/Bal Harbour pre-split; no 33154-only north-of-73rd vector. Keep pending.',
      `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`,
      mid,
      'google_my_maps',
    );
  } else {
    const geom = kmlToGeometry(`<kml>${targetPm}</kml>`, { preferBorders: true });
    const st = geomStats(geom);
    console.log('combined MB/BH', geom?.type, st);

    // Split rings by centroid relative to 73rd
    function ringCentroid(ring) {
      let sx = 0;
      let sy = 0;
      const n = ring.length - 1;
      for (let i = 0; i < n; i++) {
        sx += ring[i][0];
        sy += ring[i][1];
      }
      return { lng: sx / n, lat: sy / n };
    }

    const polys =
      geom.type === 'Polygon'
        ? [geom.coordinates]
        : geom.coordinates; /* MultiPolygon: array of polygons */

    const south = [];
    const north = [];
    for (const poly of polys) {
      const outer = poly[0];
      const c = ringCentroid(outer);
      // Also check if entire ring is mostly south/north of 73rd
      const lats = outer.map((p) => p[1]);
      const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      console.log('ring avgLat', avgLat.toFixed(5), 'centroid', c.lat.toFixed(5));
      if (avgLat < LAT_73RD) south.push(poly);
      else north.push(poly);
    }

    console.log('south rings', south.length, 'north rings', north.length);

    // If single polygon spanning both, clip by latitude is inventing — demote
    if (south.length + north.length <= 1 && st.maxLat > LAT_73RD && st.minLat < LAT_73RD) {
      console.log('Single spanning polygon — cannot invent split; demote');
      demote(
        'southmidwest',
        'us-fl-miami-beach',
        `HARD HUNT: Named "Miami Beach/Bal Harbour Eruv" placemark is still the combined pre-split layer (pts=${st.n} lat ${st.minLat.toFixed(4)}-${st.maxLat.toFixed(4)}). Post-2025-09-12 south-of-73rd split not published as separate vector. Keep pending.`,
        `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`,
        mid,
        'google_my_maps',
      );
      demote(
        'southmidwest',
        'us-fl-surfside-33154',
        'HARD HUNT: Same combined MB/Bal Harbour layer — not 33154-only north-of-73rd. Keep pending.',
        `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`,
        mid,
        'google_my_maps',
      );
    } else {
      if (south.length) {
        const g =
          south.length === 1
            ? { type: 'Polygon', coordinates: south[0] }
            : { type: 'MultiPolygon', coordinates: south };
        const sst = geomStats(g);
        writeInbox('southmidwest', 'us-fl-miami-beach', {
          eruvId: 'us-fl-miami-beach',
          status: 'ready',
          sourceType: 'google_my_maps',
          sourceUrl: `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`,
          googleMyMapsMid: mid,
          notes: `HARD HUNT: South-of-~73rd portion of named Miami Beach/Bal Harbour placemark (avgLat filter ${LAT_73RD}). pts=${sst.n} diag=${sst.diag.toFixed(1)}km. VERIFY against post-2025-09-12 official split.`,
          checkedAt: new Date().toISOString(),
          geometry: g,
        });
      } else {
        demote(
          'southmidwest',
          'us-fl-miami-beach',
          'HARD HUNT: No south-of-73rd ring found in named MB/BH placemark. Keep pending.',
          `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`,
          mid,
          'google_my_maps',
        );
      }
      if (north.length) {
        const g =
          north.length === 1
            ? { type: 'Polygon', coordinates: north[0] }
            : { type: 'MultiPolygon', coordinates: north };
        const nst = geomStats(g);
        writeInbox('southmidwest', 'us-fl-surfside-33154', {
          eruvId: 'us-fl-surfside-33154',
          status: 'ready',
          sourceType: 'google_my_maps',
          sourceUrl: `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`,
          googleMyMapsMid: mid,
          notes: `HARD HUNT: North-of-~73rd portion of named Miami Beach/Bal Harbour placemark (avgLat filter ${LAT_73RD}). pts=${nst.n} diag=${nst.diag.toFixed(1)}km. VERIFY against post-2025-09-12 33154 split.`,
          checkedAt: new Date().toISOString(),
          geometry: g,
        });
      } else {
        demote(
          'southmidwest',
          'us-fl-surfside-33154',
          'HARD HUNT: No north-of-73rd ring found. Keep pending.',
          `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`,
          mid,
          'google_my_maps',
        );
      }
    }
  }
}

// Try Teaneck data files
{
  const base = 'https://www.tberuv.org/';
  for (const f of [
    'eruv.js',
    'map.js',
    'eruvdata.js',
    'data.js',
    'north.js',
    'south.js',
    'eruv.xml',
    'eruv.txt',
    'points.js',
    'Map.js',
  ]) {
    try {
      const res = await fetch(base + f, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      console.log('teaneck', f, res.status, res.headers.get('content-type'));
      if (res.ok) {
        const t = await res.text();
        fs.writeFileSync(path.join(__dirname, `teaneck-${f.replace(/\//g, '_')}`), t);
        console.log('  bytes', t.length, t.slice(0, 120).replace(/\n/g, ' '));
      }
    } catch (e) {
      console.log('teaneck', f, e.message);
    }
  }
  // Also fetch Map.html and look for include of coordinate lists
  const html = fs.readFileSync(path.join(__dirname, 'teaneck.html'), 'utf8');
  // Sometimes coords are in a separate .php or loaded via XHR — search for fetch/XMLHttpRequest
  const xhrs = [...html.matchAll(/["']([^"']*(?:eruv|north|south|lechi|point|coord|data)[^"']*)["']/gi)].map(
    (m) => m[1],
  );
  console.log('teaneck string refs', [...new Set(xhrs)].slice(0, 40));
}
