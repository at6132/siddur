/**
 * Zmanim Service
 * Calculates halachic prayer times based on astronomical calculations
 * Uses proper sun position formulas for accurate zmanim
 */

import { LocationObject } from 'expo-location';
import { Zmanim, ExtendedZmanim } from '../../types/calendar';

// Solar calculation constants
const ZENITH_OFFICIAL = 90.833; // Official sunrise/sunset
const ZENITH_CIVIL = 96; // Civil twilight
const ZENITH_NAUTICAL = 102; // Nautical twilight
const ZENITH_ASTRONOMICAL = 108; // Astronomical twilight

export class ZmanimService {
  /**
   * Calculate all zmanim for a given date and location
   */
  static async calculateZmanim(
    date: Date,
    location: LocationObject | null
  ): Promise<Zmanim> {
    if (!location) {
      return this.getDefaultZmanim(date);
    }

    const lat = location.coords.latitude;
    const lon = location.coords.longitude;
    const elevation = location.coords.altitude || 0;

    // Calculate base astronomical times
    const sunrise = this.calculateSunTime(date, lat, lon, ZENITH_OFFICIAL, true, elevation);
    const sunset = this.calculateSunTime(date, lat, lon, ZENITH_OFFICIAL, false, elevation);

    // Calculate zmanim based on sunrise/sunset
    const dayLength = sunset.getTime() - sunrise.getTime();
    const shaahZmanis = dayLength / 12; // Length of a "halachic hour"

    // Shacharis: Latest Shema (3 hours) / Latest Shacharis (4 hours) after sunrise
    // For notification purposes, we use "ideal" time which is at/before sunrise
    const shacharis = new Date(sunrise.getTime());

    // Mincha: Half hour after chatzos (midday) until sunset
    // Mincha Gedola = chatzos + 30 minutes
    const chatzos = new Date(sunrise.getTime() + dayLength / 2);
    const minchaGedola = new Date(chatzos.getTime() + shaahZmanis / 2);
    const mincha = minchaGedola;

    // Maariv: After tzeis hakochavim (nightfall)
    const tzeis = this.calculateSunTime(date, lat, lon, ZENITH_CIVIL, false, elevation);
    const maariv = tzeis;

    // Shabbos times
    const dayOfWeek = date.getDay();
    const isFriday = dayOfWeek === 5;
    const isShabbos = dayOfWeek === 6;

    let shabbosStart: Date | null = null;
    let shabbosEnd: Date | null = null;
    let candleLighting: Date | null = null;

    if (isFriday) {
      shabbosStart = sunset;
      candleLighting = new Date(sunset.getTime() - 18 * 60000); // 18 minutes before
    }

    if (isShabbos) {
      // Calculate Saturday night tzeis for havdalah
      const saturdayTzeis = this.calculateSunTime(date, lat, lon, ZENITH_CIVIL, false, elevation);
      // Add extra time for "Rabbeinu Tam" opinion (some add 72 minutes)
      shabbosEnd = new Date(saturdayTzeis.getTime() + 8 * 60000); // 8 minutes after tzeis
    }

    return {
      shacharis,
      mincha,
      maariv,
      shabbosStart,
      shabbosEnd,
      candleLighting,
    };
  }

