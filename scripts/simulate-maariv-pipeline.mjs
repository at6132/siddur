/**
 * Run Maariv amidah extract pipeline without hebcal/calendar deps.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve('c:/Users/avita/siddur-1');
const require = createRequire(import.meta.url);
try {
  require('tsx/cjs/api').register();
} catch {
  try {
    require('tsx/cjs');
  } catch {
    /* */
  }
}

function loadRaw(nusach) {
  const t = fs.readFileSync(
    path.join(root, `src/content/siddur/maariv/${nusach}/raw.ts`),
    'utf8'
  );
  const re =
    /"maariv_amidah"\s*:\s*\{\s*"key"\s*:\s*"maariv_amidah"\s*,\s*"hebrew"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"english"\s*:\s*"((?:\\.|[^"\\])*)"/;
  const m = t.match(re);
  if (!m) throw new Error('no amidah ' + nusach);
  const unescape = (s) =>
    s
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\');
  return { hebrew: unescape(m[1]), english: unescape(m[2]) };
}

function strip(s) {
  return (s || '').replace(/[\u0591-\u05C7]/g, '').replace(/\s+/g, ' ').trim();
}

async function main() {
  const rulesPath = path.join(root, 'src/services/MinchaTextRules.ts');
  const rules = await import(pathToFileURL(rulesPath).href);
  const pipelinePath = path.join(root, 'src/services/AmidahTextPipeline.ts');
  let pipeline;
  try {
    pipeline = await import(pathToFileURL(pipelinePath).href);
  } catch (e) {
    console.warn('pipeline import failed', e.message);
  }

  for (const nusach of ['ashkenaz', 'sefard']) {
    let { hebrew, english } = loadRaw(nusach);
    console.log('\n====', nusach, 'raw start:', strip(hebrew).slice(0, 80));

    if (pipeline?.applyWeekdayAmidahTextPipeline) {
      const piped = pipeline.applyWeekdayAmidahTextPipeline(hebrew, english, {
        date: new Date(),
        israelForRainInsertion: false,
        amidahSlot: 'maariv',
        policy: { rainInsertion: 'diaspora', yaalehVeyavo: true },
      });
      hebrew = piped.hebrew;
      english = piped.english;
      console.log('after pipeline start:', strip(hebrew).slice(0, 80), 'len', hebrew.length);
    }

    const titles = rules.removeParagraphTitles(
      hebrew,
      english,
      rules.AMIDAH_BRACHA_TITLES
    );
    hebrew = titles.hebrew;
    english = titles.english;

    const kedushaSplit = rules.extractAmidahKedushaFoldout(hebrew, english);
    const avosBlob = `${kedushaSplit.mainHebrewBeforeFoldout || ''}\n${kedushaSplit.mainHebrew || ''}`;
    const kedushaSplitKeepsAvos = /מגן\s+אברהם/.test(
      avosBlob.replace(/[\u0591-\u05C7]/g, '')
    );
    console.log('kedusha found', !!(kedushaSplit.kedushaHebrew || '').trim());
    console.log('kedusha keepsAvos', kedushaSplitKeepsAvos);
    console.log('beforeKedusha start', strip(kedushaSplit.mainHebrewBeforeFoldout).slice(0, 60));
    console.log('main after kedusha start', strip(kedushaSplit.mainHebrew).slice(0, 60));
    console.log('kedusha block start', strip(kedushaSplit.kedushaHebrew).slice(0, 60));

    if (kedushaSplitKeepsAvos) {
      hebrew = kedushaSplit.mainHebrew;
      english = kedushaSplit.mainEnglish;
    }

    const modimSplit = rules.extractModimDerabananFoldout(hebrew, english);
    console.log('modim foldout', !!(modimSplit.foldoutHebrew || '').trim());
    console.log('modim prefix start', strip(modimSplit.prefixHebrew).slice(0, 60));
    console.log('modim fold start', strip(modimSplit.foldoutHebrew).slice(0, 60));
    console.log('modim suffix start', strip(modimSplit.suffixHebrew).slice(0, 60));
    console.log('prefix len', (modimSplit.prefixHebrew || '').length);
    console.log('suffix len', (modimSplit.suffixHebrew || '').length);

    const displayStart = kedushaSplitKeepsAvos
      ? kedushaSplit.mainHebrewBeforeFoldout || hebrew
      : modimSplit.foldoutHebrew
        ? modimSplit.prefixHebrew || hebrew
        : hebrew;
    console.log('DISPLAY START:', strip(displayStart).slice(0, 100));
    console.log(
      'starts at Modim?',
      /^מודים/.test(strip(displayStart)) ||
        (!strip(kedushaSplit.mainHebrewBeforeFoldout || '') &&
          !strip(modimSplit.prefixHebrew || '') &&
          /^מודים/.test(strip(hebrew)))
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
