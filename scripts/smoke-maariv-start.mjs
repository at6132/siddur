/**
 * Diagnose Maariv amidah start (expects Avot / Shema, not Modim).
 * Run: node scripts/smoke-maariv-start.mjs
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

function stripNikkud(s) {
  return s.replace(/[\u0591-\u05C7]/g, '');
}

async function loadTs(rel) {
  // Prefer compiled-free dynamic import via tsx register if available
  const require = createRequire(import.meta.url);
  try {
    require('tsx/cjs');
  } catch {
    /* ignore */
  }
  const abs = path.join(root, rel);
  return import(pathToFileURL(abs).href);
}

function preview(s, n = 100) {
  return stripNikkud((s || '').replace(/\s+/g, ' ')).slice(0, n);
}

async function main() {
  const { OfflineMaarivService } = await loadTs('src/content/siddur/maariv/OfflineMaarivService.ts');
  const sections = OfflineMaarivService.getSections('ashkenaz');
  console.log('SECTIONS', sections.map((s) => s.key).join(', '));

  for (const key of ['maariv_shema', 'maariv_amidah', 'maariv_aleinu']) {
    const c = await OfflineMaarivService.getSection(key, { nusach: 'ashkenaz' });
    if (!c) {
      console.log(key, 'NULL');
      continue;
    }
    console.log('\n---', key);
    console.log('beforeKedushaLen', (c.hebrewBeforeKedushaFoldout || '').length);
    console.log('beforeModimLen', (c.hebrewBeforeModimDerabananFoldout || '').length);
    console.log('modimFoldLen', (c.modimDerabananFoldout?.hebrew || '').length);
    console.log('mainLen', (c.hebrew || '').length);
    console.log('beforeKedushaStart', preview(c.hebrewBeforeKedushaFoldout));
    console.log('beforeModimStart', preview(c.hebrewBeforeModimDerabananFoldout));
    console.log('modimFoldStart', preview(c.modimDerabananFoldout?.hebrew));
    console.log('mainStart', preview(c.hebrew));
    const displayStart =
      c.hebrewBeforeKedushaFoldout ||
      c.hebrewBeforeModimDerabananFoldout ||
      c.hebrew ||
      '';
    console.log('displayStart', preview(displayStart));
    const stripped = stripNikkud(displayStart);
    console.log('startsWithAvot', /^(בריך|אלהי|אדני|ברוך\s+אתה\s+ה\s+אלהינו\s+ואלהי\s+אבותינו)/.test(stripped.slice(0, 80).replace(/\s+/g, ' ').trim()) || /אלהינו ואלהי אבותינו/.test(stripped.slice(0, 200)));
    console.log('startsNearModim', /^מודים/.test(stripped.trim()) || stripped.trim().startsWith('מודים'));
  }

  // Raw pack peek
  const rawPath = path.join(root, 'src/content/siddur/maariv/ashkenaz/raw.ts');
  const raw = fs.readFileSync(rawPath, 'utf8');
  for (const key of ['maariv_shema', 'maariv_amidah']) {
    const re = new RegExp(`${key}:\\s*\\{[\\s\\S]*?hebrew:\\s*\`([\\s\\S]*?)\``);
    const m = raw.match(re);
    console.log('\nRAW', key, 'len', m ? m[1].length : 0, 'start', preview(m?.[1] || '', 80));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
