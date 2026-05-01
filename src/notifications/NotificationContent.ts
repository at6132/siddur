/**
 * Notification Content Generator
 * Short, direct copy for scheduled notifications
 */

import { NotificationContent } from './types';
import { DayInfo } from '../types/calendar';
import { OmerCalculator } from '../core/omer/OmerCalculator';

export class NotificationContentService {
  /**
   * Generate content for daily Tehillim reminder
   */
  static getDailyTehillimContent(): NotificationContent {
    return {
      title: 'Daily Tehillim',
      body: 'Time for your daily Tehillim',
      data: { screen: 'TehillimList' },
    };
  }

  /**
   * Generate content for Hallel reminder
   */
  static getHallelContent(): NotificationContent {
    return {
      title: 'Hallel today',
      body: 'Say Hallel today',
      data: { screen: 'Home', action: 'hallel' },
    };
  }

  /**
   * Generate content for Anenu reminder (fast days)
   */
  static getAnenuContent(): NotificationContent {
    return {
      title: 'Anenu today',
      body: 'Don’t forget Anenu on this fast day',
      data: { screen: 'Home', action: 'anenu' },
    };
  }

  /**
   * Generate content for Shabbos coming reminder
   */
  static getShabbosComingContent(dayInfo: DayInfo): NotificationContent {
    const candleTime = dayInfo.zmanim.candleLighting;
    if (!candleTime) {
      return {
        title: 'Shabbos is coming',
        body: 'Shabbos is coming ✨',
        data: { screen: 'Home' },
      };
    }

    const timeStr = candleTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return {
      title: 'Shabbos is coming',
      body: `Candle lighting is at ${timeStr} ✨`,
      data: { screen: 'Home' },
    };
  }

  /**
   * Erev, 30 min before candle: tomorrow’s wake time, ringer on for this app’s sound, and airplane mode.
   * Intent: with ringer off, the user might miss the alarm; with ringer on but not airplane, other stuff can
   * interrupt all night — airplane knocks out most “through the air” stuff while our alert is a local schedule.
   */
  static getShabbosClockPrepContent(alarmTimeDisplay: string): NotificationContent {
    return {
      title: '30 minutes to Shabbos',
      body: `Shabbos morning wake: ${alarmTimeDisplay} tomorrow. Ringer/alert for this app must be on, or the alarm can be missed. Airplane mode: cuts most of what would buzz you (calls, texts, many apps’ internet pushes) so the night is quieter, while the alarm in this app is a local schedule and usually still fires. A few other local alerts are still possible depending on the phone — check if needed.`,
      data: { screen: 'Settings', type: 'shabbos_clock_prep' },
    };
  }

  /** Shabbos morning — loud alarm, then auto-stops after the chosen run length */
  static getShabbosClockAlarmContent(chimeIndex: number, chimeTotal: number): NotificationContent {
    return {
      title: 'Shabbos — wake up',
      body: 'Alarm',
      data: { screen: 'Settings', type: 'shabbos_clock_alarm', chimeIndex, chimeTotal },
    };
  }

  static getCandleLightingContent(dayInfo: DayInfo): NotificationContent {
    const candleTime = dayInfo.zmanim.candleLighting;
    if (!candleTime) {
      return {
        title: 'Candle lighting',
        body: 'Time to light candles',
        data: { screen: 'Home' },
      };
    }

    const timeStr = candleTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return {
      title: 'Candle lighting',
      body: `Candle lighting is at ${timeStr}`,
      data: { screen: 'Home' },
    };
  }

  /**
   * Generate content for Sefiras HaOmer reminder
   */
  static getOmerContent(omerDay: number): NotificationContent {
    const blessing = OmerCalculator.getOmerBlessing(omerDay);
    const body = `${blessing.count} ${blessing.sefira}`.trim();

    return {
      title: `Time to count — night ${omerDay} of the Omer`,
      body: body.length > 0 ? body : "Open the app for tonight's count and bracha.",
      data: { screen: 'Omer', omerDay },
    };
  }

  /**
   * Generate content for Rosh Chodesh reminder
   */
  static getRoshChodeshContent(): NotificationContent {
    return {
      title: 'Rosh Chodesh today',
      body: 'It’s Rosh Chodesh today',
      data: { screen: 'Home', action: 'roshChodesh' },
    };
  }

  /**
   * Generate content for fast day reminder
   */
  static getFastDayContent(): NotificationContent {
    return {
      title: 'Fast day today',
      body: 'Remember your fasting today!',
      data: { screen: 'Home', action: 'fastDay' },
    };
  }

