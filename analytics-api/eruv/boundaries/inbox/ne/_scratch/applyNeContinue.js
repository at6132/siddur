/**
 * Continue NE hard-hunt: Teaneck XML + parent mids + soft-stitch fixes.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchGoogleMyMapsGeometry,
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

function assertReady(id, geometry) {
  const st = geomStats(geometry);
  if (st.diag < 1 || st.n < 12) {
    throw new Error(`${id} quality fail pts=${st.n} diag=${st.diag}`);
  }
  return st;
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

function substantialRings(rings, minPts = 12, minDiag = 1.0) {
  return rings.filter((r) => {
    const st = geomStats({ type: 'Polygon', coordinates: [r] });
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

function closeRing(ring) {
  if (ring.length < 3) return null;
  const f = ring[0];
  const l = ring[ring.length - 1];
  if (f[0] !== l[0] || f[1] !== l[1]) return [...ring, [f[0], f[1]]];
  return ring;
}

function writeReady(id, row) {
  const st = assertReady(id, row.geometry);
  const out = {
    eruvId: id,
    status: 'ready',
    sourceType: row.sourceType || 'google_my_maps',
    sourceUrl: row.sourceUrl,
    googleMyMapsMid: row.mid ?? null,
    notes: row.notes,
    checkedAt: now,
    geometry: row.geometry,
  };
  fs.writeFileSync(path.join(inbox, `${id}.json`), JSON.stringify(out, null, 2));
  console.log(`READY ${id}: ${row.geometry.type} pts=${st.n} diag=${st.diag.toFixed(2)}km`);
  return id;
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
  console.log(`PENDING ${id}`);
  return { id, reason: row.reason };
}

const promoted = [];
const pending = [];

// --- Teaneck from official eruvData.xml (Google Maps Polygon paths) ---
{
  const xmlUrl = 'https://www.tberuv.org/eruvData.xml';
  const res = await fetch(xmlUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/xml,text/xml,*/*;q=0.8',
      Referer: 'https://www.tberuv.org/Map.html',
    },
  });
  if (!res.ok) throw new Error(`Teaneck XML HTTP ${res.status}`);
  const xml = await res.text();
  const eruvBlocks = xml.match(/<eruv\b[\s\S]*?<\/eruv>/gi) || [];
  const rings = [];
  for (const block of eruvBlocks) {
    const desc = block.match(/description="([^"]*)"/i)?.[1] || '';
    const lechis = [...block.matchAll(/<lechi\b[^>]*>/gi)];
    const ring = [];
    for (const tag of lechis) {
      const lat = parseFloat(tag[0].match(/latitude="([^"]+)"/i)?.[1]);
      const lng = parseFloat(tag[0].match(/longitude="([^"]+)"/i)?.[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) ring.push([lng, lat]);
    }
    const closed = closeRing(ring);
    if (closed && closed.length >= 12) {
      rings.push(closed);
      console.log(`  Teaneck ${desc}: ${closed.length} verts`);
    }
  }
  const geometry = ringsToGeometry(rings);
  if (!geometry) throw new Error('Teaneck: no rings from XML');
  promoted.push(
    writeReady('us-nj-teaneck', {
      sourceType: 'official_xml',
      sourceUrl: xmlUrl,
      mid: null,
      geometry,
      notes: `HARD-HUNT ${now}: Extracted North+South eruv Polygon paths from tberuv.org/eruvData.xml (loaded by Map.html google.maps.Polygon). rings=${rings.length}`,
    }),
  );
}

// --- Parent-promoted mids (sync local inbox) ---
const parentMids = [
  {
    id: 'us-nj-west-orange',
    mid: '1Wh8Ac_wB2LRT933JCWImUiX7cdy1uBWb',
    note: 'eruvhomes mid',
  },
  {
    id: 'us-ny-kgh',
    mid: '1biE2l51qVq-PW3ov7cTT55SVIYg',
    note: 'eruvhomes mid',
  },
  {
    id: 'us-ny-great-neck',
    mid: '1G5xK1KP8fw99aI6PudKpAb-JJhj-zOE',
    note: 'eruvhomes mid (prefer over older stub mid)',
  },
  {
    id: 'us-ny-west-hempstead',
    mid: '1HiUdjPCu1itXXN6T81KmI0iOtdM',
    note: 'eruvhomes mid',
  },
];

