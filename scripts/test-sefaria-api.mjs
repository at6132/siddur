#!/usr/bin/env node
/**
 * Test script for Sefaria API – find which ref format and endpoint actually work.
 * Run: node scripts/test-sefaria-api.mjs
 */

const SEFARIA_V3 = 'https://www.sefaria.org/api/v3/texts';
const SEFARIA_LEGACY = 'https://www.sefaria.org/api/texts';

const REFS_TO_TEST = [
  'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Modeh Ani',
  'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Netilat Yadayim',
  'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Korbanot',
  'Siddur Ashkenaz, Weekday, Shacharit, Blessings of the Shema',
  'Siddur Ashkenaz, Weekday, Shacharit, Blessings of the Shema, Shema',
  'Siddur Ashkenaz, Weekday, Shacharit, Amidah',
  'Siddur Ashkenaz, Weekday, Shacharit, Post Amidah, Tachanun',
  'Siddur Ashkenaz, Weekday, Shacharit, Concluding Prayers, Alenu',
  // Child refs we use for container nodes
  'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Korbanot, Kiyor',
  'Siddur Ashkenaz, Weekday, Shacharit, Blessings of the Shema, Barchu',
  'Siddur Ashkenaz, Weekday, Shacharit, Amidah, Patriarchs',
  'Siddur Ashkenaz, Weekday, Shacharit, Post Amidah, Tachanun, Nefilat Apayim',
  'Psalms.23',
];

function encodings(ref) {
  const period = ref.replace(/, /g, '.');
  const underscore = ref.replace(/ /g, '_');
  return [
    { name: 'comma (spaces)', value: ref },
    { name: 'period', value: period },
    { name: 'underscore', value: underscore },
  ];
}

async function fetchOnce(url, label) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 200);
    }
    return { status: res.status, url: res.url, body, ok: res.ok };
  } catch (err) {
    return { status: 'ERR', url, body: err.message, ok: false };
  }
}

async function main() {
  console.log('=== Sefaria API test ===\n');

  // 1) Try index/links endpoint to discover structure
  console.log('1) Trying to get Siddur Ashkenaz index/table of contents...');
  const indexUrls = [
    `${SEFARIA_V3}/Siddur_Ashkenaz`,
    `${SEFARIA_LEGACY}/index/Siddur_Ashkenaz`,
    'https://www.sefaria.org/api/index/Siddur_Ashkenaz',
  ];
  for (const url of indexUrls) {
    const r = await fetchOnce(url, url);
    console.log(`   ${r.status} ${url}`);
    if (r.ok && r.body && typeof r.body === 'object') {
      const keys = Object.keys(r.body).slice(0, 15);
      console.log('   Keys:', keys.join(', '));
      if (r.body.schema?.titles) console.log('   Titles:', r.body.schema.titles);
    }
  }

  console.log('\n2) Testing ref formats (v3 and legacy) for a few refs...\n');

  for (const ref of REFS_TO_TEST.slice(0, 4)) {
    console.log(`--- "${ref}" ---`);
    const encs = encodings(ref);
    for (const { name, value } of encs) {
      const encoded = encodeURIComponent(value);
      const v3Url = `${SEFARIA_V3}/${encoded}`;
      const legUrl = `${SEFARIA_LEGACY}/${encoded}?context=0`;
      const v3 = await fetchOnce(v3Url);
      const leg = await fetchOnce(legUrl);
      const v3Str = v3.ok ? `OK (${v3.status})` : v3.status;
      const legStr = leg.ok ? `OK (${leg.status})` : leg.status;
      console.log(`   ${name}:`);
      console.log(`      v3:    ${v3Str}  ${v3Url}`);
      console.log(`      legacy: ${legStr}  ${legUrl}`);
      if (v3.ok && v3.body && typeof v3.body === 'object') {
        const k = Object.keys(v3.body).filter((x) => x !== 'ref');
        console.log('      v3 response keys:', k.join(', '));
      }
      if (leg.ok && leg.body && typeof leg.body === 'object') {
        const k = Object.keys(leg.body).filter((x) => x !== 'ref');
        console.log('      legacy response keys:', k.join(', '));
      }
    }
    console.log('');
  }

  console.log('3) Testing Psalms (usually works) ...');
  const psalmsRef = 'Psalms.23';
  const r = await fetchOnce(`${SEFARIA_V3}/${encodeURIComponent(psalmsRef)}`);
  console.log(`   ${r.status} ${psalmsRef} => ${r.ok ? 'OK' : 'FAIL'}`);
  if (r.body && typeof r.body === 'object') console.log('   Keys:', Object.keys(r.body).join(', '));

  console.log('\n4) Legacy response shape (he/text) for Modeh Ani ...');
  const leg = await fetch(
    SEFARIA_LEGACY + '/' + encodeURIComponent(REFS_TO_TEST[0]) + '?context=0'
  );
  const legData = await leg.json();
  const hasHe = Array.isArray(legData.he) || typeof legData.he === 'string';
  const hasText = Array.isArray(legData.text) || typeof legData.text === 'string';
  console.log('   has he:', hasHe, 'has text:', hasText);
  if (hasHe) console.log('   he sample:', (legData.he?.[0] ?? legData.he)?.slice?.(0, 80) ?? legData.he);

  console.log('\n5) Child refs (used for container nodes) – legacy comma ...');
  const childRefs = REFS_TO_TEST.slice(-5);
  for (const ref of childRefs) {
    const url = SEFARIA_LEGACY + '/' + encodeURIComponent(ref) + '?context=0';
    const res = await fetch(url);
    const ok = res.ok ? 'OK' : res.status;
    const short = ref.length > 55 ? ref.slice(-50) : ref;
    console.log(`   ${ok}  ...${short}`);
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