  /**
   * Generate content for Shekiya (sunset) reminder
   */
  static getShekiyaContent(dayInfo: DayInfo): NotificationContent {
    const sunset = dayInfo.extendedZmanim?.sunset;
    const timeStr = sunset
      ? sunset.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : 'sunset';
    return {
      title: 'Shekiya reminder',
      body: `Sunset is at ${timeStr}`,
      data: { screen: 'Home', action: 'shekiya' },
    };
  }

  /**
   * Generate content for Daily Gratitude reminder
   */
  static getDailyGratitudeContent(): NotificationContent {
    return {
      title: 'Daily Gratitude',
      body: 'Add something you’re grateful for',
      data: { screen: 'Gratitude' },
    };
  }

  /**
   * Yaaleh V'Yavo days (Rosh Chodesh, Chol Hamoed, Yom Tov) — morning reminder
   */
  static getYaalehVyavoContent(): NotificationContent {
    return {
      title: 'Yaaleh V\'Yavo today',
      body: 'Add Yaaleh V\'Yavo in Birkat Hamazon and the Amidah today',
      data: { screen: 'Home', action: 'yaalehVyavo' },
    };
  }

  /**
   * Al HaNisim (Chanukah or Purim) — morning reminder
   */
  static getAlHanissimContent(type: 'chanukah' | 'purim'): NotificationContent {
    if (type === 'chanukah') {
      return {
        title: 'Al HaNisim — Chanukah',
        body: 'Add Al HaNisim for Chanukah today',
        data: { screen: 'Home', action: 'alHanissimChanukah' },
      };
    }
    return {
      title: 'Al HaNisim — Purim',
      body: 'Add Al HaNisim for Purim today',
      data: { screen: 'Home', action: 'alHanissimPurim' },
    };
  }

  /**
   * Mashiv HaRuach / V'ten Tal Umatar (winter) — morning reminder
   */
  static getMashivVtenTalContent(): NotificationContent {
    return {
      title: 'Mashiv HaRuach / V\'ten Tal Umatar',
      body: 'Winter insertions: Mashiv HaRuach and V\'ten Tal Umatar',
      data: { screen: 'Home', action: 'mashivVtenTal' },
    };
  }

  /**
   * Summer davening (Morid HaTal) — first 7 days after switch from winter
   */
  static getSummerDaveningContent(): NotificationContent {
    return {
      title: 'Summer davening',
      body: 'Say Morid HaTal (no Mashiv / V\'ten Tal) this season',
      data: { screen: 'Home', action: 'summerDavening' },
    };
  }

  /**
   * Aneinu (fast days) — morning reminder
   */
  static getAneinuContent(): NotificationContent {
    return {
      title: 'Aneinu today',
      body: 'Add Aneinu in the Amidah on this fast day',
      data: { screen: 'Home', action: 'aneinu' },
    };
  }

  /**
   * Nachem (Tisha B\'Av) — morning reminder
   */
  static getNachemContent(): NotificationContent {
    return {
      title: 'Nachem today',
      body: 'Add Nachem in the Amidah on Tisha B\'Av',
      data: { screen: 'Home', action: 'nachem' },
    };
  }

  /**
   * Avinu Malkeinu (Aseres Yemei Teshuva & fast days) — morning reminder
   */
  static getAvinuMalkeinuContent(): NotificationContent {
    return {
      title: 'Avinu Malkeinu today',
      body: 'We say Avinu Malkeinu today',
      data: { screen: 'Home', action: 'avinuMalkeinu' },
    };
  }

  /**
   * Selichos (Elul / Aseres Yemei Teshuva) — morning reminder
   */
  static getSelichosContent(): NotificationContent {
    return {
      title: 'Selichos today',
      body: 'Selichos are said today',
      data: { screen: 'Home', action: 'selichos' },
    };
  }

  /**
   * Generate content for streak nudge (invisible in settings - "don't lose your streak")
   */
  static getStreakReminderContent(
    type: 'tehillim' | 'gratitude' | 'habits'
  ): NotificationContent {
    const config = {
      tehillim: {
        title: 'Tehillim streak',
        body: 'Log today to keep your streak',
        screen: 'TehillimList',
      },
      gratitude: {
        title: 'Gratitude streak',
        body: 'Add an entry today to keep your streak',
        screen: 'Gratitude',
      },
      habits: {
        title: 'Habit streak',
        body: 'Check in today to keep your streak',
        screen: 'Habits',
      },
    };
    const { title, body, screen } = config[type];
    return { title, body, data: { screen } };
  }

  /**
   * Generate content for custom reminder
   */
  static getCustomReminderContent(
    title: string,
    message: string,
    reminderId: string,
    openToScreen?: string
  ): NotificationContent {
    return {
      title,
      body: message || title,
      data: { screen: openToScreen || 'Home', type: 'customReminder', reminderId },
    };
  }
}

