/**
 * Validate newly found mids + folder-scoped cherry-hill border.
 */
import {
  fetchGoogleMyMapsGeometry,
  kmlToGeometry,
  stitchLineStringsToRings,
} from '../../../kmlToGeojson.js';
import { US_ERUV_CATALOG_SEED } from '../../../../catalogSeed.js';

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

function report(id, label, geom) {
  const cat = byId[id];
  const st = geomStats(geom);
  if (!st) {
    console.log(`${id} ${label}: null`);
    return;
  }
  const dist =
    cat?.latitude != null
      ? haversineKm({ lat: cat.latitude, lng: cat.longitude }, { lat: st.cy, lng: st.cx })
      : null;
  const ok = st.diag >= 1 && st.n >= 12 && (dist == null || dist <= 40);
  console.log(
    `${id} ${label}: ${geom.type} pts=${st.n} diag=${st.diag.toFixed(2)} dist=${dist?.toFixed(2) ?? '-'} ${ok ? 'READY?' : 'NO'}`,
  );
}

function folderBlock(kml, folderNameRe) {
  const folders = kml.match(/<Folder\b[\s\S]*?<\/Folder>/gi) || [];
  for (const f of folders) {
    const name = (f.match(/<name>([^<]*)<\/name>/i)?.[1] || '').trim();
    if (folderNameRe.test(name)) return { name, block: f };
  }
  return null;
}

function placemarkNames(block) {
  const out = [];
  for (const pm of block.match(/<Placemark\b[\s\S]*?<\/Placemark>/gi) || []) {
    const name = (pm.match(/<name>([^<]*)<\/name>/i)?.[1] || '').trim();
    const nPoly = (pm.match(/<Polygon\b/gi) || []).length;
    const nLine = (pm.match(/<LineString\b/gi) || []).length;
    out.push({ name, nPoly, nLine });
  }
  return out;
}

// --- Cherry Hill: Eruv Border folder ---
{
  const mid = '1Lc9bhHT4Z2wImel5vsh7qTjynQpupw4X';
  const { kml } = await fetchGoogleMyMapsGeometry(mid);
  const fb = folderBlock(kml, /eruv border/i);
  console.log('\nCHERRY HILL folders:');
  for (const f of kml.match(/<Folder\b[\s\S]*?<\/Folder>/gi) || []) {
    const name = (f.match(/<name>([^<]*)<\/name>/i)?.[1] || '').trim();
    console.log(' -', name, 'pms', (f.match(/<Placemark/gi) || []).length);
  }
  if (fb) {
    console.log('Eruv Border placemarks:', JSON.stringify(placemarkNames(fb.block), null, 0));
    const gHelper = kmlToGeometry(fb.block, { preferBorders: true });
    report('us-nj-cherry-hill-west', 'folder helper', gHelper);
    const rings = stitchLineStringsToRings(extractAllLines(fb.block));
    report('us-nj-cherry-hill-west', `folder lines rings=${rings.length}`, ringsToGeometry(rings));
    report('us-nj-cherry-hill-west', 'folder largest', largestRing(rings));
    // also try soft eps
    const soft = stitchLineStringsToRings(extractAllLines(fb.block), 5e-4);
    report('us-nj-cherry-hill-west', `folder soft rings=${soft.length}`, largestRing(soft));
  }
}

// --- Passaic: force lines ---
{
  const mid = '1i1k6AOCv68pODbvRirBdwd-egTEq5GlY';
  const { kml } = await fetchGoogleMyMapsGeometry(mid);
  const soft = stitchLineStringsToRings(extractAllLines(kml), 5e-4);
  report('us-nj-passaic-clifton', `soft largest rings=${soft.length}`, largestRing(soft));
  report('us-nj-passaic-clifton', 'soft all', ringsToGeometry(soft));
}

// --- New mids ---
const news = [
  ['us-ny-willowbrook', '10KAGOR4hur5Txk7AdQm8-PkzVmk'],
  ['us-ny-west-hempstead', '1gi-1rYwOgFaPr6P0L9dVS_nW5Mg'],
  ['us-ny-white-plains', '1GBWC9472ubRfNqSXXos4h5gVB00'],
  ['us-ny-kgh', 'zpwMYyrrxlSk'],
  ['us-ny-west-hempstead-anshei', 'z0xHPyr1hvPY'],
];

