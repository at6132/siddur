/**
 * Pirkei Avos Service
 * Fetches today's/this Shabbos's Pirkei Avos chapter from Hebcal (dpa=on).
 * Pirkei Avot is read one chapter per Shabbos between Pesach and Rosh Hashanah.
 */

export interface PirkeiAvosChapter {
  perek: number;
  /** Display text e.g. "Perek 3" */
  displayText: string;
}

/**
 * Get Pirkei Avos chapter for the nearest Shabbos (this Shabbos or last).
 * Fetches from Hebcal API with dpa=on.
 */
export async function getPirkeiAvosForDate(date: Date): Promise<PirkeiAvosChapter | null> {
  try {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const start = new Date(date);
    start.setDate(start.getDate() - 7);
    const end = new Date(date);
    end.setDate(end.getDate() + 7);
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    const res = await fetch(
      `https://www.hebcal.com/hebcal?cfg=json&v=1&dpa=on&start=${startStr}&end=${endStr}`
    );
    const data = await res.json();
    const items = data?.items ?? [];
    const paItems = items.filter(
      (e: { category?: string }) => e.category === 'pirkeiAvotSummer'
    );
    if (paItems.length === 0) return null;
    const todayStr = dateStr;
    const upcoming = paItems.find((e: { date?: string }) => (e.date || '') >= todayStr);
    const pa = upcoming ?? paItems[paItems.length - 1];
    if (!pa?.title) return null;
    const title = String(pa.title).trim();
    const perekMatch = title.match(/(\d+)/);
    const perek = perekMatch ? parseInt(perekMatch[1], 10) : null;
    if (perek == null || perek < 1 || perek > 6) return null;
    return {
      perek,
      displayText: `Perek ${perek}`,
    };
  } catch {
    return null;
  }
}

export function getTodayPirkeiAvos(): Promise<PirkeiAvosChapter | null> {
  return getPirkeiAvosForDate(new Date());
}
