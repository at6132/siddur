/**
 * Tehillim Types
 */

export interface TehillimChapter {
  number: number;
  hebrewNumber: string;
  title?: string;
  titleHebrew?: string;
  verses: TehillimVerse[];
  themes: string[];
  occasions?: string[]; // When this chapter is traditionally said
  bookNumber: number; // Tehillim is divided into 5 books
}

export interface TehillimVerse {
  number: number;
  hebrew: string;
  transliteration?: string;
  english?: string;
}

export interface TehillimBook {
  number: number;
  chapters: number[]; // Chapter numbers in this book
  name: string;
}

export const TEHILLIM_BOOKS: TehillimBook[] = [
  { number: 1, chapters: Array.from({ length: 41 }, (_, i) => i + 1), name: 'Book 1 (1-41)' },
  { number: 2, chapters: Array.from({ length: 31 }, (_, i) => i + 42), name: 'Book 2 (42-72)' },
  { number: 3, chapters: Array.from({ length: 17 }, (_, i) => i + 73), name: 'Book 3 (73-89)' },
  { number: 4, chapters: Array.from({ length: 17 }, (_, i) => i + 90), name: 'Book 4 (90-106)' },
  { number: 5, chapters: Array.from({ length: 44 }, (_, i) => i + 107), name: 'Book 5 (107-150)' },
];

// Daily Tehillim divisions (for monthly reading)
export const DAILY_TEHILLIM: { [day: number]: number[] } = {
  1: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  2: [10, 11, 12, 13, 14, 15, 16, 17],
  3: [18, 19, 20, 21, 22],
  4: [23, 24, 25, 26, 27, 28, 29],
  5: [30, 31, 32, 33, 34],
  6: [35, 36, 37, 38],
  7: [39, 40, 41, 42, 43],
  8: [44, 45, 46, 47, 48],
  9: [49, 50, 51, 52, 53, 54],
  10: [55, 56, 57, 58, 59],
  11: [60, 61, 62, 63, 64, 65],
  12: [66, 67, 68],
  13: [69, 70, 71],
  14: [72, 73, 74, 75, 76],
  15: [77, 78],
  16: [79, 80, 81, 82],
  17: [83, 84, 85, 86, 87],
  18: [88, 89],
  19: [90, 91, 92, 93, 94, 95, 96],
  20: [97, 98, 99, 100, 101, 102, 103],
  21: [104, 105],
  22: [106, 107],
  23: [108, 109, 110, 111, 112],
  24: [113, 114, 115, 116, 117, 118],
  25: [119, 1, 119, 2], // Sections of 119
  26: [119, 3, 119, 4], // Sections of 119
  27: [120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134],
  28: [135, 136, 137, 138, 139],
  29: [140, 141, 142, 143, 144, 145],
  30: [146, 147, 148, 149, 150],
};

// Day of week Tehillim (Shir Shel Yom)
export const DAY_OF_WEEK_TEHILLIM: { [day: number]: number } = {
  0: 24, // Sunday
  1: 48, // Monday
  2: 82, // Tuesday
  3: 94, // Wednesday (94-95)
  4: 81, // Thursday
  5: 93, // Friday
  6: 92, // Shabbos
};

// Traditional 7-day weekly Tehillim division (completes whole Tehillim each week)
// This is the standard practice to say Tehillim divided by day of the week
export const WEEKLY_TEHILLIM: { [dayOfWeek: number]: number[] } = {
  0: Array.from({ length: 29 }, (_, i) => i + 1),     // Sunday: 1-29
  1: Array.from({ length: 21 }, (_, i) => i + 30),    // Monday: 30-50
  2: Array.from({ length: 22 }, (_, i) => i + 51),    // Tuesday: 51-72
  3: Array.from({ length: 17 }, (_, i) => i + 73),    // Wednesday: 73-89
  4: Array.from({ length: 17 }, (_, i) => i + 90),    // Thursday: 90-106
  5: Array.from({ length: 13 }, (_, i) => i + 107),   // Friday: 107-119
  6: Array.from({ length: 31 }, (_, i) => i + 120),   // Shabbos: 120-150
};

// Hebrew day names for display
export const HEBREW_DAY_NAMES: { [dayOfWeek: number]: string } = {
  0: 'Yom Rishon',
  1: 'Yom Sheni',
  2: 'Yom Shlishi',
  3: 'Yom Revii',
  4: 'Yom Chamishi',
  5: 'Yom Shishi',
  6: 'Shabbos',
};

// Tehillim goal types
export type TehillimGoalType = 'weekly' | 'monthly' | 'custom';

export interface TehillimSettings {
  goalType: TehillimGoalType;
  customChaptersPerDay?: number; // For custom goal (e.g., 5 chapters/day)
}