  /**
   * Calculate extended zmanim with all halachic times
   */
  static async calculateExtendedZmanim(
    date: Date,
    location: LocationObject | null
  ): Promise<ExtendedZmanim> {
    if (!location) {
      return this.getDefaultExtendedZmanim(date);
    }

    const lat = location.coords.latitude;
    const lon = location.coords.longitude;
    const elevation = location.coords.altitude || 0;

    // Calculate base times
    const alosHashachar = this.calculateSunTime(date, lat, lon, ZENITH_ASTRONOMICAL, true, elevation);
    const misheyakir = this.calculateSunTime(date, lat, lon, 101, true, elevation); // ~11° below horizon
    const sunrise = this.calculateSunTime(date, lat, lon, ZENITH_OFFICIAL, true, elevation);
    const sunset = this.calculateSunTime(date, lat, lon, ZENITH_OFFICIAL, false, elevation);
    const tzeis = this.calculateSunTime(date, lat, lon, ZENITH_CIVIL, false, elevation);
    const tzeisRT = new Date(sunset.getTime() + 72 * 60000); // Rabbeinu Tam: 72 minutes after sunset

    // Calculate shaah zmanis (proportional hour)
    const dayLength = sunset.getTime() - sunrise.getTime();
    const shaahZmanis = dayLength / 12;

    // Calculate key times
    const sofZmanShemaGRA = new Date(sunrise.getTime() + 3 * shaahZmanis);
    const sofZmanShmoneEsreiGRA = new Date(sunrise.getTime() + 4 * shaahZmanis);
    const chatzos = new Date(sunrise.getTime() + dayLength / 2);
    const minchaGedola = new Date(chatzos.getTime() + shaahZmanis / 2);
    const minchaKetana = new Date(sunrise.getTime() + 9.5 * shaahZmanis);
    const plagHamincha = new Date(sunrise.getTime() + 10.75 * shaahZmanis);

    // Magen Avraham calculations (from alos to tzeis)
    const dayLengthMA = tzeis.getTime() - alosHashachar.getTime();
    const shaahZmanisMA = dayLengthMA / 12;
    const sofZmanShemaMA = new Date(alosHashachar.getTime() + 3 * shaahZmanisMA);
    const sofZmanShmoneEsreiMA = new Date(alosHashachar.getTime() + 4 * shaahZmanisMA);

    // Shabbos/Yom Tov times
    const dayOfWeek = date.getDay();
    const isFriday = dayOfWeek === 5;
    const isShabbos = dayOfWeek === 6;

    let shabbosStart: Date | null = null;
    let shabbosEnd: Date | null = null;
    let candleLighting: Date | null = null;

    if (isFriday) {
      shabbosStart = sunset;
      candleLighting = new Date(sunset.getTime() - 18 * 60000);
    }

    if (isShabbos) {
      shabbosEnd = new Date(tzeis.getTime() + 8 * 60000);
    }

    return {
      // Basic times
      shacharis: sunrise,
      mincha: minchaGedola,
      maariv: tzeis,
      shabbosStart,
      shabbosEnd,
      candleLighting,

      // Extended times
      alosHashachar,
      misheyakir,
      sunrise,
      sofZmanShemaGRA,
      sofZmanShemaMA,
      sofZmanShmoneEsreiGRA,
      sofZmanShmoneEsreiMA,
      chatzos,
      minchaGedola,
      minchaKetana,
      plagHamincha,
      sunset,
      tzeis,
      tzeisRT,
      shaahZmanis: Math.round(shaahZmanis / 60000), // in minutes
      shaahZmanisMA: Math.round(shaahZmanisMA / 60000),
    };
  }

