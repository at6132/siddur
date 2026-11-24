import fs from 'fs';
import { fetchGoogleMyMapsGeometry } from './kmlToGeojson.js';

function summary(id, geom, notes = '') {
  if (!geom) {
    console.log(id, 'NO GEOM', notes);
    return;
  }
  let minLng = 1e9;
  let maxLng = -1e9;
  let minLat = 1e9;
  let maxLat = -1e9;
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
  console.log(
    id,
    geom.type,
    `pts~${n}`,
    `lng ${minLng.toFixed(4)}..${maxLng.toFixed(4)}`,
    `lat ${minLat.toFixed(4)}..${maxLat.toFixed(4)}`,
    notes,
  );
}

const ids = [
  'us-ny-great-neck',
  'us-ny-willowbrook',
  'us-ca-los-angeles',
  'us-fl-hollywood',
  'us-fl-miami-beach',
  'us-fl-surfside-33154',
  'us-mi-detroit',
  'us-wi-milwaukee-east',
  'us-wi-bayside',
  'us-nj-highland-park',
  'us-nj-new-brunswick',
  'us-tx-dallas-south',
  'us-oh-columbus',
  'us-or-portland',
  'us-ny-manhattan',
  'us-ny-flatbush',
  'us-oh-cleveland',
  'us-tx-houston',
];

for (const id of ids) {
  for (const b of ['ne', 'midatlantic', 'southmidwest', 'west']) {
    const p = `./inbox/${b}/${id}.json`;
    if (!fs.existsSync(p)) continue;
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    summary(id, j.geometry, `mid=${j.googleMyMapsMid || '-'}`);
  }
}

console.log('\n--- refetch LA mid ---');
try {
  const r = await fetchGoogleMyMapsGeometry('zYmwzOmdimqc.kGkzVPziAJ4o');
  summary('LA-live', r.geometry, `bytes=${r.kmlBytes}`);
} catch (e) {
  console.log('LA mid fail', e.message);
}

console.log('\n--- refetch Great Neck mid ---');
try {
  const r = await fetchGoogleMyMapsGeometry('1Yp-cRqlZDN8zA_ynPToE3Dm2PLI');
  summary('GN-live', r.geometry, `bytes=${r.kmlBytes}`);
  const g = r.geometry;
  const ring = g?.type === 'Polygon' ? g.coordinates[0] : g?.coordinates?.[0]?.[0];
  console.log('GN ring', JSON.stringify(ring));
} catch (e) {
  console.log('GN mid fail', e.message);
}

console.log('\n--- Miami Beach KML placemark names ---');
const mid = '1XhSNBTYm0pkAkbe7SfBZnTkULJ3G3r0U';
const url = `https://www.google.com/maps/d/kml?mid=${encodeURIComponent(mid)}&forcekml=1`;
const kml = await (await fetch(url)).text();
const names = [...kml.matchAll(/<name>([^<]*)<\/name>/g)].map((m) => m[1]);
console.log(names.slice(0, 50));
console.log('kmlBytes', kml.length);

console.log('\n--- Milwaukee shared mid names ---');
const mid2 = '1a-dkKWmPhOmTQzLBNUnouqHK9GRRDKkN';
const kml2 = await (
  await fetch(`https://www.google.com/maps/d/kml?mid=${encodeURIComponent(mid2)}&forcekml=1`)
).text();
console.log([...kml2.matchAll(/<name>([^<]*)<\/name>/g)].map((m) => m[1]).slice(0, 40));

console.log('\n--- Hollywood FL mid names ---');
const mid3 = '1t9xuHT25PAvglbzCeDCCSW9aJ2hhVig';
const kml3 = await (
  await fetch(`https://www.google.com/maps/d/kml?mid=${encodeURIComponent(mid3)}&forcekml=1`)
).text();
console.log([...kml3.matchAll(/<name>([^<]*)<\/name>/g)].map((m) => m[1]).slice(0, 40));
summary('hollywood-live', (await fetchGoogleMyMapsGeometry(mid3)).geometry);

console.log('\n--- Detroit mid names ---');
const mid4 = '1NZzCc9LzaJY87iTRVX-uDDTV_Dk';
const kml4 = await (
  await fetch(`https://www.google.com/maps/d/kml?mid=${encodeURIComponent(mid4)}&forcekml=1`)
).text();
console.log([...kml4.matchAll(/<name>([^<]*)<\/name>/g)].map((m) => m[1]).slice(0, 40));
