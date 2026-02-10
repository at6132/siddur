/**
 * Liquid Glass Design System - Color Palettes
 * Feminine, calm, modern palette for the 24/7 app
 */

export const lightColors = {
  // Primary palette - soft, feminine
  primary: {
    light: '#F5E6E8', // Soft rose
    main: '#D4A5B8', // Muted rose
    dark: '#B88FA3', // Deeper rose
  },

  // Secondary palette - calming blues
  secondary: {
    light: '#E8F0F5', // Sky mist
    main: '#A5C4D4', // Soft blue
    dark: '#8FA3B8', // Deeper blue
  },

  // Accent colors
  accent: {
    gold: '#E8D4A5', // Warm gold
    lavender: '#D4C4E8', // Soft lavender
    sage: '#C4D4A5', // Gentle sage
  },

  // Backgrounds - layered for depth
  background: {
    primary: '#FFFFFF', // Pure white
    secondary: '#FAF9F7', // Warm off-white
    tertiary: '#F5F3F0', // Soft beige
    glass: 'rgba(255, 255, 255, 0.7)', // Glass overlay
  },

  // Text colors
  text: {
    primary: '#2C2C2C', // Soft black
    secondary: '#6B6B6B', // Medium gray
    tertiary: '#9B9B9B', // Light gray
    inverse: '#FFFFFF', // White text
  },

  // Neutral grays
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // Semantic colors (soft, never alarming)
  semantic: {
    success: '#A5D4B8', // Soft green
    info: '#A5C4D4', // Soft blue
    warning: '#E8D4A5', // Soft yellow
    error: '#D4A5A5', // Soft red (never harsh)
  },

  // Glass effects
  glass: {
    light: 'rgba(255, 255, 255, 0.8)',
    medium: 'rgba(255, 255, 255, 0.6)',
    dark: 'rgba(255, 255, 255, 0.4)',
    blur: 'rgba(255, 255, 255, 0.3)',
  },

  // Shadows (soft, never harsh)
  shadow: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.15)',
  },
} as const;

export const darkColors: typeof lightColors = {
  primary: {
    light: '#F5CFE2',
    main: '#E2A8C5',
    dark: '#C87AA1',
  },
  secondary: {
    light: '#89B6CE',
    main: '#6D9FB9',
    dark: '#507890',
  },
  accent: {
    gold: '#C9A86A',
    lavender: '#B8A0D2',
    sage: '#8FB28F',
  },
  background: {
    primary: '#08070C',
    secondary: '#110F18',
    tertiary: '#191625',
    glass: 'rgba(12, 10, 18, 0.6)',
  },
  text: {
    primary: '#F8F4F9',
    secondary: '#D8CEE4',   // Soft lavender (no grey)
    tertiary: '#B8A8D0',   // Muted lavender
    inverse: '#0A070D',
  },
  neutral: {
    50: '#17141F',
    100: '#1F1B28',
    200: '#2A2534',
    300: '#3A3448',
    400: '#4E4662',
    500: '#6A607C',
    600: '#8A7E9C',
    700: '#A89EBC',
    800: '#C4B8D8',
    900: '#D8CEE4',
  },
  semantic: {
    success: '#80C9A5',
    info: '#7DAECE',
    warning: '#CBA96A',
    error: '#E394A3',
  },
  glass: {
    light: 'rgba(255, 255, 255, 0.18)',
    medium: 'rgba(255, 255, 255, 0.14)',
    dark: 'rgba(255, 255, 255, 0.1)',
    blur: 'rgba(255, 255, 255, 0.08)',
  },
  shadow: {
    light: 'rgba(0, 0, 0, 0.45)',
    medium: 'rgba(0, 0, 0, 0.55)',
    dark: 'rgba(0, 0, 0, 0.65)',
  },
};

export type ColorPalette = typeof lightColors;

/** @deprecated Use useTheme() and theme.colors for themed screens. Use lightColors for static utilities. */
export const colors = lightColors;