  /**
   * Calculate sunrise or sunset time using astronomical formulas
   */
  private static calculateSunTime(
    date: Date,
    latitude: number,
    longitude: number,
    zenith: number,
    isSunrise: boolean,
    elevation: number = 0
  ): Date {
    // Day of year
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    // Convert longitude to hour value
    const lngHour = longitude / 15;

    // Calculate approximate time
    let t: number;
    if (isSunrise) {
      t = dayOfYear + ((6 - lngHour) / 24);
    } else {
      t = dayOfYear + ((18 - lngHour) / 24);
    }

    // Calculate sun's mean anomaly
    const M = (0.9856 * t) - 3.289;

    // Calculate sun's true longitude
    let L = M + (1.916 * Math.sin(this.toRadians(M))) + (0.020 * Math.sin(this.toRadians(2 * M))) + 282.634;
    L = this.normalizeAngle(L);

    // Calculate sun's right ascension
    let RA = this.toDegrees(Math.atan(0.91764 * Math.tan(this.toRadians(L))));
    RA = this.normalizeAngle(RA);

    // Right ascension value needs to be in the same quadrant as L
    const Lquadrant = Math.floor(L / 90) * 90;
    const RAquadrant = Math.floor(RA / 90) * 90;
    RA = RA + (Lquadrant - RAquadrant);

    // Convert to hours
    RA = RA / 15;

    // Calculate sun's declination
    const sinDec = 0.39782 * Math.sin(this.toRadians(L));
    const cosDec = Math.cos(Math.asin(sinDec));

    // Adjust zenith for elevation
    const adjustedZenith = zenith - this.elevationAdjustment(elevation);

    // Calculate sun's local hour angle
    const cosH = (Math.cos(this.toRadians(adjustedZenith)) - (sinDec * Math.sin(this.toRadians(latitude)))) / (cosDec * Math.cos(this.toRadians(latitude)));

    // Sun never rises/sets at this location on this date
    if (cosH > 1) {
      // Sun never rises (polar night)
      const result = new Date(date);
      result.setHours(isSunrise ? 0 : 23, isSunrise ? 0 : 59, 0, 0);
      return result;
    }
    if (cosH < -1) {
      // Sun never sets (midnight sun)
      const result = new Date(date);
      result.setHours(isSunrise ? 0 : 23, isSunrise ? 0 : 59, 0, 0);
      return result;
    }

    // Calculate H
    let H: number;
    if (isSunrise) {
      H = 360 - this.toDegrees(Math.acos(cosH));
    } else {
      H = this.toDegrees(Math.acos(cosH));
    }
    H = H / 15;

    // Calculate local mean time of rising/setting
    const T = H + RA - (0.06571 * t) - 6.622;

    // Adjust to UTC
    let UT = T - lngHour;
    UT = this.normalizeHours(UT);

    // Convert to local time
    const result = new Date(date);
    const hours = Math.floor(UT);
    const minutes = Math.round((UT - hours) * 60);
    
    // Get timezone offset
    const timezoneOffset = -date.getTimezoneOffset() / 60;
    const localHours = hours + timezoneOffset;

    result.setHours(localHours, minutes, 0, 0);
    return result;
  }

  /**
   * Elevation adjustment for zenith calculation
   */
  private static elevationAdjustment(elevation: number): number {
    return this.toDegrees(Math.acos(6371000 / (6371000 + elevation)));
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private static toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  private static normalizeAngle(angle: number): number {
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    return angle;
  }

  private static normalizeHours(hours: number): number {
    while (hours < 0) hours += 24;
    while (hours >= 24) hours -= 24;
    return hours;
  }

  private static getDefaultZmanim(date: Date): Zmanim {
    const base = new Date(date);
    return {
      shacharis: new Date(base.setHours(6, 0, 0, 0)),
      mincha: new Date(base.setHours(13, 30, 0, 0)),
      maariv: new Date(base.setHours(19, 30, 0, 0)),
      shabbosStart: null,
      shabbosEnd: null,
      candleLighting: null,
    };
  }

  private static getDefaultExtendedZmanim(date: Date): ExtendedZmanim {
    const base = new Date(date);
    return {
      shacharis: new Date(base.setHours(6, 0, 0, 0)),
      mincha: new Date(base.setHours(13, 30, 0, 0)),
      maariv: new Date(base.setHours(19, 30, 0, 0)),
      shabbosStart: null,
      shabbosEnd: null,
      candleLighting: null,
      alosHashachar: new Date(base.setHours(4, 30, 0, 0)),
      misheyakir: new Date(base.setHours(5, 15, 0, 0)),
      sunrise: new Date(base.setHours(6, 0, 0, 0)),
      sofZmanShemaGRA: new Date(base.setHours(9, 0, 0, 0)),
      sofZmanShemaMA: new Date(base.setHours(8, 30, 0, 0)),
      sofZmanShmoneEsreiGRA: new Date(base.setHours(10, 0, 0, 0)),
      sofZmanShmoneEsreiMA: new Date(base.setHours(9, 30, 0, 0)),
      chatzos: new Date(base.setHours(12, 30, 0, 0)),
      minchaGedola: new Date(base.setHours(13, 0, 0, 0)),
      minchaKetana: new Date(base.setHours(16, 30, 0, 0)),
      plagHamincha: new Date(base.setHours(17, 45, 0, 0)),
      sunset: new Date(base.setHours(19, 0, 0, 0)),
      tzeis: new Date(base.setHours(19, 30, 0, 0)),
      tzeisRT: new Date(base.setHours(20, 15, 0, 0)),
      shaahZmanis: 65,
      shaahZmanisMA: 75,
    };
  }

  /**
   * Format time for display
   */
  static formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}
