import { CalendarEngine } from '../core/calendar/CalendarEngine';
import { JewishCalendarService } from '../core/calendar/JewishCalendar';
import { ZmanimService } from '../core/zmanim/ZmanimService';
import { getByDay100, INSPIRATION_QUOTES } from '../content/HomeWidgetContent';
import { UserPreferencesService } from '../storage/UserPreferences';
import { DailyTehillimTracker } from '../storage/DailyTehillimTracker';
import { getDaveningStreak } from '../storage/DaveningStreakService';
import { getBrachosCount } from '../storage/BrachosCounterService';
import { DailyGoalsService } from '../storage/DailyGoalsService';
import { OmerCalculator } from '../core/omer/OmerCalculator';
import type {
  CandlesProps,
  DailyInspirationProps,
  DaveningNoteProps,
  DaySheetProps,
  HebrewDateProps,
  NextZmanProps,
  OmerBrachosProps,
  PracticeHubProps,
  SeasonalBoardProps,
  ShabbosTimesProps,
  TehillimStreakProps,
  TehillimTodayProps,
  ZmanimStripProps,
} from './types';

const BRACHOS_CAP = 100;

function formatCountdown(until: Date, now: Date): string {
  const mins = Math.max(0, Math.floor((until.getTime() - now.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function daveningMessage(dayInfo: Awaited<ReturnType<typeof CalendarEngine.getDayInfo>>): {
  message: string;
  detail: string;
} {
  const dc = dayInfo.daveningChanges;
  if (dc?.hallel) {
    return {
      message: `${dc.hallel === 'full' ? 'Full' : 'Half'} Hallel today`,
      detail: dc.reason || dayInfo.holiday || dayInfo.jewishDateShort,
    };
  }
  if (dc?.tachanun === false) {
    return {
      message: 'No Tachanun today',
      detail: dc.reason || dayInfo.holiday || dayInfo.jewishDateShort,
    };
  }
  if (dc?.yaalehVeyavo) {
    return {
      message: 'Yaaleh Veyavo today',
      detail: dc.reason || dayInfo.holiday || 'Rosh Chodesh / Moed',
    };
  }
  if (dc?.alHanissim) {
    return {
      message: 'Al Hanissim today',
      detail: dc.reason || dayInfo.holiday || '',
    };
  }
  if (dc?.reason) {
    return { message: dc.reason, detail: dayInfo.jewishDateShort };
  }
  return {
    message: 'Regular davening today',
    detail: dayInfo.parsha ? `Parsha ${dayInfo.parsha}` : dayInfo.jewishDateShort,
  };
}

function pickNextZman(
  dayInfo: Awaited<ReturnType<typeof CalendarEngine.getDayInfo>>,
  now: Date
): NextZmanProps {
  const ext = dayInfo.extendedZmanim;
  const candidates: { label: string; at: Date | null | undefined }[] = [
    { label: 'Sof Zman Shema', at: ext?.sofZmanShemaGRA },
    { label: 'Sof Zman Tefilla', at: ext?.sofZmanShmoneEsreiGRA },
    { label: 'Mincha Gedola', at: ext?.minchaGedola },
    { label: 'Candle lighting', at: ext?.candleLighting },
    { label: 'Sunset', at: ext?.sunset },
    { label: 'Tzeis', at: ext?.tzeis },
  ];
  const next = candidates.find((c) => c.at instanceof Date && !Number.isNaN(c.at.getTime()) && c.at > now);
  if (!next?.at) {
    return { label: 'Day complete', time: '—', countdown: 'See tomorrow' };
  }
  return {
    label: next.label,
    time: ZmanimService.formatTime(next.at),
    countdown: `in ${formatCountdown(next.at, now)}`,
  };
}

function buildCandles(
  dayInfo: Awaited<ReturnType<typeof CalendarEngine.getDayInfo>>,
  now: Date
): CandlesProps {
  const ext = dayInfo.extendedZmanim;
  if (dayInfo.isErevShabbos && ext?.candleLighting && ext.candleLighting > now) {
    return {
      title: 'Candles',
      time: ZmanimService.formatTime(ext.candleLighting),
      countdown: `in ${formatCountdown(ext.candleLighting, now)}`,
      mode: 'candles',
    };
  }
  if (dayInfo.isShabbos && ext?.shabbosEnd && ext.shabbosEnd > now) {
    return {
      title: 'Havdalah',
      time: ZmanimService.formatTime(ext.shabbosEnd),
      countdown: `in ${formatCountdown(ext.shabbosEnd, now)}`,
      mode: 'havdalah',
    };
  }
  const upcoming = dayInfo.upcomingShabbos?.candleLighting;
  if (upcoming) {
    return {
      title: 'Candles',
      time: ZmanimService.formatTime(upcoming),
      countdown: `Fri · ${formatCountdown(upcoming, now)}`,
      mode: 'candles',
    };
  }
  return {
    title: 'Candles',
    time: '—',
    countdown: 'Set location',
    mode: 'idle',
  };
}

function buildSeasonalBoard(
  dayInfo: Awaited<ReturnType<typeof CalendarEngine.getDayInfo>>,
  now: Date
): SeasonalBoardProps {
  const ext = dayInfo.extendedZmanim;

  if (dayInfo.isFastDay) {
    const start = ext?.alosHashachar;
    const end = ext?.tzeis;
    let progressPercent = 0;
    let detail = dayInfo.holiday || 'Fast day';
    if (start && end) {
      const total = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();
      progressPercent = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
      if (now < start) detail = `Starts ${ZmanimService.formatTime(start)}`;
      else if (now > end) detail = 'Fast ended';
      else detail = `Ends ${ZmanimService.formatTime(end)} · ${formatCountdown(end, now)} left`;
    }
    return {
      mode: 'fast',
      title: dayInfo.holiday || 'Fast Day',
      line1: `Began ${ZmanimService.formatTime(start ?? null)}`,
      line2: `Ends ${ZmanimService.formatTime(end ?? null)}`,
      line3: `${progressPercent}% through the day`,
      detail,
      progressPercent,
    };
  }

  if (dayInfo.isErevShabbos || dayInfo.isShabbos) {
    const candles =
      ext?.candleLighting ?? dayInfo.upcomingShabbos?.candleLighting ?? null;
    const havdalah = ext?.shabbosEnd ?? dayInfo.upcomingShabbos?.havdalah ?? null;
    return {
      mode: 'shabbos',
      title: dayInfo.isShabbos ? 'Shabbos' : 'Erev Shabbos',
      line1: `Candles ${ZmanimService.formatTime(candles)}`,
      line2: `Havdalah ${ZmanimService.formatTime(havdalah)}`,
      line3: dayInfo.parsha ? `Parsha ${dayInfo.parsha}` : dayInfo.hebrewDate,
      detail: daveningMessage(dayInfo).message,
      progressPercent: 0,
    };
  }

  if (dayInfo.omerDay != null) {
    const info = OmerCalculator.getOmerInfo(dayInfo.omerDay);
    return {
      mode: 'omer',
      title: `Omer · Day ${dayInfo.omerDay}`,
      line1: info?.sefira || dayInfo.omerSefira || 'Sefiras HaOmer',
      line2: info?.sefiraHebrew || info?.meaning || 'Count the Omer',
      line3: `Week ${dayInfo.omerWeek ?? '—'} · Day ${dayInfo.omerDayInWeek ?? '—'}`,
      detail: ext?.tzeis
        ? `Nightfall ${ZmanimService.formatTime(ext.tzeis)}`
        : dayInfo.hebrewDate,
      progressPercent: Math.round((dayInfo.omerDay / 49) * 100),
    };
  }

  return {
    mode: 'default',
    title: dayInfo.jewishDateShort,
    line1: dayInfo.hebrewDate,
    line2: dayInfo.parsha ? `Parsha ${dayInfo.parsha}` : 'This week',
    line3: daveningMessage(dayInfo).message,
    detail: `Sunrise ${ZmanimService.formatTime(ext?.sunrise ?? null)} · Sunset ${ZmanimService.formatTime(ext?.sunset ?? null)}`,
    progressPercent: 0,
  };
}

export type AllWidgetSnapshots = {
  nextZman: NextZmanProps;
  hebrewDate: HebrewDateProps;
  tehillimStreak: TehillimStreakProps;
  candles: CandlesProps;
  omerBrachos: OmerBrachosProps;
  dailyInspiration: DailyInspirationProps;
  zmanimStrip: ZmanimStripProps;
  daveningNote: DaveningNoteProps;
  tehillimToday: TehillimTodayProps;
  shabbosTimes: ShabbosTimesProps;
  daySheet: DaySheetProps;
  practiceHub: PracticeHubProps;
  seasonalBoard: SeasonalBoardProps;
};

export async function buildAllWidgetSnapshots(now: Date = new Date()): Promise<AllWidgetSnapshots> {
  const prefs = await UserPreferencesService.getPreferences();
  const dayInfo = await CalendarEngine.getDayInfo(now, {
    location: prefs?.location
      ? { latitude: prefs.location.latitude, longitude: prefs.location.longitude }
      : undefined,
    isIsrael: false,
    nusach: prefs?.nusach ?? 'ashkenaz',
  });

  const [tehillimProgress, tehillimStreak, daveningStreak, brachosCount, goalsSummary] =
    await Promise.all([
      DailyTehillimTracker.getTodaysProgress(),
      DailyTehillimTracker.getStreak(),
      getDaveningStreak(),
      getBrachosCount(),
      DailyGoalsService.getTodaySummary(),
    ]);

  const quote = getByDay100(INSPIRATION_QUOTES);
  const note = daveningMessage(dayInfo);

  let badge = 'Weekday';
  if (dayInfo.isShabbos) badge = 'Shabbos';
  else if (dayInfo.isYomTov) badge = dayInfo.holiday || 'Yom Tov';
  else if (dayInfo.isRoshChodesh) badge = 'Rosh Chodesh';
  else if (dayInfo.isFastDay) badge = dayInfo.holiday || 'Fast';
  else if (dayInfo.isErevShabbos) badge = 'Erev Shabbos';

  const nextPerek =
    tehillimProgress.chaptersRemaining[0] != null
      ? `Perek ${tehillimProgress.chaptersRemaining[0]}`
      : tehillimProgress.percentComplete >= 100
        ? 'Goal done'
        : 'Open Tehillim';

  const omerBrachos: OmerBrachosProps =
    dayInfo.omerDay != null
      ? {
          mode: 'omer',
          title: 'Omer',
          value: String(dayInfo.omerDay),
          subtitle: dayInfo.omerSefira || `Day ${dayInfo.omerDay} of 49`,
        }
      : {
          mode: 'brachos',
          title: 'Brachos',
          value: `${brachosCount}`,
          subtitle: `of ${BRACHOS_CAP} today`,
        };

  const gregorianLabel = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return {
    nextZman: pickNextZman(dayInfo, now),
    hebrewDate: {
      hebrewDate: dayInfo.hebrewDate,
      jewishDateShort: dayInfo.jewishDateShort,
      badge,
    },
    tehillimStreak: {
      streak: tehillimStreak,
      percentComplete: tehillimProgress.percentComplete,
      subtitle: tehillimStreak === 1 ? 'day streak' : 'day streak',
    },
    candles: buildCandles(dayInfo, now),
    omerBrachos,
    dailyInspiration: {
      hebrew: quote.text,
      translation: quote.translation,
      source: quote.source,
    },
    zmanimStrip: {
      sunrise: ZmanimService.formatTime(dayInfo.extendedZmanim?.sunrise ?? null),
      shema: ZmanimService.formatTime(dayInfo.extendedZmanim?.sofZmanShemaGRA ?? null),
      sunset: ZmanimService.formatTime(dayInfo.extendedZmanim?.sunset ?? null),
    },
    daveningNote: note,
    tehillimToday: {
      completed: tehillimProgress.chaptersCompleted.length,
      total: tehillimProgress.totalChapters.length || 150,
      percentComplete: tehillimProgress.percentComplete,
      nextPerek,
      dayName: tehillimProgress.dayName,
    },
    shabbosTimes: {
      candles: ZmanimService.formatTime(
        dayInfo.upcomingShabbos?.candleLighting ?? dayInfo.extendedZmanim?.candleLighting ?? null
      ),
      havdalah: ZmanimService.formatTime(
        dayInfo.upcomingShabbos?.havdalah ?? dayInfo.extendedZmanim?.shabbosEnd ?? null
      ),
      parsha: dayInfo.parsha ? `Parsha ${dayInfo.parsha}` : JewishCalendarService.getParsha(now) || 'This week',
    },
    daySheet: {
      hebrewDate: dayInfo.hebrewDate || 'Hebrew date',
      gregorianLabel: gregorianLabel || 'Today',
      specialDay: badge || 'Weekday',
      daveningNote: note.message || 'Regular davening today',
      sunrise: ZmanimService.formatTime(dayInfo.extendedZmanim?.sunrise ?? null),
      shema: ZmanimService.formatTime(dayInfo.extendedZmanim?.sofZmanShemaGRA ?? null),
      sunset: ZmanimService.formatTime(dayInfo.extendedZmanim?.sunset ?? null),
      tzeis: ZmanimService.formatTime(dayInfo.extendedZmanim?.tzeis ?? null),
      parsha: dayInfo.parsha
        ? `Parsha ${dayInfo.parsha}`
        : JewishCalendarService.getParsha(now) || 'Open app for location zmanim',
    },
    practiceHub: {
      tehillimPercent: tehillimProgress.percentComplete,
      tehillimLabel: `${tehillimProgress.chaptersCompleted.length} of ${tehillimProgress.totalChapters.length || 150}`,
      daveningStreak,
      brachosCount,
      brachosCap: BRACHOS_CAP,
      goalsCompleted: goalsSummary.completed,
      goalsTotal: Math.max(goalsSummary.total, 0),
    },
    seasonalBoard: buildSeasonalBoard(dayInfo, now),
  };
}
