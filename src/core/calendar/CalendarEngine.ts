/**
 * Calendar Engine
 * Main orchestrator for calendar logic and day information
 */

import { DayInfo, CalendarContext, DaveningChanges } from '../../types/calendar';
import { JewishCalendarService } from './JewishCalendar';
import { ZmanimService } from '../zmanim/ZmanimService';
import { OmerCalculator } from '../omer/OmerCalculator';
import { SpiritualCuesService } from '../spiritual/SpiritualCues';
import * as Location from 'expo-location';

export class CalendarEngine {
  /**
   * Get comprehensive day information for a given date
   */
  static async getDayInfo(
    date: Date = new Date(),
    context: CalendarContext
  ): Promise<DayInfo> {
    // Get location (request if needed)
    let location: Location.LocationObject | null = null;
    if (context.location) {
      // Use provided location
      location = {
        coords: {
          latitude: context.location.latitude,
          longitude: context.location.longitude,
          altitude: null,
          accuracy: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as Location.LocationObject;
    } else {
      // Try to get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        location = await Location.getCurrentPositionAsync({});
      }
    }

    // Calculate zmanim
    const zmanim = await ZmanimService.calculateZmanim(date, location);

    // Get Jewish calendar info
    const jewishDate = JewishCalendarService.getJewishDateString(date);
    const jewishDateShort = JewishCalendarService.getJewishDateShort(date);
    const isShabbos = JewishCalendarService.isShabbos(date);
    const isYomTov = JewishCalendarService.isYomTov(date);
    const isFastDay = JewishCalendarService.isFastDay(date);
    const isCholHamoed = JewishCalendarService.isCholHamoed(date);
    const parsha = JewishCalendarService.getParsha(date);
    const holiday = JewishCalendarService.getHoliday(date);

    // Determine davening changes
    const daveningChanges = this.calculateDaveningChanges(
      date,
      isShabbos,
      isYomTov,
      isFastDay,
      isCholHamoed
    );

    // Get spiritual cue
    const spiritualCue = SpiritualCuesService.generateCue(date);

    // Get Omer day
    const omerDay = OmerCalculator.getOmerDay(date);

    return {
      jewishDate,
      jewishDateShort,
      gregorianDate: date,
      isShabbos,
      isYomTov,
      isFastDay,
      isCholHamoed,
      parsha,
      holiday,
      zmanim,
      daveningChanges,
      spiritualCue,
      omerDay: omerDay || undefined,
    };
  }

  /**
   * Calculate what changes in davening for a given day
   */
  private static calculateDaveningChanges(
    date: Date,
    isShabbos: boolean,
    isYomTov: boolean,
    isFastDay: boolean,
    isCholHamoed: boolean
  ): DaveningChanges {
    // On Shabbos and Yom Tov: no Tachanun
    const tachanun = !isShabbos && !isYomTov && !isCholHamoed;

    // Hallel: on Yom Tov and Rosh Chodesh (simplified)
    const hallel = isYomTov; // Should also check for Rosh Chodesh

    // Anenu: on fast days
    const anenu = isFastDay;

    // Yaaleh Veyavo: on Yom Tov and Rosh Chodesh
    const yaalehVeyavo = isYomTov || isCholHamoed; // Should also check for Rosh Chodesh

    return {
      hallel,
      anenu,
      tachanun,
      yaalehVeyavo,
    };
  }

  /**
   * Get today's information
   */
  static async getTodayInfo(
    context: CalendarContext
  ): Promise<DayInfo> {
    return this.getDayInfo(new Date(), context);
  }
}

