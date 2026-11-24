import { OfflineMaarivService } from '../src/content/siddur/maariv/OfflineMaarivService.ts';

function preview(s) {
  return (s || '')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 110);
}

const sections = OfflineMaarivService.getSections('ashkenaz');
console.log(
  'SECTIONS',
  sections.map((s) => s.key).join(', ')
);

for (const key of ['maariv_shema', 'maariv_amidah', 'maariv_aleinu']) {
  const c = await OfflineMaarivService.getSection(key, { nusach: 'ashkenaz' });
  if (!c) {
    console.log(key, 'NULL');
    continue;
  }
  console.log('\n---', key);
  console.log('beforeKedusha', (c.hebrewBeforeKedushaFoldout || '').length, preview(c.hebrewBeforeKedushaFoldout));
  console.log('beforeModim', (c.hebrewBeforeModimDerabananFoldout || '').length, preview(c.hebrewBeforeModimDerabananFoldout));
  console.log('modimFold', (c.modimDerabananFoldout?.hebrew || '').length, preview(c.modimDerabananFoldout?.hebrew));
  console.log('kedushaFold', (c.kedushaFoldout?.hebrew || '').length, preview(c.kedushaFoldout?.hebrew));
  console.log('main', (c.hebrew || '').length, preview(c.hebrew));
  const display =
    c.hebrewBeforeKedushaFoldout || c.hebrewBeforeModimDerabananFoldout || c.hebrew || '';
  console.log('DISPLAY', preview(display));
  console.log('STARTS_MODIM', /^מודים/.test(preview(display)));
}
