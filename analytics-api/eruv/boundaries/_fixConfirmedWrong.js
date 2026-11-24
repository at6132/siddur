/**
 * Demote confirmed-wrong ready borders + re-fetch fixes.
 * Run from analytics-api: node eruv/boundaries/_fixConfirmedWrong.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchGoogleMyMapsGeometry, kmlToGeometry } from './kmlToGeojson.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function writeInbox(batch, row) {
  const dir = path.join(__dirname, 'inbox', batch);
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `${row.eruvId}.json`);
  fs.writeFileSync(dest, JSON.stringify(row, null, 2));
  console.log('wrote', dest, row.status, row.geometry ? row.geometry.type : 'no-geom');
}

function demote(batch, eruvId, notes, extra = {}) {
  const p = path.join(__dirname, 'inbox', batch, `${eruvId}.json`);
  const prev = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  writeInbox(batch, {
    eruvId,
    status: 'pending_digitize',
    sourceType: prev.sourceType || extra.sourceType || 'google_my_maps',
    sourceUrl: extra.sourceUrl || prev.sourceUrl || null,
    googleMyMapsMid: extra.googleMyMapsMid ?? prev.googleMyMapsMid ?? null,
    notes,
    checkedAt: new Date().toISOString(),
    geometry: null,
  });
  const geo = path.join(__dirname, 'geojson', `${eruvId}.geojson`);
  if (fs.existsSync(geo)) {
    fs.unlinkSync(geo);
    console.log('removed geojson', eruvId);
  }
}

/** Extract polygons whose placemark <name> matches (case-insensitive substring). */
function geometryFromNamedPlacemarks(kml, nameSubstr) {
  const needle = nameSubstr.toLowerCase();
  const placemarks = kml.match(/<Placemark\b[\s\S]*?<\/Placemark>/gi) || [];
  const polygons = [];
  for (const pm of placemarks) {
    const nameMatch = pm.match(/<name>([^<]*)<\/name>/i);
    const name = (nameMatch?.[1] || '').trim().toLowerCase();
    if (!name.includes(needle)) continue;
    const geom = kmlToGeometry(pm);
    if (!geom) continue;
    if (geom.type === 'Polygon') polygons.push(geom.coordinates);
    else if (geom.type === 'MultiPolygon') polygons.push(...geom.coordinates);
  }
  if (polygons.length === 1) return { type: 'Polygon', coordinates: polygons[0] };
  if (polygons.length > 1) return { type: 'MultiPolygon', coordinates: polygons };
  return null;
}

// --- Confirmed wrong / broken ---
demote(
  'ne',
  'us-ny-great-neck',
  'AUDIT: My Maps mid only yields a 3-vertex stub (~1m). Not the Great Neck peninsula eruv. Official map at greatneckeiruv.org/eiruv-map needs digitize.',
  { googleMyMapsMid: '1Yp-cRqlZDN8zA_ynPToE3Dm2PLI', sourceUrl: 'https://greatneckeiruv.org/eiruv-map/' },
);

demote(
  'ne',
  'us-ny-willowbrook',
  'AUDIT: Stored geometry is a tiny ~400m stub, not Willowbrook/Staten Island coverage. Re-digitize from Young Israel of Staten Island map.',
);

demote(
  'southmidwest',
  'us-mi-detroit',
  'AUDIT: Source My Maps is named Southfield Eruv only — not full Detroit/Oak Park eruv. pending until correct community boundary found.',
  { googleMyMapsMid: '1NZzCc9LzaJY87iTRVX-uDDTV_Dk' },
);

demote(
  'southmidwest',
  'us-wi-milwaukee-east',
  'AUDIT: Source layer labeled PROPOSED Milwaukee East Side Eruv — not confirmed active boundary.',
  { googleMyMapsMid: '1a-dkKWmPhOmTQzLBNUnouqHK9GRRDKkN' },
);

demote(
  'southmidwest',
  'us-fl-miami-beach',
  'AUDIT: Seed used full South Florida multi-eruv My Maps (Aventura/Hallandale/NMB/etc merged). Not Miami Beach-only. Re-extract named layer.',
  {
    googleMyMapsMid: '1XhSNBTYm0pkAkbe7SfBZnTkULJ3G3r0U',
    sourceUrl: 'https://www.google.com/maps/d/kml?mid=1XhSNBTYm0pkAkbe7SfBZnTkULJ3G3r0U&forcekml=1',
  },
);

// --- Fix Hollywood: re-fetch full mid (inbox had a thin fence strip only) ---
{
  const mid = '1t9xuHT25PAvglbzCeDCCSW9aJ2hhVig';
  const { geometry, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(mid);
  if (!geometry) throw new Error('hollywood refetch failed');
  writeInbox('southmidwest', {
    eruvId: 'us-fl-hollywood',
    status: 'ready',
    sourceType: 'google_my_maps',
    sourceUrl,
    googleMyMapsMid: mid,
    notes: `AUDIT fixed: full My Maps MultiPolygon (kmlBytes=${kmlBytes}). Hollywood Community Eruv; verify vs shulofhollywood.org PDF.`,
    checkedAt: new Date().toISOString(),
    geometry,
  });
}

// --- Fix Miami Beach: named placemark only ---
{
  const mid = '1XhSNBTYm0pkAkbe7SfBZnTkULJ3G3r0U';
  const url = `https://www.google.com/maps/d/kml?mid=${encodeURIComponent(mid)}&forcekml=1`;
  const kml = await (await fetch(url)).text();
  const geometry = geometryFromNamedPlacemarks(kml, 'miami beach/bal harbour');
  if (!geometry) throw new Error('could not extract Miami Beach/Bal Harbour named polygon');
  writeInbox('southmidwest', {
    eruvId: 'us-fl-miami-beach',
    status: 'ready',
    sourceType: 'google_my_maps',
    sourceUrl: url,
    googleMyMapsMid: mid,
    notes:
      'AUDIT fixed: named placemark "Miami Beach/Bal Harbour Eruv" only (not full South Florida multi-eruv merge).',
    checkedAt: new Date().toISOString(),
    geometry,
  });
}

// Re-check surfside uses same named layer (Bal Harbour/Surfside association) — keep if already that polygon
{
  const p = path.join(__dirname, 'inbox', 'southmidwest', 'us-fl-surfside-33154.json');
  if (fs.existsSync(p)) {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const mid = '1XhSNBTYm0pkAkbe7SfBZnTkULJ3G3r0U';
    const url = `https://www.google.com/maps/d/kml?mid=${encodeURIComponent(mid)}&forcekml=1`;
    const kml = await (await fetch(url)).text();
    const geometry = geometryFromNamedPlacemarks(kml, 'miami beach/bal harbour');
    writeInbox('southmidwest', {
      ...j,
      eruvId: 'us-fl-surfside-33154',
      status: 'ready',
      sourceType: 'google_my_maps',
      sourceUrl: url,
      googleMyMapsMid: mid,
      notes:
        'AUDIT: uses named "Miami Beach/Bal Harbour Eruv" layer (covers Surfside/Bal Harbour/Bay Harbor / MB association). Confirm with local rabbi that 33154 matches this layer.',
      checkedAt: new Date().toISOString(),
      geometry,
    });
  }
}

console.log('done fixes');
