import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inboxDir = path.resolve(__dirname, '../..');
const checkedAt = new Date().toISOString();

const potomacGeom = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'Potomac_Eruv.json'), 'utf8'),
);

const files = {
  'us-md-potomac.json': {
    eruvId: 'us-md-potomac',
    status: 'ready',
    sourceType: 'kml',
    sourceUrl:
      'https://maps.google.com/maps/ms?ie=UTF8&msa=0&output=kml&msid=114741809335544004305.0004930b5864817250f67',
    googleMyMapsMid: null,
    notes:
      'Potomac Eruv polygon from classic Google Maps KMZ (msid=114741809335544004305.0004930b5864817250f67) linked from blog.historian4hire.net/2010/10/20/mapping-moco-eruvim (Oct 2010 MoCo eruvim compilation). Matches YIEIP triangle description (I-270 / Falls / Bells Mill / Democracy / Westlake). YIEIP notes later local tweaks (Falls Rd fence, Wooten/7-Locks); no newer My Maps/GeoJSON found.',
    checkedAt,
    geometry: potomacGeom,
  },
  'us-dc-shepherd-park.json': {
    eruvId: 'us-dc-shepherd-park',
    status: 'pending_digitize',
    sourceType: 'pdf',
    sourceUrl:
      'https://www.wsat.org/wp-content/uploads/2019/11/SHEPHERD_PARK_WOODSIDE_ERUV_NOV_2019.pdf',
    googleMyMapsMid: null,
    notes:
      'Shepherd Park / Woodside Combined Eruv official PDF (Nov 2019) via wsat.org / ohevdc.org/eruv. MoCo 2010 classic Maps KMZ has a Woodside-only polygon (pre-combined; incomplete for current DC+MD footprint). mikeolkin/leaflet-eruv-map EruvBounds.kml is Longmeadow MA, not this eruv. No My Maps mid / GeoJSON found.',
    checkedAt,
    geometry: null,
  },
  'us-ct-new-haven.json': {
    eruvId: 'us-ct-new-haven',
    status: 'pending_digitize',
    sourceType: 'pdf',
    sourceUrl:
      'http://www.nheruv.net/wp-content/uploads/2015/05/eruvannot1.pdf',
    googleMyMapsMid: null,
    notes:
      'Annotated PDF on nheruv.net/eruv-maps; combined Yale/NH PDF on nheruv.net/yale-new-haven-maps. No Google My Maps / KML / leaflet / GeoJSON embed found on nheruv.net.',
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
      'Official GJC boundary PDF from germantownjewishcentre.org/gjc-eruv/. Philly ordinance 240282 has street-segment table (text only). No My Maps / KML / leaflet / GeoJSON found.',
    checkedAt,
    geometry: null,
  },
};

for (const [name, obj] of Object.entries(files)) {
  const out = path.join(inboxDir, name);
  fs.writeFileSync(out, JSON.stringify(obj, null, 2) + '\n');
  console.log('wrote', name, obj.status, obj.geometry ? `geom=${obj.geometry.type}` : 'no geom');
}

// Update _summary.json from all inbox json files (exclude _*)
const entries = fs
  .readdirSync(inboxDir)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(inboxDir, f), 'utf8')));

const ready = entries.filter((e) => e.status === 'ready').map((e) => e.eruvId).sort();
const pending = entries
  .filter((e) => e.status === 'pending_digitize')
  .map((e) => e.eruvId)
  .sort();
const notFound = entries.filter((e) => e.status === 'not_found').map((e) => e.eruvId).sort();
const contested = entries
  .filter((e) => e.status === 'skipped_contested')
  .map((e) => e.eruvId)
  .sort();

const summary = {
  batch: 'midatlantic',
  ready: ready.length,
  pending_digitize: pending.length,
  not_found: notFound.length,
  skipped_contested: contested.length,
  eruvIdsReady: ready,
  eruvIdsPending: pending,
  eruvIdsNotFound: notFound,
  checkedAt,
  total: entries.length,
};
if (contested.length) summary.eruvIdsContested = contested;

fs.writeFileSync(path.join(inboxDir, '_summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log('summary', summary);
console.log('promoted', ['us-md-potomac']);
