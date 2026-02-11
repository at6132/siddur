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
      data: { screen: 'tehillim' },
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
      data: { screen: 'home', action: 'mincha' },
    };
  }

  /**
   * Generate content for Hallel reminder
   */
  static getHallelContent(): NotificationContent {
    return {
      title: 'Hallel today',
      body: 'A gentle reminder to say Hallel',
      data: { screen: 'home', action: 'hallel' },
    };
  }

  /**
   * Generate content for Anenu reminder (fast days)
   */
  static getAnenuContent(): NotificationContent {
    return {
      title: 'Anenu today',
      body: 'A gentle reminder for Anenu on this fast day',
      data: { screen: 'home', action: 'anenu' },
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
        data: { screen: 'home' },
      };
    }

    const timeStr = candleTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return {
      title: 'Shabbos is coming',
      body: `Candle lighting is at ${timeStr} ✨`,
      data: { screen: 'home' },
    };
  }

  /**
   * Generate content for candle lighting reminder
   */
  static getCandleLightingContent(dayInfo: DayInfo): NotificationContent {
    const candleTime = dayInfo.zmanim.candleLighting;
    if (!candleTime) {
      return {
        title: 'Candle lighting',
        body: 'Time to light candles',
        data: { screen: 'home' },
      };
    }

    const timeStr = candleTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return {
      title: 'Candle lighting',
      body: `Candle lighting is at ${timeStr}`,
      data: { screen: 'home' },
    };
  }

  /**
   * Generate content for Sefiras HaOmer reminder
   */
  static getOmerContent(omerDay: number): NotificationContent {
    const blessing = OmerCalculator.getOmerBlessing(omerDay);

    return {
      title: `Tonight is day ${omerDay} of the Omer`,
      body: blessing.english,
      data: { screen: 'omer', omerDay },
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
      data: { screen: 'home', action: 'roshChodesh' },
    };
  }

  /**
   * Generate content for fast day reminder
   */
  static getFastDayContent(): NotificationContent {
    return {
      title: 'Fast day today',
      body: 'A gentle reminder for today\'s fast',
      data: { screen: 'home', action: 'fastDay' },
    };
  }

  /**
   * Generate content for custom reminder
   */
  static getCustomReminderContent(title: string, message: string, reminderId: string): NotificationContent {
    return {
      title,
      body: message || title,
      data: { screen: 'home', type: 'customReminder', reminderId },
    };
  }
}

