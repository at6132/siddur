import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inboxDir = path.resolve(__dirname, '../..');
const checkedAt = new Date().toISOString();

// Keep potomac ready; bump checkedAt only
const potomacPath = path.join(inboxDir, 'us-md-potomac.json');
const potomac = JSON.parse(fs.readFileSync(potomacPath, 'utf8'));
if (potomac.status !== 'ready' || !potomac.geometry) {
  throw new Error('us-md-potomac expected ready with geometry');
}
potomac.checkedAt = checkedAt;
potomac.notes =
  'Potomac Eruv polygon from classic Google Maps KMZ (msid=114741809335544004305.0004930b5864817250f67) linked from blog.historian4hire.net/2010/10/20/mapping-moco-eruvim (Oct 2010 MoCo eruvim compilation). Matches YIEIP triangle (I-270 / Falls / Bells Mill / Democracy / Westlake). Eruv Homes lists no mapped boundary / no mid. YIEIP notes later local tweaks; no newer My Maps/GeoJSON found. KMZ re-verified.';
fs.writeFileSync(potomacPath, JSON.stringify(potomac, null, 2) + '\n');

const pending = {
  'us-ct-new-haven.json': {
    eruvId: 'us-ct-new-haven',
    status: 'pending_digitize',
    sourceType: 'pdf',
    sourceUrl: 'http://www.nheruv.net/wp-content/uploads/2015/05/eruvannot1.pdf',
    googleMyMapsMid: null,
    notes:
      'Best source: annotated PDF on nheruv.net/eruv-maps (also combined Yale/NH PDF). Eruv Homes: no mapped boundary / no mid. No My Maps, KML, leaflet, or GeoJSON found.',
    checkedAt,
    geometry: null,
  },
  'us-dc-shepherd-park.json': {
    eruvId: 'us-dc-shepherd-park',
    status: 'pending_digitize',
    sourceType: 'pdf',
    sourceUrl:
      'https://www.wsat.org/wp-content/uploads/2019/11/SHEPHERD_PARK_WOODSIDE_ERUV_NOV_2019.pdf',
    googleMyMapsMid: null,
    notes:
      'Best source: 2019 combined PDF (wsat.org / ohevdc.org). Also raster JPG on wsat.org/eruv (2025/07/eruv_map_with_markings). MoCo 2010 KMZ Woodside layer is pre-combined/incomplete. mikeolkin leaflet KML is Longmeadow, not SP. No My Maps mid / GeoJSON.',
    checkedAt,
    geometry: null,
  },
  'us-pa-germantown.json': {
    eruvId: 'us-pa-germantown',
    status: 'pending_digitize',
    sourceType: 'pdf',
    sourceUrl:
      'https://germantownjewishcentre.org/wp-content/uploads/2024/05/boundary042523_wo-ZIP.pdf',
    googleMyMapsMid: null,
    notes:
      'Best source: official GJC Map PDF. Philly Legistar 240282 attachments are bill text (street table), no map exhibit/GIS. No My Maps / KML / leaflet / GeoJSON found.',
    checkedAt,
    geometry: null,
  },
};

for (const [name, obj] of Object.entries(pending)) {
  fs.writeFileSync(path.join(inboxDir, name), JSON.stringify(obj, null, 2) + '\n');
  console.log('wrote', name, obj.status);
}
console.log('kept us-md-potomac ready');

const entries = fs
  .readdirSync(inboxDir)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(inboxDir, f), 'utf8')));

const ready = entries.filter((e) => e.status === 'ready').map((e) => e.eruvId).sort();
const pend = entries
  .filter((e) => e.status === 'pending_digitize')
  .map((e) => e.eruvId)
  .sort();
const notFound = entries.filter((e) => e.status === 'not_found').map((e) => e.eruvId).sort();

const summary = {
  batch: 'midatlantic',
  ready: ready.length,
  pending_digitize: pend.length,
  not_found: notFound.length,
  skipped_contested: 0,
  eruvIdsReady: ready,
  eruvIdsPending: pend,
  eruvIdsNotFound: notFound,
  checkedAt,
  total: entries.length,
};
fs.writeFileSync(path.join(inboxDir, '_summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      outcomes: {
        'us-md-potomac': 'ready (kept; MoCo classic KMZ)',
        'us-ct-new-haven': 'pending_digitize (PDF)',
        'us-dc-shepherd-park': 'pending_digitize (PDF+JPG raster)',
        'us-pa-germantown': 'pending_digitize (PDF)',
      },
      tally4: { ready: 1, pending_digitize: 3, not_found: 0 },
      promoted: [],
      batch: summary,
    },
    null,
    2,
  ),
);