for (const p of parentMids) {
  const { geometry, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(p.mid, {
    preferBorders: true,
  });
  promoted.push(
    writeReady(p.id, {
      mid: p.mid,
      sourceUrl,
      geometry,
      notes: `HARD-HUNT ${now}: ${p.note}. ${geometry.type} kmlBytes=${kmlBytes}`,
    }),
  );
}

// --- Willowbrook: helper returns tiny stubs; soft-stitch Eruv Line* ---
{
  const mid = '10KAGOR4hur5Txk7AdQm8-PkzVmk';
  const { kml, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(mid, {
    preferBorders: true,
  });
  const rings = substantialRings(stitchLineStringsToRings(extractAllLines(kml), 5e-4));
  const geometry = largestRing(rings);
  promoted.push(
    writeReady('us-ny-willowbrook', {
      mid,
      sourceUrl,
      geometry,
      notes: `HARD-HUNT ${now}: eruvhomes/YISI mid; soft-stitched Eruv Line* (raw helper was ~0.4km stub). ${geometry.type} kmlBytes=${kmlBytes}`,
    }),
  );
}

// --- White Plains: soft-stitch WP+Scarsdale sector lines ---
{
  const mid = '1GBWC9472ubRfNqSXXos4h5gVB00';
  const { kml, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(mid, {
    preferBorders: true,
  });
  const rings = substantialRings(stitchLineStringsToRings(extractAllLines(kml), 5e-4));
  const geometry = ringsToGeometry(rings);
  promoted.push(
    writeReady('us-ny-white-plains', {
      mid,
      sourceUrl,
      geometry,
      notes: `HARD-HUNT ${now}: HIWP/eruvhomes mid; soft-stitched White Plains + Scarsdale sector LineStrings. ${geometry.type} rings=${rings.length} kmlBytes=${kmlBytes}`,
    }),
  );
}

// --- Sephardic: named Sepharadi layer from Brooklyn multi-map ---
{
  const mid = '1VLdHiyP0wgl5KO5i_HEiKe2IDvA';
  const { geometry, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(mid, {
    preferBorders: true,
    nameIncludes: 'sepharadi',
  });
  promoted.push(
    writeReady('us-ny-sephardic-brooklyn', {
      mid,
      sourceUrl,
      geometry,
      notes: `HARD-HUNT ${now}: Sepharadi Eruv of Flatbush placemark from Brooklyn Eruv Maps (erub.org is JPG-only; eruvhomes has no mid). ${geometry.type} kmlBytes=${kmlBytes}`,
    }),
  );
}

// --- Still hard ---
pending.push(
  writePending('us-ny-hillcrest', {
    sourceType: 'pdf',
    sourceUrl: 'http://yihillcrest.org/wp-content/uploads/2023/06/Eruv-Map-Queens-2023.pdf',
    mid: null,
    reason: 'PDF-only; eruvhomes has no mapped boundary/mid',
    notes: `HARD-HUNT ${now}: YI Hillcrest Eruv-Map-Queens-2023.pdf only. eruvhomes.com/eruv/hillcrest-eruv lists no mid/boundary. Remains pending digitize.`,
  }),
);

pending.push(
  writePending('us-ny-rockland', {
    sourceType: 'image',
    sourceUrl: 'https://www.rocklanderuv.org/copy-of-about-us',
    mid: null,
    reason: 'JPG/PDF map only; eruvhomes has no mid',
    notes: `HARD-HUNT ${now}: rocklanderuv.org map imagery / bmcsmonsey download; eruvhomes.com/eruv/rockland-eruv--monsey has no mid. Remains pending digitize.`,
  }),
);

// Refresh summary
const files = fs
  .readdirSync(inbox)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'));
const byStatus = {
  ready: [],
  pending_digitize: [],
  not_found: [],
  skipped_contested: [],
};
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(inbox, f), 'utf8'));
  if (!byStatus[j.status]) byStatus[j.status] = [];
  byStatus[j.status].push(j.eruvId);
}
for (const k of Object.keys(byStatus)) byStatus[k].sort();

const summary = {
  batch: 'ne',
  ready: byStatus.ready.length,
  pending_digitize: byStatus.pending_digitize.length,
  not_found: byStatus.not_found.length,
  skipped_contested: byStatus.skipped_contested.length,
  eruvIdsReady: byStatus.ready,
  hardHuntContinueAt: now,
  hardHuntContinuePromoted: promoted,
  hardHuntContinueStillPending: pending,
};
fs.writeFileSync(path.join(inbox, '_summary.json'), JSON.stringify(summary, null, 2));
console.log('\n=== SUMMARY ===');
console.log(JSON.stringify(summary, null, 2));
