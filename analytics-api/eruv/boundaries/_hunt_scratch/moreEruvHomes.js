/** Scrape more Eruv Homes slug variants for remaining hard IDs. */
import { fetchGoogleMyMapsGeometry } from '../kmlToGeojson.js';
import { US_ERUV_CATALOG_SEED } from '../../catalogSeed.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity,
    n = 0;
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      minLng = Math.min(minLng, c[0]);
      maxLng = Math.max(maxLng, c[0]);
      minLat = Math.min(minLat, c[1]);
      maxLat = Math.max(maxLat, c[1]);
      n++;
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

const slugs = [
  ['us-ny-willowbrook', 'ne', 'willowbrook-eruv--staten-island'],
  ['us-ny-willowbrook', 'ne', 'willowbrook-eruv'],
  ['us-ny-white-plains', 'ne', 'white-plains---scarsdale-eruv'],
  ['us-ny-rockland', 'ne', 'rockland-eruv--monsey'],
  ['us-ny-sephardic-brooklyn', 'ne', 'sephardic-brooklyn-eruv'],
  ['us-ny-sephardic-brooklyn', 'ne', 'sephardic-brooklyn-community-erub'],
  ['us-ny-hillcrest', 'ne', 'hillcrest-eruv'],
  ['us-il-buffalo-grove', 'southmidwest', 'chicago---buffalo-grove-eruv'],
  ['us-oh-beachwood-east', 'southmidwest', 'beachwood-east-eruv-society'],
  ['us-oh-beachwood-east', 'southmidwest', 'beachwood-east-eruv'],
  ['us-fl-boca', 'southmidwest', 'east-boca-eruv'],
  ['us-fl-boca', 'southmidwest', 'boca-raton-community-eruv'],
  ['us-mn-st-louis-park', 'southmidwest', 'st-louis-park-minneapolis-eruv'],
  ['us-mn-st-louis-park', 'southmidwest', 'minneapolis-st-louis-park-eruv'],
  ['us-il-west-rogers-park', 'southmidwest', 'west-rogers-park-eruv'],
  ['us-il-chicago-south-side', 'southmidwest', 'chicago-south-side-eruv'],
  ['us-nc-durham', 'southmidwest', 'durham-eruv'],
  ['us-dc-shepherd-park', 'midatlantic', 'shepherd-park-eruv'],
  ['us-dc-shepherd-park', 'midatlantic', 'shepherd-park---woodside-eruv'],
  ['us-ct-new-haven', 'midatlantic', 'new-haven-eruv'],
  ['us-pa-germantown', 'midatlantic', 'germantown-jewish-centre-eruv'],
  ['us-md-potomac', 'midatlantic', 'potomac-eruv'],
  ['us-ca-la-jolla', 'west', 'la-jolla-eruv'],
  ['us-ca-la-jolla', 'west', 'adat-yeshurun-eruv'],
];

for (const [id, batch, slug] of slugs) {
  const url = `https://eruvhomes.com/eruv/${slug}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = await res.text();
    const mids = [...new Set([...html.matchAll(/mid=([A-Za-z0-9_-]{15,})/g)].map((m) => m[1]))];
    console.log(`${res.status} ${id} ${slug} mids=${mids.join(',') || '-'}`);
    for (const mid of mids) {
      const cat = byId[id];
      const { geometry, sourceUrl, kmlBytes } = await fetchGoogleMyMapsGeometry(mid, {
        preferBorders: true,
      });
      if (!geometry) {
        console.log('  no geom');
        continue;
      }
      const st = geomStats(geometry);
      const dist = cat
        ? haversineKm({ lat: cat.latitude, lng: cat.longitude }, { lat: st.cy, lng: st.cx })
        : null;
      console.log(
        `  ${geometry.type} pts=${st.n} diag=${st.diag.toFixed(2)} dist=${dist?.toFixed(2)} kml=${kmlBytes}`,
      );
      if (st.diag < 1 || st.n < 12 || (dist != null && dist > 40)) {
        console.log('  SKIP quality');
        continue;
      }
      // Don't promote Miami-style mega maps accidentally — diag cap 20km for these
      if (st.diag > 20) {
        console.log('  SKIP huge');
        continue;
      }
      const payload = {
        eruvId: id,
        status: 'ready',
        sourceType: 'google_my_maps',
        sourceUrl: sourceUrl || `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`,
        googleMyMapsMid: mid,
        notes: `HARD HUNT 2026-11-20: From eruvhomes.com/eruv/${slug} mid=${mid}. pts=${st.n} diag=${st.diag.toFixed(1)}km.`,
        checkedAt: new Date().toISOString(),
        geometry,
      };
      fs.writeFileSync(
        path.join(inboxRoot, batch, `${id}.json`),
        JSON.stringify(payload, null, 2) + '\n',
      );
      console.log('  WROTE ready', id);
    }
  } catch (e) {
    console.log('ERR', slug, e.message);
  }
}
