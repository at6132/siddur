/**
 * Calendar Engine
 * Main orchestrator for calendar logic and day information
 */

import { DayInfo, CalendarContext, DaveningChanges, SpecialDay } from '../../types/calendar';
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
    // Get location
    let location: Location.LocationObject | null = null;
    if (context.location) {
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
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          location = await Location.getCurrentPositionAsync({});
        }
      } catch (e) {
        console.warn('Location error:', e);
      }
    }

    // Calculate zmanim
    const zmanim = await ZmanimService.calculateZmanim(date, location);
    const extendedZmanim = await ZmanimService.calculateExtendedZmanim(date, location);

    // Get all Jewish calendar info
    const jewishDate = JewishCalendarService.getJewishDateString(date);
    const jewishDateShort = JewishCalendarService.getJewishDateShort(date);
    const hebrewDate = JewishCalendarService.getHebrewDateString(date);
    const dayOfWeekHebrew = JewishCalendarService.getDayOfWeekHebrew(date);

    // Day type flags
    const isShabbos = JewishCalendarService.isShabbos(date);
    const isYomTov = JewishCalendarService.isYomTov(date);
    const isFastDay = JewishCalendarService.isFastDay(date);
    const isCholHamoed = JewishCalendarService.isCholHamoed(date);
    const isRoshChodesh = JewishCalendarService.isRoshChodesh(date);
    const isErevShabbos = JewishCalendarService.isErevShabbos(date);
    const isErevYomTov = JewishCalendarService.isErevYomTov(date);
    const isMoedKatan = JewishCalendarService.isChanukah(date) || JewishCalendarService.isPurim(date);

    // Special day info
    const specialDays = JewishCalendarService.getSpecialDays(date);
    const parsha = JewishCalendarService.getParsha(date);
    const parshaHebrew = JewishCalendarService.getParshaHebrew(date);
    const holiday = JewishCalendarService.getHoliday(date);

    // Determine davening changes
    const daveningChanges = this.calculateDaveningChanges(
      date,
      context.isIsrael,
      isShabbos,
      isYomTov,
      isFastDay,
      isCholHamoed,
      isRoshChodesh
    );

    // Get spiritual cue
    const spiritualCue = SpiritualCuesService.generateCue(date);

    // Get Omer info
    const omerDay = OmerCalculator.getOmerDay(date);
    const omerInfo = omerDay ? OmerCalculator.getOmerInfo(omerDay) : null;

    // Get season
    const season = JewishCalendarService.getSeason(date);
    const isAfterPesach = season === 'summer';
    const isAfterSheminiAtzeres = season === 'winter';
    const isAfterDecember4th = JewishCalendarService.isVtenTalUmatar(date, false) && season === 'winter';

    // Upcoming Shabbos times for home widgets (this weekend's candle lighting & havdalah)
    let upcomingShabbos: { candleLighting: Date | null; havdalah: Date | null } | undefined;
    const dow = date.getDay();
    if (dow <= 5) {
      // Sun–Fri: get this week's Friday and Saturday
      const daysUntilFriday = dow <= 4 ? (5 - dow + 7) % 7 : 0;
      const fridayDate = new Date(date);
      fridayDate.setDate(date.getDate() + daysUntilFriday);
      const saturdayDate = new Date(fridayDate);
      saturdayDate.setDate(fridayDate.getDate() + 1);
      const [friZmanim, satZmanim] = await Promise.all([
        ZmanimService.calculateExtendedZmanim(fridayDate, location),
        ZmanimService.calculateExtendedZmanim(saturdayDate, location),
      ]);
      upcomingShabbos = {
        candleLighting: friZmanim.candleLighting,
        havdalah: satZmanim.shabbosEnd ?? satZmanim.tzeis,
      };
    } else {
      // Saturday: candle lighting was last night, havdalah is tonight
      const fridayDate = new Date(date);
      fridayDate.setDate(date.getDate() - 1);
      const satZmanim = extendedZmanim;
      const friZmanim = await ZmanimService.calculateExtendedZmanim(fridayDate, location);
      upcomingShabbos = {
        candleLighting: friZmanim.candleLighting,
        havdalah: satZmanim.shabbosEnd ?? satZmanim.tzeis,
      };
    }

    return {
      // Date info
      jewishDate,
      jewishDateShort,
      hebrewDate,
      gregorianDate: date,
      dayOfWeek: date.getDay(),
      dayOfWeekHebrew,

      // Day type flags
      isShabbos,
      isYomTov,
      isFastDay,
      isCholHamoed,
      isRoshChodesh,
      isErevShabbos,
      isErevYomTov,
      isMoedKatan,

      // Special day info
      specialDays,
      parsha,
      parshaHebrew,
      holiday,

      // Zmanim and prayer changes
      zmanim,
      extendedZmanim,
      daveningChanges,
      spiritualCue,

      // Omer
      omerDay: omerDay || undefined,
      omerWeek: omerInfo?.week,
      omerDayInWeek: omerInfo?.dayInWeek,
      omerSefira: omerInfo?.sefira,

      // Season
      season,
      isAfterPesach,
      isAfterSheminiAtzeres,
      isAfterDecember4th,

      // Upcoming Shabbos (for home widgets)
      upcomingShabbos,
    };
  }

  /**
   * Calculate what changes in davening for a given day
   */
  private static calculateDaveningChanges(
    date: Date,
    isIsrael: boolean,
    isShabbos: boolean,
    isYomTov: boolean,
    isFastDay: boolean,
    isCholHamoed: boolean,
    isRoshChodesh: boolean
  ): DaveningChanges {
    const isTishaBAv = JewishCalendarService.isTishaBAv(date);
    const isYomKippur = JewishCalendarService.isYomKippur(date);
    const isChanukah = JewishCalendarService.isChanukah(date);
    const isPurim = JewishCalendarService.isPurim(date);
    const season = JewishCalendarService.getSeason(date);

    // Amidah insertions
    const mashivHaruach = JewishCalendarService.isMashivHaruach(date);
    const moridHatal = !mashivHaruach; // Summer - some say Morid Hatal
    const vtenBracha = !JewishCalendarService.isVtenTalUmatar(date, isIsrael);
    const vtenTalUmatar = JewishCalendarService.isVtenTalUmatar(date, isIsrael);
    const yaalehVeyavo = isYomTov || isCholHamoed || isRoshChodesh;
    const alHanissim = JewishCalendarService.isAlHanissim(date);
    const aneinu = isFastDay;
    const nachem = isTishaBAv;

    // Hallel
    const hallelType = JewishCalendarService.getHallelType(date);
    const hallel = hallelType;
    // Bracha on Hallel: full Hallel days (not Rosh Chodesh which is half)
    const hallelWithBracha = hallelType === 'full';

    // Tachanun
    const tachanun = JewishCalendarService.isTachanunSaid(date);

    // Lamnatzeach (Psalm 20) - not said when Tachanun is not said
    const lamnatzeiach = tachanun;

    // Avinu Malkeinu - Aseres Yemei Teshuva (10 days of repentance) and fast days
    // (except Shabbos, except Tisha B'Av at Mincha)
    const isAseresYemeiTeshuva = this.isAseresYemeiTeshuva(date);
    const avinuMalkeinu = (isAseresYemeiTeshuva || isFastDay) && !isShabbos;

    // Selichos - before Rosh Hashana and Aseres Yemei Teshuva
    const selichos = this.isSelichosPeriod(date);

    // Kinos - Tisha B'Av
    const kinos = isTishaBAv;

    // Torah reading
    const torahReading = JewishCalendarService.hasTorahReading(date);

    // Musaf type
    let musaf: 'regular' | 'roshChodesh' | 'yomTov' | 'roshHashana' | 'yomKippur' | false = false;
    if (isShabbos) musaf = 'regular';
    if (isRoshChodesh) musaf = 'roshChodesh';
    if (isYomTov || isCholHamoed) musaf = 'yomTov';
    if (this.isRoshHashana(date)) musaf = 'roshHashana';
    if (isYomKippur) musaf = 'yomKippur';

    // Kedusha type
    let kedushaType: 'regular' | 'shabbos' | 'yomTov' | 'yamimNoraim' = 'regular';
    if (isShabbos && !isYomTov) kedushaType = 'shabbos';
    if (isYomTov) kedushaType = 'yomTov';
    if (isYomKippur || this.isRoshHashana(date)) kedushaType = 'yamimNoraim';

    // Build reason string
    const reasons: string[] = [];
    if (isShabbos) reasons.push('Shabbos');
    if (isRoshChodesh) reasons.push(JewishCalendarService.getRoshChodeshName(date) || 'Rosh Chodesh');
    if (isCholHamoed) reasons.push('Chol Hamoed');
    if (isChanukah) reasons.push(`Chanukah Day ${JewishCalendarService.getChanukahDay(date)}`);
    if (isPurim) reasons.push('Purim');
    if (isFastDay && !isTishaBAv && !isYomKippur) {
      const holiday = JewishCalendarService.getHoliday(date);
      reasons.push(holiday || 'Fast Day');
    }
    if (isTishaBAv) reasons.push('Tisha B\'Av');
    if (isYomKippur) reasons.push('Yom Kippur');
    if (isYomTov && !isYomKippur && !this.isRoshHashana(date)) {
      const holiday = JewishCalendarService.getHoliday(date);
      if (holiday) reasons.push(holiday);
    }
    if (this.isRoshHashana(date)) reasons.push('Rosh Hashana');

    return {
      // Amidah insertions
      mashivHaruach,
      moridHatal,
      vtenBracha,
      vtenTalUmatar,
      yaalehVeyavo,
      alHanissim: alHanissim || false,
      aneinu,
      nachem,

      // Additional prayers
      hallel,
      hallelWithBracha,
      tachanun,
      lamnatzeiach: lamnatzeiach,
      avinuMalkeinu,
      selichos,
      kinos,

      // Torah reading
      torahReading,
      maftir: null, // Would need more complex logic
      haftarah: null, // Would need more complex logic

      // Special additions
      musaf,
      kedushaType,

      // Reason/context
      reason: reasons.join(', ') || undefined,
    };
  }

  /**
   * Check if it's Aseres Yemei Teshuva (10 days of repentance)
   */
  private static isAseresYemeiTeshuva(date: Date): boolean {
    const hdate = JewishCalendarService.getJewishDate(date);
    const month = hdate.getMonth();
    const day = hdate.getDate();
    // 1-10 Tishrei
    return month === 7 && day >= 1 && day <= 10; // Tishrei = month 7 in hebcal
  }

  /**
   * Check if it's Rosh Hashana
   */
  private static isRoshHashana(date: Date): boolean {
    const hdate = JewishCalendarService.getJewishDate(date);
    const month = hdate.getMonth();
    const day = hdate.getDate();
    return month === 7 && (day === 1 || day === 2); // Tishrei 1-2
  }

  /**
   * Check if it's Selichos period
   */
  private static isSelichosPeriod(date: Date): boolean {
    const hdate = JewishCalendarService.getJewishDate(date);
    const month = hdate.getMonth();
    const day = hdate.getDate();
    
    // Ashkenazi: from Sunday before Rosh Hashana (at least 4 days)
    // Sefardi: entire month of Elul
    // Simplified: Elul 21+ or Tishrei 1-9
    if (month === 6 && day >= 21) return true; // Elul
    if (month === 7 && day >= 1 && day <= 9) return true; // Tishrei before Yom Kippur
    return false;
  }

  /**
   * Get today's information
   */
  static async getTodayInfo(context: CalendarContext): Promise<DayInfo> {
    return this.getDayInfo(new Date(), context);
  }

  /**
   * Get information for multiple days
   */
  static async getWeekInfo(
    startDate: Date,
    context: CalendarContext
  ): Promise<DayInfo[]> {
    const days: DayInfo[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dayInfo = await this.getDayInfo(date, context);
      days.push(dayInfo);
    }
    return days;
  }
}
