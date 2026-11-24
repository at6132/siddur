import fs from 'fs';
import { kmlToGeometry } from '../../../../kmlToGeojson.js';

const kml = fs.readFileSync(new URL('./moco_kmz/doc.kml', import.meta.url), 'utf8');

function extractPlacemark(kmlText, name) {
  const placemarks = kmlText.match(/<Placemark\b[\s\S]*?<\/Placemark>/gi) || [];
  return placemarks.find((pm) => {
    const m = pm.match(/<name>([^<]*)<\/name>/i);
    return (m?.[1] || '').trim() === name;
  }) || null;
}

for (const name of ['Potomac Eruv', 'Woodside Eruv']) {
  const pm = extractPlacemark(kml, name);
  console.log('===', name, 'found', !!pm, 'bytes', pm?.length);
  if (!pm) continue;
  const geom = kmlToGeometry(`<kml>${pm}</kml>`, { preferBorders: false });
  const ring =
    geom?.type === 'Polygon'
      ? geom.coordinates[0]
      : geom?.type === 'MultiPolygon'
        ? geom.coordinates[0][0]
        : null;
  if (!ring) {
    console.log('no ring', geom);
    continue;
  }
  const lngs = ring.map((c) => c[0]);
  const lats = ring.map((c) => c[1]);
  console.log({
    type: geom.type,
    n: ring.length,
    bbox: {
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
    },
    sample: ring.slice(0, 3),
  });
  fs.writeFileSync(
    new URL(`./${name.replace(/\s+/g, '_')}.json`, import.meta.url),
    JSON.stringify(geom),
  );
}
