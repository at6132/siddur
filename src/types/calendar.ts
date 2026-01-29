/**
 * Calendar and zmanim types
 */

import { Nusach } from './nusach';

export interface Zmanim {
  shacharis: Date;
  mincha: Date;
  maariv: Date;
  shabbosStart: Date | null;
  shabbosEnd: Date | null;
  candleLighting: Date | null;
}

export interface DaveningChanges {
  hallel: boolean;
  anenu: boolean;
  tachanun: boolean;
  yaalehVeyavo: boolean;
}

export interface SpiritualCue {
  text: string;
  type: 'tehillim' | 'renewal' | 'reflection' | 'gratitude' | 'other';
}

export interface DayInfo {
  jewishDate: string; // Format: "15 Nisan 5784"
  jewishDateShort: string; // Format: "15 Nisan"
  gregorianDate: Date;
  isShabbos: boolean;
  isYomTov: boolean;
  isFastDay: boolean;
  isCholHamoed: boolean;
  parsha?: string;
  holiday?: string;
  zmanim: Zmanim;
  daveningChanges: DaveningChanges;
  spiritualCue?: SpiritualCue;
  omerDay?: number; // 1-49, undefined if not Omer period
}

export interface CalendarContext {
  nusach: Nusach;
  location?: {
    latitude: number;
    longitude: number;
  };
}

