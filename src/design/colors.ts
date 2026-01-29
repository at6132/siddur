/**
 * Liquid Glass Design System - Color Palette
 * Feminine, calm, modern palette for the Siddur app
 */

export const colors = {
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

export type ColorKey = keyof typeof colors;
export type ColorValue = typeof colors[ColorKey];

