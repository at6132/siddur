/**
 * Hunt / re-extract NE hard-case eruv borders.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchGoogleMyMapsGeometry,
  kmlToGeometry,
  stitchLineStringsToRings,
} from '../../../kmlToGeojson.js';
import { US_ERUV_CATALOG_SEED } from '../../../../catalogSeed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inbox = path.join(__dirname, '..');
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
  const diag = Math.sqrt(w * w + h * h);
  return {
    n,
    diag,
    cx: (minLng + maxLng) / 2,
    cy: (minLat + maxLat) / 2,
    bbox: [minLng, minLat, maxLng, maxLat],
  };
}

function parseCoordTuples(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number))
    .filter((c) => c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]))
    .map(([lng, lat]) => [lng, lat]);
}

function extractAllLines(kml) {
  const lines = [];
  for (const lb of kml.match(/<LineString\b[\s\S]*?<\/LineString>/gi) || []) {
    const m = lb.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
    if (!m) continue;
    const c = parseCoordTuples(m[1]);
    if (c.length >= 2) lines.push(c);
  }
  return lines;
}

function ringsToGeometry(rings) {
  if (!rings.length) return null;
  if (rings.length === 1) return { type: 'Polygon', coordinates: [rings[0]] };
  return { type: 'MultiPolygon', coordinates: rings.map((r) => [r]) };
}

/** Prefer largest ring if multiple (community outline vs scraps). */
function largestRingGeometry(rings) {
  if (!rings.length) return null;
  let best = rings[0];
  let bestN = 0;
  for (const r of rings) {
    if (r.length > bestN) {
      best = r;
      bestN = r.length;
    }
  }
  return { type: 'Polygon', coordinates: [best] };
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

function summarize(label, geom, cat) {
  const st = geomStats(geom);
  if (!st) {
    console.log(`  ${label}: null`);
    return null;
  }
  const dist =
    cat?.latitude != null
      ? haversineKm({ lat: cat.latitude, lng: cat.longitude }, { lat: st.cy, lng: st.cx })
      : null;
  const q = qualityOk(st, cat);
  console.log(
    `  ${label}: ${geom.type} pts=${st.n} diag=${st.diag.toFixed(2)}km dist=${dist?.toFixed(2) ?? '-'} ${q.ok ? 'OK' : q.reason}`,
  );
  return { st, q, geom };
}

async function fetchLegacyMs(msid) {
  const url = `https://www.google.com/maps/ms?ie=UTF8&msa=0&output=kml&msid=${encodeURIComponent(msid)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'SiddurEruvBoundaryHarvest/1.0' } });
  const text = await res.text();
  return { url, status: res.status, text, bytes: text.length };
}

async function resolveGooGl(shortUrl) {
  const res = await fetch(shortUrl, {
    redirect: 'follow',
    headers: { 'User-Agent': 'SiddurEruvBoundaryHarvest/1.0' },
  });
  return { finalUrl: res.url, status: res.status };
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  const text = await res.text();
  return { status: res.status, text, bytes: text.length, url: res.url };
}

function findMids(html) {
  const mids = new Set();
  for (const m of html.matchAll(/[?&]mid=([A-Za-z0-9_-]+)/g)) mids.add(m[1]);
  for (const m of html.matchAll(/maps\/d\/(?:u\/\d+\/)?(?:embed|viewer|edit)\?mid=([A-Za-z0-9_-]+)/g))
    mids.add(m[1]);
  for (const m of html.matchAll(/msid=([0-9]+\.[0-9a-f]+)/gi)) mids.add(`msid:${m[1]}`);
  return [...mids];
}

console.log('=== Resolve short links ===');
for (const u of [
  'http://goo.gl/maps/qsEN5',
  'http://goo.gl/maps/J09mK',
  'https://goo.gl/8r3WFP',
]) {
  try {
    const r = await resolveGooGl(u);
    console.log(u, '->', r.status, r.finalUrl);
  } catch (e) {
    console.log(u, 'ERR', e.message);
  }
}

console.log('\n=== Scrape candidate pages for mids ===');
const pages = [
  'https://eruvstat.us/cherryhillwest',
  'https://eruvstat.us/pceruv',
  'http://passaicjews.com/eruv/',
  'https://www.pceruv.com/',
  'https://greatneckeiruv.org/eiruv-map/',
  'https://www.gns.org/jewish-life/eruv/',
  'https://www.yisi.org/community/eruv-map/',
  'https://www.anshei.org/eruv',
  'https://www.yiwh.org/eruv',
  'https://www.hiwp.org/eruv',
  'https://www.yiwp.org/white-plains-eruv.html',
  'https://www.tberuv.org/Map.html',
  'https://www.erub.org/b-our-story',
  'https://www.kgheruv.com/',
  'https://www.farrockawaylawrenceeruv.org/eruv-map/',
  'https://www.soicherryhill.org/west-side-eruv.html',
  'https://bmcsmonsey.org/eruv-map/',
  'http://westorangeeruv.org/maps/',
  'https://westorangeeruv.org/maps/',
];

for (const url of pages) {
  try {
    const r = await fetchHtml(url);
    const mids = findMids(r.text);
    const hasLeaflet = /leaflet|L\.map|geojson|mapdata/i.test(r.text);
    const hasImg = /\.(gif|png|jpe?g|pdf)/i.test(r.text);
    console.log(
      `${r.status} ${url}\n  mids=${mids.join(',') || '-'} leaflet=${hasLeaflet} bytes=${r.bytes}`,
    );
    if (mids.length) {
      // peek first mid
    }
  } catch (e) {
    console.log(`ERR ${url}: ${e.message}`);
  }
}

console.log('\n=== My Maps geometry strategies ===');
const midCases = [
  {
    id: 'us-nj-cherry-hill-west',
    mid: '1Lc9bhHT4Z2wImel5vsh7qTjynQpupw4X',
    strategies: ['helper', 'all_lines', 'largest_line_ring'],
  },
  {
    id: 'us-nj-passaic-clifton',
    mid: '1i1k6AOCv68pODbvRirBdwd-egTEq5GlY',
    strategies: ['helper', 'all_lines', 'largest_line_ring'],
  },
  {
    id: 'us-ny-far-rockaway',
    mid: '1Qdx7LIutQIuAc1YXUUY1zSuFvaFCYvkd',
    strategies: ['helper', 'all_lines', 'largest_line_ring'],
  },
  {
    id: 'us-ny-flatbush',
    mid: '1VLdHiyP0wgl5KO5i_HEiKe2IDvA',
    strategies: ['helper_flatbush', 'helper_sepharadi'],
  },
  {
    id: 'us-ny-great-neck',
    mid: '1Yp-cRqlZDN8zA_ynPToE3Dm2PLI',
    strategies: ['helper', 'all_lines', 'largest_line_ring', 'lines_eps_soft'],
  },
];

for (const c of midCases) {
  const cat = byId[c.id];
  console.log(`\n==== ${c.id} ====`);
  const { kml, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(c.mid, {
    preferBorders: true,
  });
  console.log(`kmlBytes=${kmlBytes}`);
  const folders = [...kml.matchAll(/<Folder>[\s\S]*?<name>([^<]*)<\/name>/gi)].map((m) => m[1]);
  if (folders.length) console.log('folders:', folders.join(' | '));

  for (const strat of c.strategies) {
    let geom = null;
    if (strat === 'helper') geom = kmlToGeometry(kml, { preferBorders: true });
    if (strat === 'helper_flatbush')
      geom = kmlToGeometry(kml, { preferBorders: true, nameIncludes: 'flatbush eruv' });
    if (strat === 'helper_sepharadi')
      geom = kmlToGeometry(kml, { preferBorders: true, nameIncludes: 'sepharadi' });
    if (strat === 'all_lines') {
      const rings = stitchLineStringsToRings(extractAllLines(kml));
      geom = ringsToGeometry(rings);
    }
    if (strat === 'largest_line_ring') {
      const rings = stitchLineStringsToRings(extractAllLines(kml));
      geom = largestRingGeometry(rings);
    }
    if (strat === 'lines_eps_soft') {
      const rings = stitchLineStringsToRings(extractAllLines(kml), 5e-4);
      geom = largestRingGeometry(rings);
      summarize(`${strat} rings=${rings.length}`, geom, cat);
      continue;
    }
    summarize(strat, geom, cat);
  }
}

// Legacy willowbrook msid
console.log('\n==== willowbrook legacy ms ====');
const ms = await fetchLegacyMs('105609587994589552250.00045904633f7b0fb9748');
console.log('status', ms.status, 'bytes', ms.bytes, 'ctype-ish', ms.text.slice(0, 80));
if (ms.text.includes('LineString') || ms.text.includes('Polygon')) {
  const g = kmlToGeometry(ms.text, { preferBorders: true });
  summarize('legacy helper', g, byId['us-ny-willowbrook']);
  const rings = stitchLineStringsToRings(extractAllLines(ms.text));
  summarize('legacy all_lines', ringsToGeometry(rings), byId['us-ny-willowbrook']);
  summarize('legacy largest', largestRingGeometry(rings), byId['us-ny-willowbrook']);
}
