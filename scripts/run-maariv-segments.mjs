import { OfflineMaarivService } from '../src/content/siddur/maariv/OfflineMaarivService.ts';

const c = await OfflineMaarivService.getSection('maariv_amidah', { nusach: 'ashkenaz' });
const segs = c.hebrewSegments || [];
console.log('seg count', segs.length);
let offset = 0;
for (let i = 0; i < segs.length; i++) {
  const s = segs[i];
  const prev = (s.text || '')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 70);
  const modimIn = (s.text || '').replace(/[\u0591-\u05C7]/g, '').indexOf('מודים אנחנו לך');
  console.log(
    i,
    'italic=' + !!s.italic,
    'seasonal=' + !!s.seasonalHighlight,
    'len=' + (s.text || '').length,
    'modimAt=' + modimIn,
    'start=',
    prev
  );
  offset += (s.text || '').length;
}

const firstFull = segs.find((s) => !s.italic && (s.text || '').replace(/[\u0591-\u05C7]/g, '').includes('אלהי אברהם'));
const firstModimFull = segs.find(
  (s) => !s.italic && (s.text || '').replace(/[\u0591-\u05C7]/g, '').includes('מודים אנחנו לך')
);
console.log('\nfirst non-italic with Avot?', !!firstFull, firstFull ? 'yes' : 'NO — Avot may be italic/hidden-looking');
console.log(
  'first non-italic with Modim?',
  !!firstModimFull,
  firstModimFull
    ? (firstModimFull.text || '')
        .replace(/[\u0591-\u05C7]/g, '')
        .replace(/\s+/g, ' ')
        .slice(0, 80)
    : ''
);
