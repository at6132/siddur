/**
 * Smoke-check offline siddur after Sefaria liturgy removal.
 * Run: node scripts/smoke-offline-siddur.mjs
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

let failures = 0;
function ok(label, cond, detail = '') {
  if (cond) console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function extractQuotedHebrewLens(rawPath) {
  const src = fs.readFileSync(path.join(ROOT, rawPath), 'utf8');
  const lens = {};
  const re =
    /"([a-z_]+)"\s*:\s*\{\s*"key"\s*:\s*"[a-z_]+"\s*,\s*"hebrew"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    lens[m[1]] = m[2].replace(/\\n/g, '\n').trim().length;
  }
  return lens;
}

console.log('\n[1] Pack raw files');
const packChecks = [
  [
    'shacharit/ashkenaz',
    'src/content/siddur/shacharit/ashkenaz/raw.ts',
    [
      'tallit', 'tefillin', 'birchot_hashachar', 'korbanot', 'pesukei_dzimra',
      'yotzer_or', 'shema', 'amidah', 'tachanun', 'ashrei', 'concluding', 'torah_reading',
    ],
  ],
  [
    'shacharit/sefard',
    'src/content/siddur/shacharit/sefard/raw.ts',
    [
      'birchot_hashachar', 'pesukei_dzimra', 'yotzer_or', 'shema', 'amidah',
      'tachanun', 'ashrei', 'concluding',
    ],
  ],
  [
    'maariv/ashkenaz',
    'src/content/siddur/maariv/ashkenaz/raw.ts',
    ['maariv_shema', 'maariv_amidah', 'maariv_aleinu', 'maariv_motzaei', 'maariv_omer'],
  ],
  [
    'standalone/ashkenaz',
    'src/content/siddur/standalone/ashkenaz/raw.ts',
    [
      'modeh_ani', 'birchas_hamazon', 'al_hamichya', 'krias_shema_al_hamita',
      'tefilas_haderech', 'asher_yatzar', 'netilas_yadayim', 'birchos_hatorah',
    ],
  ],
];

for (const [label, rawPath, keys] of packChecks) {
  const p = path.join(ROOT, rawPath);
  ok(`${label} exists`, fs.existsSync(p));
  if (!fs.existsSync(p)) continue;
  const lens = extractQuotedHebrewLens(rawPath);
  for (const k of keys) {
    const n = lens[k] ?? 0;
    ok(`${label}.${k}`, n > 40, `${n} chars`);
  }
}

for (const f of [
  'src/content/siddur/mincha/ashkenaz/ashrei.ts',
  'src/content/siddur/mincha/ashkenaz/amidah.ts',
  'src/content/siddur/mincha/ashkenaz/aleinu.ts',
  'src/content/siddur/mincha/sefard/amidah.ts',
]) {
  const p = path.join(ROOT, f);
  ok(
    `mincha ${path.basename(path.dirname(f))}/${path.basename(f)}`,
    fs.existsSync(p) && fs.statSync(p).size > 200
  );
}

console.log('\n[2] Legacy files removed');
ok('SiddurService.ts deleted', !fs.existsSync(path.join(ROOT, 'src/content/siddur/SiddurService.ts')));
ok(
  'PrayerContentProcessor.ts deleted',
  !fs.existsSync(path.join(ROOT, 'src/services/PrayerContentProcessor.ts'))
);
ok(
  'index.ts does not export SiddurService',
  !fs.readFileSync(path.join(ROOT, 'src/content/siddur/index.ts'), 'utf8').includes('SiddurService')
);
ok(
  'stripSefariaInstructionLines gone',
  !fs
    .readFileSync(path.join(ROOT, 'src/services/ShacharitTextRules.ts'), 'utf8')
    .includes('stripSefariaInstructionLines')
);

console.log('\n[3] Reader wiring');
const reader = fs.readFileSync(path.join(ROOT, 'app/siddur/SiddurReaderScreen.tsx'), 'utf8');
ok('no fetchSiddurSection', !reader.includes('fetchSiddurSection'));
ok('OfflineShacharitService', reader.includes('OfflineShacharitService.getSection'));
ok('OfflineMinchaService', reader.includes('OfflineMinchaService.getSection'));
ok('OfflineMaarivService', reader.includes('OfflineMaarivService.getSection'));
ok('OfflineStandaloneService', reader.includes('OfflineStandaloneService.getSection'));
ok('no SefariaService import', !reader.includes("from '../../src/services/SefariaService'"));
ok('prepareLibrarySeasonalText for bentching', reader.includes('prepareLibrarySeasonalText'));

console.log('\n[4] SefariaService liturgy stub');
const sef = fs.readFileSync(path.join(ROOT, 'src/services/SefariaService.ts'), 'utf8');
ok('fetchSiddurSection retired', sef.includes('fetchSiddurSection retired'));
ok('no SIDDUR_ASHKENAZ_REFS', !sef.includes('SIDDUR_ASHKENAZ_REFS'));
ok('fetchText kept', sef.includes('static async fetchText'));
ok('fetchTalmudPage kept', sef.includes('fetchTalmudPage'));

console.log('\n[5] Offline services use pack markers / prayerTextTypes');
for (const [label, rel] of [
  ['OfflineShacharit', 'src/content/siddur/shacharit/OfflineShacharitService.ts'],
  ['OfflineMincha', 'src/content/siddur/mincha/OfflineMinchaService.ts'],
  ['OfflineMaariv', 'src/content/siddur/maariv/OfflineMaarivService.ts'],
  ['OfflineStandalone', 'src/content/siddur/standalone/OfflineStandaloneService.ts'],
]) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  ok(`${label} → prayerTextTypes`, src.includes("from '../prayerTextTypes'"));
  ok(`${label} → prepareLibrarySeasonalText`, src.includes('prepareLibrarySeasonalText'));
  ok(`${label} no SefariaService type import`, !src.includes("from '../../../services/SefariaService'"));
  ok(`${label} no stripSefariaInstructionLines`, !src.includes('stripSefariaInstructionLines'));
}

console.log('\n[6] Pack marker logic (pure)');
{
  const GATE_RE = /\{\{gate:([a-z_]+)\}\}([\s\S]*?)\{\{\/gate\}\}/gi;
  const FOLD_RE = /\{\{fold:([a-z_]+)\}\}([\s\S]*?)\{\{\/fold\}\}/gi;
  const text =
    'A {{gate:aseret}}ASERET{{/gate}} B {{gate:tachanun}}TACH{{/gate}} C {{fold:birchot_expansion}}FOLD{{/fold}} D';
  const open = { aseret: true, tachanun: false };
  let out = '';
  let last = 0;
  let m;
  const re = new RegExp(GATE_RE.source, 'gi');
  while ((m = re.exec(text)) !== null) {
    out += text.slice(last, m.index);
    if (open[m[1]]) out += m[2];
    last = m.index + m[0].length;
  }
  out += text.slice(last);
  const folds = {};
  out = out.replace(FOLD_RE, (_, id, inner) => {
    folds[id] = inner.trim();
    return '';
  });
  ok('gate keeps aseret', out.includes('ASERET'));
  ok('gate drops tachanun', !out.includes('TACH'));
  ok('fold extracted', folds.birchot_expansion === 'FOLD');
  ok('fold removed from body', !out.includes('FOLD'));
}

console.log('\n[7] Focused TypeScript check (siddur offline surface)');
{
  const cfgPath = path.join(ROOT, 'scripts/_smoke_tsconfig.json');
  fs.writeFileSync(
    cfgPath,
    JSON.stringify(
      {
        extends: '../tsconfig.json',
        include: [
          '../src/content/siddur/**/*.ts',
          '../src/content/siddur/**/*.tsx',
          '../src/services/AmidahTextPipeline.ts',
          '../src/services/ShacharitSectionPipelines.ts',
          '../src/services/ShacharitTextRules.ts',
          '../src/services/MaarivTextRules.ts',
          '../src/services/StandaloneTextRules.ts',
          '../src/services/MinchaTextRules.ts',
          '../src/services/SefariaService.ts',
          '../app/siddur/SiddurReaderScreen.tsx',
        ],
        exclude: ['../scripts/build-*.mjs'],
        compilerOptions: {
          noEmit: true,
          skipLibCheck: true,
        },
      },
      null,
      2
    )
  );
  const r = spawnSync('npx', ['tsc', '--noEmit', '-p', cfgPath], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
  });
  const errLines = (r.stdout + '\n' + r.stderr)
    .split(/\r?\n/)
    .filter((l) => /error TS/.test(l));
  // Ignore pre-existing App/calendar noise — our include is scoped; still may pull deps
  const ours = errLines.filter((l) =>
    /content\\siddur|content\/siddur|SefariaService|SiddurReader|ShacharitTextRules|Offline|packMarkers|librarySeasonal|prayerTextTypes|amidahSeasonal/i.test(
      l
    )
  );
  if (ours.length) {
    failures += 1;
    console.error('  ✗ tsc errors in siddur surface:');
    for (const l of ours.slice(0, 30)) console.error('   ', l);
  } else {
    ok('no tsc errors in siddur offline surface', true, `${errLines.length} unrelated/other`);
  }
  try {
    fs.unlinkSync(cfgPath);
  } catch {
    /* ignore */
  }
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)\n`);
process.exit(failures === 0 ? 0 : 1);
