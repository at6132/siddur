/**
 * Last prayer reading session — powers the continue-reading MiniPlayer.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@last_prayer_session';
/** Drop sessions older than this (days). */
const MAX_AGE_DAYS = 14;

export type PrayerServiceId =
  | 'shacharis'
  | 'mincha'
  | 'maariv'
  | 'brachos'
  | 'shabbos'
  | 'bentching'
  | 'bedtime'
  | 'shema'
  | 'modeh_ani'
  | 'tefilas_haderech'
  | 'asher_yatzar'
  | string;

export interface LastPrayerSession {
  service: PrayerServiceId;
  sectionKey?: string;
  /** 0–1 scroll progress through the reader content. */
  progress: number;
  titleEnglish: string;
  titleHebrew: string;
  updatedAt: number;
}

export const PRAYER_SERVICE_TITLES: Record<string, { english: string; hebrew: string }> = {
  shacharis: { english: 'Shacharis', hebrew: 'שחרית' },
  mincha: { english: 'Mincha', hebrew: 'מנחה' },
  maariv: { english: 'Maariv', hebrew: 'מעריב' },
  brachos: { english: 'Brachos', hebrew: 'ברכות' },
  shabbos: { english: 'Shabbos', hebrew: 'שבת' },
  bentching: { english: 'Bentching', hebrew: 'ברכת המזון' },
  bedtime: { english: 'Bedtime Shema', hebrew: 'קריאת שמע על המטה' },
  shema: { english: 'Shema', hebrew: 'קריאת שמע' },
  modeh_ani: { english: 'Modeh Ani', hebrew: 'מודה אני' },
  tefilas_haderech: { english: 'Tefillas HaDerech', hebrew: 'תפילת הדרך' },
  asher_yatzar: { english: 'Asher Yatzar', hebrew: 'אשר יצר' },
};

function isFresh(session: LastPrayerSession): boolean {
  const ageMs = Date.now() - session.updatedAt;
  return ageMs < MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

export class LastPrayerSessionService {
  static async get(): Promise<LastPrayerSession | null> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as LastPrayerSession;
      if (!session?.service || typeof session.progress !== 'number') return null;
      if (!isFresh(session)) {
        await this.clear();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  static async save( partial: {
    service: PrayerServiceId;
    sectionKey?: string;
    progress: number;
    titleEnglish?: string;
    titleHebrew?: string;
  }): Promise<void> {
    const titles = PRAYER_SERVICE_TITLES[partial.service] ?? {
      english: partial.service,
      hebrew: '',
    };
    const session: LastPrayerSession = {
      service: partial.service,
      sectionKey: partial.sectionKey,
      progress: Math.max(0, Math.min(1, partial.progress)),
      titleEnglish: partial.titleEnglish ?? titles.english,
      titleHebrew: partial.titleHebrew ?? titles.hebrew,
      updatedAt: Date.now(),
    };
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('LastPrayerSessionService.save error:', e);
    }
  }

  static async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
}
