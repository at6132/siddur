/**
 * Notification Content Generator
 * Creates soft, supportive notification copy
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
      title: 'A moment for Tehillim',
      body: 'A gentle reminder for your daily Tehillim',
      data: { screen: 'TehillimList' },
    };
  }

  /**
   * Generate content for Mincha reminder
   */
  static getMinchaContent(dayInfo: DayInfo): NotificationContent {
    const minchaTime = dayInfo.zmanim.mincha;
    const timeStr = minchaTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return {
      title: 'Mincha time',
      body: `Mincha is at ${timeStr}`,
      data: { screen: 'Home', action: 'mincha' },
    };
  }

  /**
   * Generate content for Hallel reminder
   */
  static getHallelContent(): NotificationContent {
    return {
      title: 'Hallel today',
      body: 'A gentle reminder to say Hallel',
      data: { screen: 'Home', action: 'hallel' },
    };
  }

  /**
   * Generate content for Anenu reminder (fast days)
   */
  static getAnenuContent(): NotificationContent {
    return {
      title: 'Anenu today',
      body: 'A gentle reminder for Anenu on this fast day',
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
    const part = chimeTotal > 1 ? `(${chimeIndex} of ${chimeTotal}) ` : '';
    return {
      title: 'Shabbos — wake up',
      body: `${part}Loud Shabbos morning alarm. Stops on its own after a few minutes. Tap to open the app.`,
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
   * Generate content for Neshama reminder
   */
  static getNeshamaContent(): NotificationContent {
    return {
      title: 'A moment for your Neshama',
      body: 'A gentle reminder for your spiritual practice',
      data: { screen: 'habits' },
    };
  }

  /**
   * Generate content for Rosh Chodesh reminder
   */
  static getRoshChodeshContent(): NotificationContent {
    return {
      title: 'Rosh Chodesh today',
      body: 'A gentle reminder for Rosh Chodesh',
      data: { screen: 'Home', action: 'roshChodesh' },
    };
  }

  /**
   * Generate content for fast day reminder
   */
  static getFastDayContent(): NotificationContent {
    return {
      title: 'Fast day today',
      body: 'A gentle reminder for today\'s fast',
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
      body: 'A moment to add something you\'re grateful for',
      data: { screen: 'Gratitude' },
    };
  }

  /**
   * Yaaleh V'Yavo days (Rosh Chodesh, Chol Hamoed, Yom Tov) — morning reminder
   */
  static getYaalehVyavoContent(): NotificationContent {
    return {
      title: 'Yaaleh V\'Yavo today',
      body: 'A gentle reminder — today we add Yaaleh V\'Yavo in Birkat Hamazon and the Amidah',
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
        body: 'A gentle reminder — today we add Al HaNisim for Chanukah',
        data: { screen: 'Home', action: 'alHanissimChanukah' },
      };
    }
    return {
      title: 'Al HaNisim — Purim',
      body: 'A gentle reminder — today we add Al HaNisim for Purim',
      data: { screen: 'Home', action: 'alHanissimPurim' },
    };
  }

  /**
   * Mashiv HaRuach / V'ten Tal Umatar (winter) — morning reminder
   */
  static getMashivVtenTalContent(): NotificationContent {
    return {
      title: 'Mashiv HaRuach / V\'ten Tal Umatar',
      body: 'A gentle reminder — winter davening additions today',
      data: { screen: 'Home', action: 'mashivVtenTal' },
    };
  }

  /**
   * Summer davening (Morid HaTal) — first 7 days after switch from winter
   */
  static getSummerDaveningContent(): NotificationContent {
    return {
      title: 'Summer davening',
      body: 'A gentle reminder — say Morid HaTal (no Mashiv/V\'ten Tal) this season',
      data: { screen: 'Home', action: 'summerDavening' },
    };
  }

  /**
   * Aneinu (fast days) — morning reminder
   */
  static getAneinuContent(): NotificationContent {
    return {
      title: 'Aneinu today',
      body: 'A gentle reminder — add Aneinu in the Amidah on this fast day',
      data: { screen: 'Home', action: 'aneinu' },
    };
  }

  /**
   * Nachem (Tisha B\'Av) — morning reminder
   */
  static getNachemContent(): NotificationContent {
    return {
      title: 'Nachem today',
      body: 'A gentle reminder — add Nachem in the Amidah on Tisha B\'Av',
      data: { screen: 'Home', action: 'nachem' },
    };
  }

  /**
   * Avinu Malkeinu (Aseres Yemei Teshuva & fast days) — morning reminder
   */
  static getAvinuMalkeinuContent(): NotificationContent {
    return {
      title: 'Avinu Malkeinu today',
      body: 'A gentle reminder — we say Avinu Malkeinu today',
      data: { screen: 'Home', action: 'avinuMalkeinu' },
    };
  }

  /**
   * Selichos (Elul / Aseres Yemei Teshuva) — morning reminder
   */
  static getSelichosContent(): NotificationContent {
    return {
      title: 'Selichos today',
      body: 'A gentle reminder — Selichos are said today',
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
        title: 'Your Tehillim streak is waiting',
        body: 'A quick moment today keeps your streak going 💜',
        screen: 'TehillimList',
      },
      gratitude: {
        title: 'Your gratitude streak is waiting',
        body: 'Add one thing you\'re grateful for today',
        screen: 'Gratitude',
      },
      habits: {
        title: 'Your habit streak is waiting',
        body: 'Show up today — even just a little',
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

