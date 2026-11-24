import { OfflineMaarivService } from '../src/content/siddur/maariv/OfflineMaarivService.ts';
import { OfflineMinchaService } from '../src/content/siddur/mincha/OfflineMinchaService.ts';
import { OfflineShacharitService } from '../src/content/siddur/shacharit/OfflineShacharitService.ts';

function preview(s) {
  return (s || '')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function assertStart(label, text, okRe, badRe) {
  const p = preview(text);
  const ok = okRe.test(p);
  const bad = badRe ? badRe.test(p) : false;
  console.log(label, ok && !bad ? 'OK' : 'FAIL', p);
  if (!ok || bad) process.exitCode = 1;
}

const sections = OfflineMaarivService.getSections('ashkenaz');
console.log('maariv sections', sections.map((s) => s.key).join(', '));

const shema = await OfflineMaarivService.getSection('maariv_shema', { nusach: 'ashkenaz' });
assertStart('maariv_shema', shema?.hebrew, /והוא רחום|ברוך|שמע/, /^מודים/);

const amidah = await OfflineMaarivService.getSection('maariv_amidah', { nusach: 'ashkenaz' });
const display =
  amidah?.hebrewBeforeKedushaFoldout ||
  amidah?.hebrewBeforeModimDerabananFoldout ||
  amidah?.hebrew ||
  '';
assertStart('maariv_amidah display', display, /שפתי תפתח|אלהי אברהם|אבותינו/, /^מודים/);
console.log('  kedusha fold', !!(amidah?.kedushaFoldout?.hebrew || '').trim());
console.log('  modim fold', !!(amidah?.modimDerabananFoldout?.hebrew || '').trim());
console.log('  main start', preview(amidah?.hebrew));
console.log('  has mashiv leftover marker', /\{\{/.test(amidah?.hebrew || ''));

const mincha = await OfflineMinchaService.getSection('mincha_amidah', { nusach: 'ashkenaz' });
const mdisp =
  mincha?.hebrewBeforeKedushaFoldout ||
  mincha?.hebrewBeforeModimDerabananFoldout ||
  mincha?.hebrew ||
  '';
assertStart('mincha_amidah', mdisp, /שפתי תפתח|אלהי אברהם/, /^מודים/);
console.log('  kedusha', !!(mincha?.kedushaFoldout?.hebrew || '').trim());
console.log('  modim', !!(mincha?.modimDerabananFoldout?.hebrew || '').trim());

const shach = await OfflineShacharitService.getSection('amidah', { nusach: 'ashkenaz' });
const sdisp =
  shach?.hebrewBeforeKedushaFoldout ||
  shach?.hebrewBeforeModimDerabananFoldout ||
  shach?.hebrew ||
  '';
assertStart('shacharit amidah', sdisp, /שפתי תפתח|אלהי אברהם/, /^מודים/);

console.log(process.exitCode ? '\nFAILED' : '\nALL OK');
