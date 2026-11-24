/**
 * Apply NE hard-case promotions / pending updates; refresh _summary.json.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchGoogleMyMapsGeometry,
  kmlToGeometry,
  stitchLineStringsToRings,
} from '../../../kmlToGeojson.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inbox = path.join(__dirname, '..');
const now = new Date().toISOString();

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
  return { n, diag: Math.sqrt(w * w + h * h) };
}

function parseCoordTuples(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number))
    .filter((c) => c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]))
    .map(([lng, lat]) => [lng, lat]);
}

function extractAllLines(block) {
  const lines = [];
  for (const lb of block.match(/<LineString\b[\s\S]*?<\/LineString>/gi) || []) {
    const m = lb.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
    if (!m) continue;
    const c = parseCoordTuples(m[1]);
    if (c.length >= 2) lines.push(c);
  }
  return lines;
}

function folderBlock(kml, re) {
  for (const f of kml.match(/<Folder\b[\s\S]*?<\/Folder>/gi) || []) {
    const name = (f.match(/<name>([^<]*)<\/name>/i)?.[1] || '').trim();
    if (re.test(name)) return f;
  }
  return null;
}

function substantialRings(rings, minPts = 12, minDiag = 1.0) {
  return rings.filter((r) => {
    const g = { type: 'Polygon', coordinates: [r] };
    const st = geomStats(g);
    return st.n >= minPts && st.diag >= minDiag;
  });
}

function ringsToGeometry(rings) {
  if (!rings.length) return null;
  if (rings.length === 1) return { type: 'Polygon', coordinates: [rings[0]] };
  return { type: 'MultiPolygon', coordinates: rings.map((r) => [r]) };
}

function largestRing(rings) {
  if (!rings.length) return null;
  let best = rings[0];
  for (const r of rings) if (r.length > best.length) best = r;
  return { type: 'Polygon', coordinates: [best] };
}

function writeReady(id, row) {
  const st = geomStats(row.geometry);
  if (st.diag < 1 || st.n < 12) {
    throw new Error(`${id} failed quality pts=${st.n} diag=${st.diag}`);
  }
  const out = {
    eruvId: id,
    status: 'ready',
    sourceType: 'google_my_maps',
    sourceUrl: row.sourceUrl,
    googleMyMapsMid: row.mid,
    notes: row.notes,
    checkedAt: now,
    geometry: row.geometry,
  };
  fs.writeFileSync(path.join(inbox, `${id}.json`), JSON.stringify(out, null, 2));
  console.log(`READY ${id}: ${row.geometry.type} pts=${st.n} diag=${st.diag.toFixed(2)}km`);
}

function writePending(id, row) {
  const out = {
    eruvId: id,
    status: 'pending_digitize',
    sourceType: row.sourceType,
    sourceUrl: row.sourceUrl,
    googleMyMapsMid: row.mid ?? null,
    notes: row.notes,
    checkedAt: now,
  };
  fs.writeFileSync(path.join(inbox, `${id}.json`), JSON.stringify(out, null, 2));
  console.log(`PENDING ${id}: ${row.notes.slice(0, 100)}`);
}

const results = { promoted: [], pending: [] };

// ---- PROMOTE ----

// Flatbush: named layer only
{
  const mid = '1VLdHiyP0wgl5KO5i_HEiKe2IDvA';
  const { geometry, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(mid, {
    preferBorders: true,
    nameIncludes: 'flatbush eruv',
  });
  writeReady('us-ny-flatbush', {
    mid,
    sourceUrl,
    geometry,
    notes: `HARD-HUNT ${now}: Flatbush Eruv placemark only from Brooklyn multi-map (excluded Sepharadi/other boroughs). ${geometry.type} kmlBytes=${kmlBytes}`,
  });
  results.promoted.push('us-ny-flatbush');
}

// Sephardic: Sepharadi layer from same Brooklyn multi-map
{
  const mid = '1VLdHiyP0wgl5KO5i_HEiKe2IDvA';
  const { geometry, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(mid, {
    preferBorders: true,
    nameIncludes: 'sepharadi',
  });
  writeReady('us-ny-sephardic-brooklyn', {
    mid,
    sourceUrl,
    geometry,
    notes: `HARD-HUNT ${now}: Sepharadi Eruv of Flatbush placemark from Brooklyn Eruv Maps mid. Official erub.org is JPG-only. ${geometry.type} kmlBytes=${kmlBytes}`,
  });
  results.promoted.push('us-ny-sephardic-brooklyn');
}

// Far Rockaway: border LineStrings (karfefs excluded by helper)
{
  const mid = '1Qdx7LIutQIuAc1YXUUY1zSuFvaFCYvkd';
  const { geometry, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(mid, {
    preferBorders: true,
  });
  writeReady('us-ny-far-rockaway', {
    mid,
    sourceUrl,
    geometry,
    notes: `HARD-HUNT ${now}: stitched Far Rockaway/Lawrence border LineStrings (Excluded Karfef placemarks filtered). ${geometry.type} kmlBytes=${kmlBytes}`,
  });
  results.promoted.push('us-ny-far-rockaway');
}

// Passaic: force line stitch (helper otherwise returns tiny interior polygons)
{
  const mid = '1i1k6AOCv68pODbvRirBdwd-egTEq5GlY';
  const { kml, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(mid, {
    preferBorders: true,
  });
  const rings = substantialRings(stitchLineStringsToRings(extractAllLines(kml), 5e-4));
  const geometry = largestRing(rings);
  writeReady('us-nj-passaic-clifton', {
    mid,
    sourceUrl,
    geometry,
    notes: `HARD-HUNT ${now}: soft-stitched perimeter LineStrings (helper polygon path was interior-only). ${geometry.type} kmlBytes=${kmlBytes} ringsKept=${rings.length}`,
  });
  results.promoted.push('us-nj-passaic-clifton');
}

// Cherry Hill West: Eruv Border folder lines, largest substantial ring
{
  const mid = '1Lc9bhHT4Z2wImel5vsh7qTjynQpupw4X';
  const { kml, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(mid, {
    preferBorders: true,
  });
  const border = folderBlock(kml, /eruv border/i) || kml;
  const rings = substantialRings(stitchLineStringsToRings(extractAllLines(border), 5e-4));
  const geometry = largestRing(rings);
  writeReady('us-nj-cherry-hill-west', {
    mid,
    sourceUrl,
    geometry,
    notes: `HARD-HUNT ${now}: soft-stitched Eruv Border folder LineStrings (exclusions/water holes dropped). ${geometry.type} kmlBytes=${kmlBytes}`,
  });
  results.promoted.push('us-nj-cherry-hill-west');
}

// Great Neck: Great Neck Eruv folder soft stitch
{
  const mid = '1Yp-cRqlZDN8zA_ynPToE3Dm2PLI';
  const { kml, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(mid, {
    preferBorders: true,
  });
  const folder = folderBlock(kml, /^Great Neck Eruv$/i) || kml;
  const rings = substantialRings(stitchLineStringsToRings(extractAllLines(folder), 5e-4));
  const geometry = largestRing(rings);
  writeReady('us-ny-great-neck', {
    mid,
    sourceUrl,
    geometry,
    notes: `HARD-HUNT ${now}: soft-stitched Great Neck Eruv folder LineStrings (Lake Success extension omitted; helper previously returned 4-pt stub). ${geometry.type} kmlBytes=${kmlBytes}`,
  });
  results.promoted.push('us-ny-great-neck');
}

// Willowbrook: new mid from goo.gl/maps/qsEN5
{
  const mid = '10KAGOR4hur5Txk7AdQm8-PkzVmk';
  const { kml, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(mid, {
    preferBorders: true,
  });
  const rings = substantialRings(stitchLineStringsToRings(extractAllLines(kml), 5e-4));
  const geometry = largestRing(rings);
  writeReady('us-ny-willowbrook', {
    mid,
    sourceUrl,
    geometry,
    notes: `HARD-HUNT ${now}: YISI Willowbrook My Maps mid from goo.gl/maps/qsEN5; soft-stitched Eruv Line* segments. ${geometry.type} kmlBytes=${kmlBytes}`,
  });
  results.promoted.push('us-ny-willowbrook');
}

// West Hempstead: new mid from goo.gl/maps/J09mK — Eruv Map polygon
{
  const mid = '1gi-1rYwOgFaPr6P0L9dVS_nW5Mg';
  const { geometry, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(mid, {
    preferBorders: true,
  });
  writeReady('us-ny-west-hempstead', {
    mid,
    sourceUrl,
    geometry,
    notes: `HARD-HUNT ${now}: Anshei/YIWH My Maps mid from goo.gl/maps/J09mK (Eruv Map placemark). Site notes map approximated from office original. ${geometry.type} kmlBytes=${kmlBytes}`,
  });
  results.promoted.push('us-ny-west-hempstead');
}

// White Plains / Scarsdale: HIWP mid with both folders' perimeter lines
{
  const mid = '1GBWC9472ubRfNqSXXos4h5gVB00';
  const { kml, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(mid, {
    preferBorders: true,
  });
  const rings = substantialRings(stitchLineStringsToRings(extractAllLines(kml), 5e-4));
  const geometry = ringsToGeometry(rings);
  writeReady('us-ny-white-plains', {
    mid,
    sourceUrl,
    geometry,
    notes: `HARD-HUNT ${now}: HIWP My Maps mid (White Plains + Scarsdale folders); soft-stitched sector LineStrings as MultiPolygon. ${geometry.type} rings=${rings.length} kmlBytes=${kmlBytes}`,
  });
  results.promoted.push('us-ny-white-plains');
}

// ---- PENDING ----

writePending('us-nj-teaneck', {
  sourceType: 'image',
  sourceUrl: 'https://www.tberuv.org/Map.html',
  mid: null,
  notes: `HARD-HUNT ${now}: Official tberuv.org/Map.html is GIF (eruvSmall.gif) only; no My Maps mid/KML/GeoJSON found. Remains pending digitize.`,
});
results.pending.push({ id: 'us-nj-teaneck', reason: 'GIF-only official map' });

writePending('us-nj-west-orange', {
  sourceType: 'web_map',
  sourceUrl: 'http://westorangeeruv.org/maps/',
  mid: null,
  notes: `HARD-HUNT ${now}: westorangeeruv.org/maps/ still unreachable (DNS/fetch failed); no alternate My Maps mid found. Remains pending digitize.`,
});
results.pending.push({ id: 'us-nj-west-orange', reason: 'site unreachable; no vector' });

writePending('us-ny-hillcrest', {
  sourceType: 'pdf',
  sourceUrl: 'http://yihillcrest.org/wp-content/uploads/2023/06/Eruv-Map-Queens-2023.pdf',
  mid: null,
  notes: `HARD-HUNT ${now}: Young Israel of Hillcrest Eruv-Map-Queens-2023.pdf only; no My Maps/KML found. Remains pending digitize.`,
});
results.pending.push({ id: 'us-ny-hillcrest', reason: 'PDF-only' });

writePending('us-ny-kgh', {
  sourceType: 'web_map',
  sourceUrl: 'https://kgheruv.com/',
  mid: null,
  notes: `HARD-HUNT ${now}: kgheruv.com has text street bounds + classic maps mid zpwMYyrrxlSk (KML 404). No extractable polygon. Remains pending digitize.`,
});
results.pending.push({ id: 'us-ny-kgh', reason: 'text bounds; classic mid 404' });

writePending('us-ny-rockland', {
  sourceType: 'image',
  sourceUrl: 'https://www.rocklanderuv.org/copy-of-about-us',
  mid: null,
  notes: `HARD-HUNT ${now}: rocklanderuv.org / bmcsmonsey.org map download is JPG/PDF imagery; no My Maps mid/KML found. Remains pending digitize.`,
});
results.pending.push({ id: 'us-ny-rockland', reason: 'JPG/PDF map only' });

// Refresh _summary.json from all ne inbox files
const files = fs
  .readdirSync(inbox)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'));
const byStatus = { ready: [], pending_digitize: [], not_found: [], skipped_contested: [] };
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(inbox, f), 'utf8'));
  const st = j.status || 'unknown';
  if (!byStatus[st]) byStatus[st] = [];
  byStatus[st].push(j.eruvId);
}
for (const k of Object.keys(byStatus)) byStatus[k].sort();

const summary = {
  batch: 'ne',
  ready: byStatus.ready.length,
  pending_digitize: byStatus.pending_digitize.length,
  not_found: byStatus.not_found.length,
  skipped_contested: byStatus.skipped_contested.length,
  eruvIdsReady: byStatus.ready,
  hardHuntAt: now,
  hardHuntPromoted: results.promoted,
  hardHuntStillPending: results.pending,
};
fs.writeFileSync(path.join(inbox, '_summary.json'), JSON.stringify(summary, null, 2));
console.log('\n=== SUMMARY ===');
console.log(JSON.stringify(summary, null, 2));
