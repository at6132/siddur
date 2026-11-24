import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..');
const checkedAt = new Date().toISOString();

const remaining = [
  {
    eruvId: 'us-nj-teaneck',
    status: 'pending_digitize',
    sourceType: 'image',
    sourceUrl: 'https://www.tberuv.org/Map.html',
    googleMyMapsMid: null,
    notes:
      'Official Teaneck-Bergenfield map at tberuv.org/Map.html uses GIF image (eruvSmall.gif); no My Maps/KML found',
    geometry: null,
  },
  {
    eruvId: 'us-nj-lakewood',
    status: 'skipped_contested',
    sourceType: 'google_my_maps',
    sourceUrl:
      'https://www.google.com/maps/d/viewer?mid=10Z4OwQcnyTbiplJerWnR31SxRoIWcxJd',
    googleMyMapsMid: '10Z4OwQcnyTbiplJerWnR31SxRoIWcxJd',
    notes:
      'No single communal Lakewood eruv; neighborhood maps (e.g. Eiruv Mehudar mid) exist but reliance is contested by local rabbonim; skip rather than publish as authoritative',
    geometry: null,
  },
  {
    eruvId: 'us-nj-west-orange',
    status: 'pending_digitize',
    sourceType: 'web_map',
    sourceUrl: 'http://westorangeeruv.org/maps/',
    googleMyMapsMid: null,
    notes:
      'Etz Chaim Livingston cites westorangeeruv.org/maps/ as West Orange Eruv map; site DNS failed during harvest; no extractable KML',
    geometry: null,
  },
  {
    eruvId: 'us-ny-sephardic-brooklyn',
    status: 'pending_digitize',
    sourceType: 'image',
    sourceUrl: 'https://www.erub.org/b-our-story',
    googleMyMapsMid: null,
    notes:
      'Official Sephardic Brooklyn Community Erub map page hosts a static JPG map image; no My Maps/KML found',
    geometry: null,
  },
  {
    eruvId: 'us-ny-rockland',
    status: 'pending_digitize',
    sourceType: 'image',
    sourceUrl: 'https://www.rocklanderuv.org/copy-of-about-us',
    googleMyMapsMid: null,
    notes:
      'Rockland Eruv official map page shows JPG map assets (Eruv Map V2.jpg etc.); no My Maps/KML found. Distinct from Eiruv of Monsey Inc.',
    geometry: null,
  },
  {
    eruvId: 'us-ny-washington-heights',
    status: 'skipped_contested',
    sourceType: 'none',
    sourceUrl: 'https://eruv.nyc/',
    googleMyMapsMid: null,
    notes:
      'Lower Washington Heights / YU eruv often treated as separate/contested relative to broader Manhattan Eruv; no reliable standalone official polygon source found',
    geometry: null,
  },
  {
    eruvId: 'us-ny-hillcrest',
    status: 'pending_digitize',
    sourceType: 'pdf',
    sourceUrl:
      'http://yihillcrest.org/wp-content/uploads/2023/06/Eruv-Map-Queens-2023.pdf',
    googleMyMapsMid: null,
    notes: 'Young Israel of Hillcrest publishes Eruv-Map-Queens-2023.pdf (confirmed downloadable)',
    geometry: null,
  },
  {
    eruvId: 'us-ny-kgh',
    status: 'pending_digitize',
    sourceType: 'web_map',
    sourceUrl: 'https://kgheruv.com/',
    googleMyMapsMid: null,
    notes:
      'Official Kew Gardens Hills Eruv Committee site (kgheruv.com) posts map/guide; site returned 403 to harvest bot; Etz Chaim KGH also links Download Map (KGHERUV.jpg path 404). Street-side text boundaries exist but not digitized here',
    geometry: null,
  },
  {
    eruvId: 'us-ny-west-hempstead',
    status: 'pending_digitize',
    sourceType: 'image',
    sourceUrl:
      'https://images.shulcloud.com/71/uploads/Eruv-Map/westhempsteaderuv2025november_Page_2.png',
    googleMyMapsMid: null,
    notes:
      'Young Israel of West Hempstead eruv map PNG on ShulCloud (Nov 2025); no My Maps/KML found',
    geometry: null,
  },
  {
    eruvId: 'us-ny-white-plains',
    status: 'pending_digitize',
    sourceType: 'pdf',
    sourceUrl:
      'https://images.shulcloud.com/493/uploads/Eruv-Map/White-Plains-Scarsdale-NY-Eruv.pdf',
    googleMyMapsMid: null,
    notes: 'White Plains / Scarsdale Eruv PDF on ShulCloud (confirmed application/pdf)',
    geometry: null,
  },
];

for (const rec of remaining) {
  const record = { ...rec, checkedAt };
  fs.writeFileSync(path.join(outDir, `${rec.eruvId}.json`), JSON.stringify(record, null, 2));
}

// Build summary from all inbox JSON files
const files = fs
  .readdirSync(outDir)
  .filter((f) => f.endsWith('.json') && f !== '_summary.json' && !f.startsWith('_'));

const counts = {
  batch: 'ne',
  ready: 0,
  pending_digitize: 0,
  not_found: 0,
  skipped_contested: 0,
  eruvIdsReady: [],
};

for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'));
  if (j.status === 'ready') {
    counts.ready += 1;
    counts.eruvIdsReady.push(j.eruvId);
  } else if (j.status === 'pending_digitize') counts.pending_digitize += 1;
  else if (j.status === 'not_found') counts.not_found += 1;
  else if (j.status === 'skipped_contested') counts.skipped_contested += 1;
}

counts.eruvIdsReady.sort();
fs.writeFileSync(path.join(outDir, '_summary.json'), JSON.stringify(counts, null, 2));
console.log(JSON.stringify({ files: files.length, ...counts }, null, 2));
