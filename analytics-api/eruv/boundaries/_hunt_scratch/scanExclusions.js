import { fetchGoogleMyMapsGeometry } from '../kmlToGeojson.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8'),
);

const EX =
  /exclu|karfef|karpaf|hole|gap|not in|outside|water|stream|pond|lake\b|internal|carve/i;

const withMid = Object.entries(manifest.entries).filter(
  ([, e]) => e.status === 'ready' && e.googleMyMapsMid,
);

const hits = [];
for (const [id, e] of withMid) {
  try {
    const { kml, kmlBytes } = await fetchGoogleMyMapsGeometry(e.googleMyMapsMid, {
      preferBorders: false,
    });
    const pms = kml.match(/<Placemark[\s\S]*?<\/Placemark>/gi) || [];
    const excl = [];
    let innerBoundaryCount = (kml.match(/<innerBoundaryIs/gi) || []).length;
    for (const pm of pms) {
      const name = (pm.match(/<name>([^<]*)<\/name>/i)?.[1] || '').trim();
      const hasPoly = /<Polygon\b/i.test(pm);
      const hasLine = /<LineString\b/i.test(pm);
      if (EX.test(name)) excl.push({ name, hasPoly, hasLine });
    }
    if (excl.length || innerBoundaryCount) {
      hits.push({
        id,
        mid: e.googleMyMapsMid,
        kmlBytes,
        innerBoundaryCount,
        exclCount: excl.length,
        exclNames: excl.map((x) => x.name).slice(0, 12),
      });
      console.log(
        id,
        `innerKML=${innerBoundaryCount}`,
        `namedExcl=${excl.length}`,
        excl
          .map((x) => x.name)
          .slice(0, 8)
          .join(' | '),
      );
    }
  } catch (err) {
    console.log(id, 'ERR', err.message);
  }
}

fs.writeFileSync(
  path.join(__dirname, 'exclusion_hits.json'),
  JSON.stringify(hits, null, 2),
);
console.log('\nTOTAL with exclusions', hits.length, 'of', withMid.length);
