/**
 * Design-system token facade.
 * Values come from CURRENT-TOKENS.md via existing color/spacing/type modules —
 * do not invent new brand hues here.
 */

import { lightColors, darkColors, type ColorPalette } from '../colors';
import { spacing as baseSpacing, borderRadius, shadows } from '../spacing';
import {
  fonts,
  typography,
  textStyles,
} from '../typography';
import {
  LIGHT_SCREEN_GRADIENT,
  DARK_SCREEN_GRADIENT,
  type ScreenGradientTuple,
} from '../screenGradient';
import type { TextStyle } from 'react-native';

/** Extended spacing: base scale + inventory-aligned gaps. */
export const spacing = {
  ...baseSpacing,
  /** Micro gap (2px) for tight icon/label pairing */
  '2xs': 2,
  /** Common 12px step between sm and md */
  '3sm': 12,
  /** Locked horizontal screen padding (airy) */
  gutter: 20,
} as const;

export const radii = borderRadius;

/** Reader / liturgical text size steps (matches DisplayPreferences.textSize). */
export type HebrewReaderSize = 'xsmall' | 'small' | 'medium' | 'large';

const hebrewReaderFontSize: Record<HebrewReaderSize, number> = {
  xsmall: 15,
  small: 18,
  medium: 22,
  large: 26,
};

const hebrewReaderLineHeight: Record<HebrewReaderSize, number> = {
  xsmall: 26,
  small: 32,
  medium: 40,
  large: 48,
};

/** RTL defaults for Hebrew liturgical blocks — never fall back to system fonts. */
export const hebrewLayout: Pick<TextStyle, 'writingDirection' | 'textAlign'> = {
  writingDirection: 'rtl',
  textAlign: 'right',
};

export const hebrewTextStyles = {
  body: {
    fontFamily: fonts.hebrew.medium,
    fontSize: typography.fontSize.lg,
    lineHeight: typography.fontSize.lg * typography.lineHeight.loose,
    ...hebrewLayout,
  },
  bodyLarge: {
    fontFamily: fonts.hebrew.medium,
    fontSize: typography.fontSize['2xl'],
    lineHeight: typography.fontSize['2xl'] * typography.lineHeight.loose,
    ...hebrewLayout,
  },
  caption: {
    fontFamily: fonts.hebrew.regular,
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    ...hebrewLayout,
  },
} as const;

/** Map user-adjustable reader size → Frank Ruhl Libre style (nikud-friendly). */
export function hebrewReaderStyle(size: HebrewReaderSize = 'medium'): TextStyle {
  return {
    fontFamily: fonts.hebrew.medium,
    fontSize: hebrewReaderFontSize[size],
    lineHeight: hebrewReaderLineHeight[size],
    ...hebrewLayout,
  };
}

export const glassBlur = {
  /** Blur intensity for chrome (tab bar, floating controls, mini-player). Never on content cards. */
  chrome: 70,
  button: 20,
} as const;

export const tokens = {
  colors: {
    light: lightColors,
    dark: darkColors,
  },
  spacing,
  radii,
  borderRadius: radii,
  type: {
    fontSize: typography.fontSize,
    lineHeight: typography.lineHeight,
    letterSpacing: typography.letterSpacing,
    fonts,
    textStyles,
  },
  hebrew: {
    fonts: fonts.hebrew,
    layout: hebrewLayout,
    textStyles: hebrewTextStyles,
    readerFontSize: hebrewReaderFontSize,
    readerLineHeight: hebrewReaderLineHeight,
    readerStyle: hebrewReaderStyle,
  },
  shadows,
  glass: {
    light: lightColors.glass,
    dark: darkColors.glass,
    /** Blur intensity (not the `glass.blur` color stop). */
    intensity: glassBlur,
  },
  gradients: {
    screen: {
      light: LIGHT_SCREEN_GRADIENT as ScreenGradientTuple,
      dark: DARK_SCREEN_GRADIENT as ScreenGradientTuple,
    },
  },
} as const;

export type DesignTokens = typeof tokens;
export type ThemeTokens = {
  colors: ColorPalette;
  spacing: typeof spacing;
  radii: typeof radii;
  type: typeof tokens.type;
  hebrew: typeof tokens.hebrew;
  shadows: typeof shadows;
  glass: ColorPalette['glass'] & { intensity: typeof glassBlur };
  gradients: {
    screen: ScreenGradientTuple;
  };
};

/** Resolve mode-aware token slice for AppTheme. */
export function buildThemeTokens(mode: 'light' | 'dark'): ThemeTokens {
  const palette = mode === 'dark' ? darkColors : lightColors;
  return {
    colors: palette,
    spacing,
    radii,
    type: tokens.type,
    hebrew: tokens.hebrew,
    shadows,
    glass: {
      ...palette.glass,
      intensity: glassBlur,
    },
    gradients: {
      screen: mode === 'dark' ? DARK_SCREEN_GRADIENT : LIGHT_SCREEN_GRADIENT,
    },
  };
}
