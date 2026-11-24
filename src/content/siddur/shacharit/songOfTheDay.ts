/**
 * Keep only today's שיר של יום inside a multi-weekday song blob.
 */

const WEEKDAY_SONG_LABELS = [
  'יום ראשון',
  'יום שני',
  'יום שלישי',
  'יום רביעי',
  'יום חמישי',
  'יום ששי',
  'יום שישי',
] as const;

const ENG_WEEKDAY_SONG_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
] as const;

const NEXT_AFTER_SONGS =
  /(?:\{\{gate:[a-z_]+\}\})?(?:ברכי נפשי|לדוד יהוה אורי|עלינו לשבח|אין כאלהינו|קוה אל|יתגדל)/;

function stripNik(s: string): string {
  return s.replace(/[\u0591-\u05C7]/g, '');
}

/** Map nikkud-stripped index → original index. */
function mapFlatToOrig(orig: string): number[] {
  const map: number[] = [];
  for (let i = 0; i < orig.length; i++) {
    if (!/[\u0591-\u05C7]/.test(orig[i])) map.push(i);
  }
  return map;
}

function sliceByFlat(orig: string, flatStart: number, flatEnd: number): string {
  const map = mapFlatToOrig(orig);
  const a = map[Math.max(0, flatStart)] ?? 0;
  const b = flatEnd >= map.length ? orig.length : (map[flatEnd] ?? orig.length);
  return orig.slice(a, b);
}

export function pickSongOfTheDay(hebrew: string, date: Date): string {
  const st = stripNik(hebrew);
  const today = [
    'יום ראשון',
    'יום שני',
    'יום שלישי',
    'יום רביעי',
    'יום חמישי',
    'יום שישי',
    'שבת',
  ][date.getDay()];
  if (!today || today === 'שבת') return hebrew;
  const hits: { label: string; index: number }[] = [];
  for (const label of WEEKDAY_SONG_LABELS) {
    const i = st.indexOf(label);
    if (i !== -1) hits.push({ label, index: i });
  }
  hits.sort((a, b) => a.index - b.index);
  if (hits.length < 2) return hebrew;
  const want = today === 'יום שישי' ? ['יום ששי', 'יום שישי'] : [today];
  const startHit = hits.find((h) => want.includes(h.label));
  if (!startHit) return hebrew;
  const next = hits.find((h) => h.index > startHit.index);
  let flatStart = startHit.index;
  // Prefer "היום יום …" heading when present just before the label
  const before = st.slice(Math.max(0, flatStart - 12), flatStart);
  const hayom = before.lastIndexOf('היום');
  if (hayom >= 0) flatStart = Math.max(0, flatStart - 12) + hayom;

  const flatEnd = next ? next.index : st.length;
  const slice = sliceByFlat(hebrew, flatStart, flatEnd).trim();
  return slice || hebrew;
}

export function pickSongOfTheDayEnglish(english: string, date: Date): string {
  if (!english?.trim()) return english;
  const day = date.getDay();
  if (day === 6) return english;
  const today = ENG_WEEKDAY_SONG_LABELS[day];
  const hits: { label: string; index: number }[] = [];
  for (const label of ENG_WEEKDAY_SONG_LABELS) {
    const re = new RegExp(`\\b(?:On\\s+)?${label}\\b|\\b${label}\\s*(?:'s)?\\s*(?:Psalm|Song)`, 'i');
    const m = english.match(re);
    if (m?.index != null) hits.push({ label, index: m.index });
  }
  hits.sort((a, b) => a.index - b.index);
  if (hits.length < 2) return english;
  const startHit = hits.find((h) => h.label === today);
  if (!startHit) return english;
  const next = hits.find((h) => h.index > startHit.index);
  return english.slice(startHit.index, next ? next.index : english.length).trim() || english;
}

/**
 * Replace the multi-day song region in concluding prayers with today's song only.
 * Preserves Aleinu / Barchi / LeDavid / surrounding text.
 */
export function applySongOfTheDayToConcluding(
  hebrew: string,
  english: string,
  date: Date
): { hebrew: string; english: string } {
  let h = hebrew;
  let e = english;
  const st = stripNik(h);
  const hits: number[] = [];
  for (const label of WEEKDAY_SONG_LABELS) {
    const i = st.indexOf(label);
    if (i !== -1) hits.push(i);
  }
  hits.sort((a, b) => a - b);
  if (hits.length >= 2) {
    let flatStart = hits[0];
    const before = st.slice(Math.max(0, flatStart - 12), flatStart);
    const hayom = before.lastIndexOf('היום');
    if (hayom >= 0) flatStart = Math.max(0, flatStart - 12) + hayom;

    const last = hits[hits.length - 1];
    const afterLast = st.slice(last);
    // Allow optional {{gate:…}} before the next major block (Barchi / LeDavid / Aleinu)
    let endRel = afterLast.search(new RegExp(String.raw`\n\s*\n` + NEXT_AFTER_SONGS.source));
    if (endRel < 0) {
      endRel = afterLast.search(NEXT_AFTER_SONGS);
    }
    const flatEnd = endRel >= 0 ? last + endRel : st.length;

    const map = mapFlatToOrig(h);
    const oStart = map[flatStart] ?? 0;
    const oEnd = flatEnd >= map.length ? h.length : (map[flatEnd] ?? h.length);
    const block = h.slice(oStart, oEnd);
    const picked = pickSongOfTheDay(block, date);
    h = (h.slice(0, oStart) + picked + '\n\n' + h.slice(oEnd)).replace(/\n{3,}/g, '\n\n').trim();
  }

  if (e?.trim() && /\bSunday\b/i.test(e) && /\bMonday\b/i.test(e)) {
    const ep = e.split(/\n\s*\n/);
    const eOut: string[] = [];
    let touched = false;
    for (const p of ep) {
      const isSong =
        /\bSunday\b/i.test(p) && /\bMonday\b/i.test(p) && /Psalm|Song|Levi/i.test(p);
      if (isSong) {
        eOut.push(pickSongOfTheDayEnglish(p, date));
        touched = true;
      } else {
        eOut.push(p);
      }
    }
    if (touched) e = eOut.join('\n\n');
  }

  return { hebrew: h, english: e };
}
