/**
 * Shneyim Mikra VeChad Targum Service
 * Fetches parsha + aliyah verse ranges from Hebcal for the upcoming Shabbos.
 * One aliyah per day: Sun=1, Mon=2, ..., Sat=7.
 */

export interface AliyahRef {
  aliyah: number;
  ref: string; // e.g. "Exodus 6:2-6:13"
}

export interface ShneyimMikraData {
  parsha: string;
  parshaHebrew: string;
  aliyot: AliyahRef[];
  /** 1-7 for Sun-Sat */
  todayAliyah: number;
  todayRef: string | null;
}

/** Get day of week: 0=Sun -> aliyah 1, 6=Sat -> aliyah 7 */
function getTodayAliyahIndex(): number {
  const day = new Date().getDay(); // 0=Sun, 6=Sat
  return Math.min(day + 1, 7); // 1-7
}

/**
 * Fetch this week's parsha and aliyot from Hebcal.
 */
export async function getShneyimMikraData(): Promise<ShneyimMikraData | null> {
  try {
    // Get upcoming Shabbos (same logic as JewishCalendar)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
    const daysUntilShabbos = dayOfWeek === 6 ? 0 : 6 - dayOfWeek;
    const shabbosDate = new Date(now);
    shabbosDate.setDate(now.getDate() + daysUntilShabbos);
    const y = shabbosDate.getFullYear();
    const m = String(shabbosDate.getMonth() + 1).padStart(2, '0');
    const d = String(shabbosDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const res = await fetch(
      `https://www.hebcal.com/hebcal?cfg=json&v=1&s=on&leyning=on&start=${dateStr}&end=${dateStr}`
    );
    const data = await res.json();
    const item = data?.items?.find((e: { category?: string }) => e.category === 'parashat');
    if (!item?.leyning) return null;

    const leyning = item.leyning as Record<string, string>;
    const aliyot: AliyahRef[] = [];
    for (let i = 1; i <= 7; i++) {
      const ref = leyning[String(i)];
      if (ref) aliyot.push({ aliyah: i, ref });
    }

    const todayAliyah = getTodayAliyahIndex();
    const todayEntry = aliyot.find((a) => a.aliyah === todayAliyah);
    const parsha = (item.title || '').replace(/^Parashat\s+/i, '').trim();
    const parshaHebrew = item.hebrew || '';

    return {
      parsha,
      parshaHebrew,
      aliyot,
      todayAliyah,
      todayRef: todayEntry?.ref ?? aliyot[0]?.ref ?? null,
    };
  } catch {
    return null;
  }
}
