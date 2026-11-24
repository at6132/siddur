import fs from 'fs';

function findMids(s) {
  const mids = new Set();
  for (const m of String(s).matchAll(/[?&]mid=([A-Za-z0-9_-]{10,})/g)) mids.add(m[1]);
  for (const m of String(s).matchAll(/maps\/d\/(?:u\/\d+\/)?(?:embed|viewer|edit)\?mid=([A-Za-z0-9_-]+)/g))
    mids.add(m[1]);
  for (const m of String(s).matchAll(/"mid"\s*:\s*"([A-Za-z0-9_-]+)"/g)) mids.add(m[1]);
  return [...mids];
}

function walkKeys(o, p, keys) {
  if (!o || typeof o !== 'object') return;
  for (const [k, v] of Object.entries(o)) {
    const path = p ? `${p}.${k}` : k;
    if (/mid|geo|bound|map|kml|coord|polygon|source/i.test(k)) {
      keys.push(
        `${path}: ${typeof v === 'string' ? v.slice(0, 120) : Array.isArray(v) ? `array(${v.length})` : typeof v}`,
      );
    }
    if (v && typeof v === 'object') walkKeys(v, path, keys);
  }
}

const urls = [
  'https://eruvhomes.com/eruv/willowbrook-eruv--staten-island',
  'https://eruvhomes.com/eruv/white-plains---scarsdale-eruv',
  'https://eruvhomes.com/eruv/west-orange-eruv',
  'https://eruvhomes.com/eruv/kew-gardens-hills-eruv',
  'https://eruvhomes.com/eruv/sephardic-eruv-of-flatbush',
  'https://eruvhomes.com/eruv/west-hempstead-franklin-square-eruv',
  'https://eruvhomes.com/eruv/hillcrest-eruv',
  'https://eruvhomes.com/eruv/rockland-eruv--monsey',
];

for (const url of urls) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
  });
  const text = await res.text();
  console.log('\n', res.status, url, 'bytes', text.length);
  const nd = text.match(/__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/);
  if (!nd) {
    console.log('no NEXT_DATA', text.slice(0, 150).replace(/\s+/g, ' '));
    continue;
  }
  const j = JSON.parse(nd[1]);
  const slug = url.split('/').pop();
  fs.writeFileSync(`eh-${slug}.json`, JSON.stringify(j, null, 2));
  const s = JSON.stringify(j);
  console.log('mids', findMids(s));
  const keys = [];
  walkKeys(j, '', keys);
  console.log('keys', keys.slice(0, 50));
}
