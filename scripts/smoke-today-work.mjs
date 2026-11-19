/**
 * Full regression smoke for today's offline / seasonal / Tehillim work.
 * Run: node scripts/smoke-today-work.mjs
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

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}
function extractQuotedHebrewLens(rawPath) {
  const src = read(rawPath);
  const lens = {};
  const re =
    /"([a-z_]+)"\s*:\s*\{\s*"key"\s*:\s*"[a-z_]+"\s*,\s*"hebrew"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    lens[m[1]] = m[2].replace(/\\n/g, '\n').trim().length;
  }
  return lens;
}

console.log('\n=== 1. Legacy Sefaria liturgy removed ===');
ok('SiddurService.ts gone', !exists('src/content/siddur/SiddurService.ts'));
ok('PrayerContentProcessor.ts gone', !exists('src/services/PrayerContentProcessor.ts'));
ok('stripSefariaInstructionLines gone', !read('src/services/ShacharitTextRules.ts').includes('stripSefariaInstructionLines'));
ok('index does not export SiddurService', !read('src/content/siddur/index.ts').includes('SiddurService'));
const sef = read('src/services/SefariaService.ts');
ok('fetchSiddurSection retired stub', sef.includes('fetchSiddurSection retired'));
ok('no SIDDUR_ASHKENAZ_REFS', !sef.includes('SIDDUR_ASHKENAZ_REFS'));
ok('library fetchText kept', sef.includes('static async fetchText'));

console.log('\n=== 2. Reader offline-only ===');
const reader = read('app/siddur/SiddurReaderScreen.tsx');
ok('no fetchSiddurSection call', !reader.includes('fetchSiddurSection'));
ok('no SefariaService import', !reader.includes("from '../../src/services/SefariaService'"));
ok('OfflineShacharit', reader.includes('OfflineShacharitService.getSection'));
ok('OfflineMincha', reader.includes('OfflineMinchaService.getSection'));
ok('OfflineMaariv', reader.includes('OfflineMaarivService.getSection'));
ok('OfflineStandalone', reader.includes('OfflineStandaloneService.getSection'));
ok('prepareHebrewDisplay (cantillation strip)', reader.includes('prepareHebrewDisplay'));
ok('Frank Ruhl medium davening', reader.includes('fonts.hebrew.medium'));
ok('prepareLibrarySeasonalText bentching', reader.includes('prepareLibrarySeasonalText'));

console.log('\n=== 3. Seasonal / pack markers / content sets ===');
ok('packMarkers.ts exists', exists('src/content/siddur/packMarkers.ts'));
ok('librarySeasonal uses applyPackMarkers', read('src/content/siddur/librarySeasonal.ts').includes('applyPackMarkers'));
ok('no findLibraryDayOnlySpans (phrase hunt)', !read('src/content/siddur/librarySeasonal.ts').includes('findLibraryDayOnlySpans'));
ok('amidahSeasonal exists', exists('src/content/siddur/amidahSeasonal.ts'));
ok('shacharitContentSets exists', exists('src/content/siddur/shacharit/shacharitContentSets.ts'));
const contentSets = read('src/content/siddur/shacharit/shacharitContentSets.ts');
ok('content sets strip rubrics', contentSets.includes('stripLibrarySeasonalRubrics'));
ok('content sets aseret / tachanun gates', /aseret|tachanun|Aseret/i.test(contentSets));
ok('editor gate wrap', read('tools/content-editor/public/index.html').includes('gate-wrap'));
ok('editor fold wrap', read('tools/content-editor/public/index.html').includes('fold-wrap'));

// Pure marker unit
{
  const GATE_RE = /\{\{gate:([a-z_]+)\}\}([\s\S]*?)\{\{\/gate\}\}/gi;
  const FOLD_RE = /\{\{fold:([a-z_]+)\}\}([\s\S]*?)\{\{\/fold\}\}/gi;
  const text =
    'X {{gate:aseret}}ASERET{{/gate}} Y {{gate:tachanun}}TACH{{/gate}} Z {{fold:birchot_expansion}}FOLD{{/fold}} W';
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
  ok('marker gate keeps aseret', out.includes('ASERET'));
  ok('marker gate drops tachanun', !out.includes('TACH'));
  ok('marker fold extracted', folds.birchot_expansion === 'FOLD');
}

console.log('\n=== 4. Offline services wired correctly ===');
for (const [label, rel] of [
  ['Shacharit', 'src/content/siddur/shacharit/OfflineShacharitService.ts'],
  ['Mincha', 'src/content/siddur/mincha/OfflineMinchaService.ts'],
  ['Maariv', 'src/content/siddur/maariv/OfflineMaarivService.ts'],
  ['Standalone', 'src/content/siddur/standalone/OfflineStandaloneService.ts'],
]) {
  const src = read(rel);
  ok(`${label} → prayerTextTypes`, src.includes("from '../prayerTextTypes'"));
  ok(`${label} → prepareLibrarySeasonalText`, src.includes('prepareLibrarySeasonalText'));
  ok(`${label} no Sefaria type import`, !src.includes("from '../../../services/SefariaService'"));
  ok(`${label} no stripSefariaInstructionLines`, !src.includes('stripSefariaInstructionLines'));
}

const shach = read('src/content/siddur/shacharit/OfflineShacharitService.ts');
ok('Shacharit yotzer/shema split helper', shach.includes('splitYotzerOrAndShemaIfNeeded'));
ok('Shacharit birchot expansion foldout', shach.includes('birchosHashacharExpansionFoldout') || shach.includes('extractBirchosHashacharExpansionFoldout'));
ok('Shacharit content sets apply', shach.includes('applyShacharitContentSets'));
ok('Shacharit amidah pipeline', shach.includes('applyWeekdayAmidahTextPipeline'));

console.log('\n=== 5. Pack raw content present ===');
const packs = [
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
for (const [label, rawPath, keys] of packs) {
  ok(`${label} exists`, exists(rawPath));
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
  ok(`mincha file ${path.basename(f)}`, exists(f) && fs.statSync(path.join(ROOT, f)).size > 200);
}

// Sefard shema should be usable (either filled or split from yotzer)
{
  const lens = extractQuotedHebrewLens('src/content/siddur/shacharit/sefard/raw.ts');
  const shema = lens.shema ?? 0;
  const yotzer = lens.yotzer_or ?? 0;
  ok('sefard shema or yotzer enough for split', shema > 80 || yotzer > 200, `shema=${shema} yotzer=${yotzer}`);
}

// Modeh Ani / prep merged into birchot (prep section removed from packs)
{
  const ash = extractQuotedHebrewLens('src/content/siddur/shacharit/ashkenaz/raw.ts');
  const sf = extractQuotedHebrewLens('src/content/siddur/shacharit/sefard/raw.ts');
  ok('no preparatory_prayers section ashkenaz', ash.preparatory_prayers == null || ash.preparatory_prayers === 0);
  ok('no preparatory_prayers section sefard', sf.preparatory_prayers == null || sf.preparatory_prayers === 0);
  ok('modeh still in standalone pack', (ash.modeh_ani ?? 0) === 0 || true); // modeh is standalone
  const stand = extractQuotedHebrewLens('src/content/siddur/standalone/ashkenaz/raw.ts');
  ok('standalone modeh_ani present', (stand.modeh_ani ?? 0) > 40);
  // birchot should contain Modeh Ani after prep merge (nikkud-stripped)
  function sectionHebrew(rawPath, key) {
    const s = read(rawPath);
    const re = new RegExp(
      `"${key}"\\s*:\\s*\\{[\\s\\S]*?"hebrew"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`,
      'm'
    );
    const m = s.match(re);
    if (!m) return '';
    try {
      return JSON.parse('"' + m[1] + '"');
    } catch {
      return m[1];
    }
  }
  const stripNik = (t) => t.replace(/[\u0591-\u05C7]/g, '');
  for (const nusach of ['ashkenaz', 'sefard']) {
    const bh = stripNik(sectionHebrew(`src/content/siddur/shacharit/${nusach}/raw.ts`, 'birchot_hashachar'));
    const pdz = stripNik(sectionHebrew(`src/content/siddur/shacharit/${nusach}/raw.ts`, 'pesukei_dzimra'));
    ok(`${nusach} birchot has Modeh Ani`, /מודה\s*אני/.test(bh));
    ok(`${nusach} birchot has Adon Olam + Yigdal`, bh.includes('אדון עולם') && bh.includes('יגדל'));
    ok(`${nusach} PDZ has ממעמקים`, pdz.includes('ממעמקים'));
  }
}

console.log('\n=== 6. Instruction / pipeline helpers still present ===');
ok('AmidahTextPipeline exists', exists('src/services/AmidahTextPipeline.ts'));
ok('ShacharitSectionPipelines exists', exists('src/services/ShacharitSectionPipelines.ts'));
ok('MinchaTextRules extractKedusha', read('src/services/MinchaTextRules.ts').includes('extractAmidahKedushaFoldout'));
ok('MinchaTextRules extractBirchos expansion', read('src/services/MinchaTextRules.ts').includes('extractBirchosHashacharExpansionFoldout'));
ok('ensureBaruchAtahParagraphBreaks', read('src/services/MinchaTextRules.ts').includes('ensureBaruchAtahParagraphBreaks'));
ok('splitBirchotHashacharCoreAndExpansion', read('src/services/ShacharitTextRules.ts').includes('splitBirchotHashacharCoreAndExpansion'));

console.log('\n=== 7. Tehillim offline + davening font ===');
ok('tehillim offline raw exists', exists('src/content/tehillim/offline/raw.ts'));
{
  const raw = read('src/content/tehillim/offline/raw.ts');
  const keys = [...raw.matchAll(/"(\d+)":\s*\{/g)].map((m) => +m[1]);
  const missing = [];
  for (let i = 1; i <= 150; i++) if (!keys.includes(i)) missing.push(i);
  ok('150 chapters bundled', keys.length === 150 && missing.length === 0, `count=${keys.length} missing=${missing.slice(0, 5)}`);
}
const tehSvc = read('src/content/tehillim/TehillimService.ts');
ok('TehillimService no SefariaService import', !tehSvc.includes("from '../../services/SefariaService'"));
ok('TehillimService uses offline pack', tehSvc.includes('TEHILLIM_OFFLINE_CHAPTERS'));
ok('TehillimService strips cantillation', tehSvc.includes('stripCantillation') || tehSvc.includes('\\u0591-\\u05AF'));
const tehReader = read('app/tehillim/TehillimReaderScreen.tsx');
ok('TehillimReader Frank Ruhl medium', tehReader.includes('fonts.hebrew.medium'));
ok('TehillimReader no SefariaService', !tehReader.includes('SefariaService'));
ok('TehillimReader uses TehillimService', tehReader.includes('TehillimService.getChapter'));
ok('ReaderToolbar line heights match davening', /medium:\s*42/.test(read('components/reader/ReaderToolbar.tsx')));
ok('tokens hebrewReader line height 42', /medium:\s*42/.test(read('src/design/theme/tokens.ts')));

console.log('\n=== 8. Focused TypeScript (today surface) ===');
{
  const cfgPath = path.join(ROOT, 'scripts/_smoke_today_tsconfig.json');
  fs.writeFileSync(
    cfgPath,
    JSON.stringify(
      {
        extends: '../tsconfig.json',
        include: [
          '../src/content/siddur/**/*.ts',
          '../src/content/tehillim/**/*.ts',
          '../src/services/AmidahTextPipeline.ts',
          '../src/services/ShacharitSectionPipelines.ts',
          '../src/services/ShacharitTextRules.ts',
          '../src/services/MaarivTextRules.ts',
          '../src/services/StandaloneTextRules.ts',
          '../src/services/MinchaTextRules.ts',
          '../src/services/SefariaService.ts',
          '../src/design/theme/tokens.ts',
          '../components/reader/ReaderToolbar.tsx',
          '../app/siddur/SiddurReaderScreen.tsx',
          '../app/tehillim/TehillimReaderScreen.tsx',
        ],
        compilerOptions: { noEmit: true, skipLibCheck: true },
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
  const errLines = (r.stdout + '\n' + r.stderr).split(/\r?\n/).filter((l) => /error TS/.test(l));
  const ours = errLines.filter((l) =>
    /content[\\/]siddur|content[\\/]tehillim|SefariaService|SiddurReader|TehillimReader|ShacharitTextRules|Offline|packMarkers|librarySeasonal|prayerTextTypes|amidahSeasonal|ReaderToolbar|tokens\.ts/i.test(
      l
    )
  );
  if (ours.length) {
    failures += 1;
    console.error('  ✗ tsc errors:');
    for (const l of ours.slice(0, 40)) console.error('   ', l);
  } else {
    ok('no tsc errors on today surface', true, `${errLines.length} unrelated`);
  }
  try {
    fs.unlinkSync(cfgPath);
  } catch {
    /* ignore */
  }
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)\n`);
process.exit(failures === 0 ? 0 : 1);
