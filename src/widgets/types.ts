/**
 * Serializable props pushed into iOS home-screen widgets via updateSnapshot.
 * Widget UI files must not import this module into the `'widget'` function body —
 * keep values as plain props only.
 */

export type NextZmanProps = {
  label: string;
  time: string;
  countdown: string;
};

export type HebrewDateProps = {
  hebrewDate: string;
  jewishDateShort: string;
  badge: string;
};

export type TehillimStreakProps = {
  streak: number;
  percentComplete: number;
  subtitle: string;
};

export type CandlesProps = {
  title: string;
  time: string;
  countdown: string;
  mode: 'candles' | 'havdalah' | 'idle';
};

export type OmerBrachosProps = {
  mode: 'omer' | 'brachos';
  title: string;
  value: string;
  subtitle: string;
};

export type DailyInspirationProps = {
  hebrew: string;
  translation: string;
  source: string;
};

export type ZmanimStripProps = {
  sunrise: string;
  shema: string;
  sunset: string;
};

export type DaveningNoteProps = {
  message: string;
  detail: string;
};

export type TehillimTodayProps = {
  completed: number;
  total: number;
  percentComplete: number;
  nextPerek: string;
  dayName: string;
};

export type ShabbosTimesProps = {
  candles: string;
  havdalah: string;
  parsha: string;
};

export type DaySheetProps = {
  hebrewDate: string;
  gregorianLabel: string;
  specialDay: string;
  daveningNote: string;
  sunrise: string;
  shema: string;
  sunset: string;
  tzeis: string;
  parsha: string;
};

export type PracticeHubProps = {
  tehillimPercent: number;
  tehillimLabel: string;
  daveningStreak: number;
  brachosCount: number;
  brachosCap: number;
  goalsCompleted: number;
  goalsTotal: number;
};

export type SeasonalBoardProps = {
  mode: 'shabbos' | 'fast' | 'omer' | 'default';
  title: string;
  line1: string;
  line2: string;
  line3: string;
  detail: string;
  progressPercent: number;
};