for (const [id, mid] of news) {
  console.log(`\n=== NEW ${id} mid=${mid} ===`);
  try {
    const { kml, kmlBytes, geometry } = await fetchGoogleMyMapsGeometry(mid, {
      preferBorders: true,
    });
    console.log('kmlBytes', kmlBytes);
    const folders = [...kml.matchAll(/<Folder>[\s\S]*?<name>([^<]*)<\/name>/gi)].map((m) => m[1]);
    console.log('folders', folders.join(' | ') || '-');
    console.log('names', placemarkNames(kml).map((p) => p.name).slice(0, 30).join(' | '));
    report(id.replace(/-anshei$/, ''), 'helper', geometry);
    const rings = stitchLineStringsToRings(extractAllLines(kml));
    report(id.replace(/-anshei$/, ''), `lines rings=${rings.length}`, ringsToGeometry(rings));
    report(id.replace(/-anshei$/, ''), 'largest', largestRing(rings));
    const soft = stitchLineStringsToRings(extractAllLines(kml), 5e-4);
    report(id.replace(/-anshei$/, ''), `soft rings=${soft.length}`, largestRing(soft));
  } catch (e) {
    console.log('ERR', e.message);
  }
}

// Great Neck soft multi-ring: are they extensions?
{
  console.log('\n=== Great Neck soft rings detail ===');
  const { kml } = await fetchGoogleMyMapsGeometry('1Yp-cRqlZDN8zA_ynPToE3Dm2PLI');
  for (const f of kml.match(/<Folder\b[\s\S]*?<\/Folder>/gi) || []) {
    const name = (f.match(/<name>([^<]*)<\/name>/i)?.[1] || '').trim();
    const soft = stitchLineStringsToRings(extractAllLines(f), 5e-4);
    const g = ringsToGeometry(soft);
    report('us-ny-great-neck', `folder[${name}] rings=${soft.length}`, g);
    report('us-ny-great-neck', `folder[${name}] largest`, largestRing(soft));
  }
}

// Classic msid for anshei / willowbrook
async function tryMs(id, msid) {
  const url = `https://www.google.com/maps/ms?ie=UTF8&msa=0&output=kml&msid=${msid}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'SiddurEruvBoundaryHarvest/1.0' } });
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`\nMS ${id} status=${res.status} bytes=${buf.length}`);
  // maybe kmz
  let text = buf.toString('utf8');
  if (text.startsWith('PK')) {
    const { default: JSZip } = await import('jszip').catch(() => ({ default: null }));
    if (!JSZip) {
      // unzip via powershell? try adm-zip or zlib manually
      console.log('KMZ zip — trying unzip with child_process');
      const fs = await import('fs');
      const os = await import('os');
      const path = await import('path');
      const { execSync } = await import('child_process');
      const tmp = path.join(os.tmpdir(), `eruv-${id}.kmz`);
      fs.writeFileSync(tmp, buf);
      const out = path.join(os.tmpdir(), `eruv-${id}-out`);
      try {
        execSync(`powershell -Command "Expand-Archive -Force '${tmp}' '${out}'"`, {
          stdio: 'pipe',
        });
      } catch {
        // Expand-Archive may need .zip
        const zip = tmp.replace(/\.kmz$/, '.zip');
        fs.copyFileSync(tmp, zip);
        execSync(`powershell -Command "Expand-Archive -Force '${zip}' '${out}'"`, {
          stdio: 'pipe',
        });
      }
      const kmlPath = path.join(out, 'doc.kml');
      if (fs.existsSync(kmlPath)) text = fs.readFileSync(kmlPath, 'utf8');
      else {
        console.log('no doc.kml', fs.readdirSync(out));
        return;
      }
    }
  }
  if (!text.includes('<')) {
    console.log('not kml', text.slice(0, 40));
    return;
  }
  const g = kmlToGeometry(text, { preferBorders: true });
  report(id, 'ms helper', g);
  const soft = stitchLineStringsToRings(extractAllLines(text), 5e-4);
  report(id, `ms soft rings=${soft.length}`, largestRing(soft));
}

await tryMs('us-ny-willowbrook', '105609587994589552250.00045904633f7b0fb9748');
await tryMs('us-ny-west-hempstead', '110408969375922530611.0004478af4cee26e665b2');
