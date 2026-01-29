/**
 * Spiritual Cues Generator
 * Generates gentle, supportive spiritual cues based on calendar context
 */

import { SpiritualCue } from '../../types/calendar';
import { JewishCalendarService } from '../calendar/JewishCalendar';
import { OmerCalculator } from '../omer/OmerCalculator';

export class SpiritualCuesService {
  private static readonly CUES = {
    tehillim: [
      'A moment for Tehillim today',
      'Good day for Tehillim',
      'Time for Tehillim',
    ],
    renewal: [
      'Renewal energy today',
      'A fresh start',
      'New beginnings',
    ],
    reflection: [
      'A moment for reflection',
      'Time to pause and reflect',
      'Quiet reflection',
    ],
    gratitude: [
      'A day for gratitude',
      'Count your blessings',
      'Gratitude practice',
    ],
    other: [
      'A moment for your Neshama',
      'Spiritual moment',
      'Time for connection',
    ],
  };

  /**
   * Generate a spiritual cue for a given date
   */
  static generateCue(date: Date = new Date()): SpiritualCue | undefined {
    // Check for special days
    if (JewishCalendarService.isShabbos(date)) {
      return {
        text: 'Shabbos peace',
        type: 'renewal',
      };
    }

    if (JewishCalendarService.isYomTov(date)) {
      return {
        text: 'Yom Tov joy',
        type: 'gratitude',
      };
    }

    // Check Omer period
    const omerDay = OmerCalculator.getOmerDay(date);
    if (omerDay !== null) {
      return {
        text: `Day ${omerDay} of the Omer`,
        type: 'reflection',
      };
    }

    // Default: random gentle cue
    const dayOfWeek = date.getDay();
    const cues = this.CUES.tehillim;
    const randomCue = cues[dayOfWeek % cues.length];

    return {
      text: randomCue,
      type: 'tehillim',
    };
  }
}

