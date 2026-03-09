/**
 * Typography System
 * Elegant, feminine type scale with custom fonts
 * 
 * Fonts:
 * - Cormorant Garamond: Elegant serif for headings
 * - Nunito: Soft, friendly sans-serif for body
 */

export const fonts = {
  // Heading font - elegant serif (Latin/English)
  heading: {
    regular: 'CormorantGaramond_400Regular',
    medium: 'CormorantGaramond_500Medium',
    semibold: 'CormorantGaramond_600SemiBold',
    bold: 'CormorantGaramond_700Bold',
  },
  // Body font - soft sans-serif
  body: {
    regular: 'Nunito_400Regular',
    medium: 'Nunito_500Medium',
    semibold: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
  },
  // Hebrew font - serif with full nikkud/taamim mark anchoring
  hebrew: {
    regular: 'FrankRuhlLibre_400Regular',
    medium: 'FrankRuhlLibre_500Medium',
    semibold: 'FrankRuhlLibre_600SemiBold',
    bold: 'FrankRuhlLibre_700Bold',
  },
} as const;

export const typography = {
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
    loose: 2,
  },

  // Letter spacing
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },
} as const;

// Predefined text styles
export const textStyles = {
  // Headings - using elegant serif font
  h1: {
    fontFamily: fonts.heading.bold,
    fontSize: typography.fontSize['5xl'],
    lineHeight: typography.fontSize['5xl'] * typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.wide,
  },
  h2: {
    fontFamily: fonts.heading.semibold,
    fontSize: typography.fontSize['4xl'],
    lineHeight: typography.fontSize['4xl'] * typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.normal,
  },
  h3: {
    fontFamily: fonts.heading.semibold,
    fontSize: typography.fontSize['2xl'],
    lineHeight: typography.fontSize['2xl'] * typography.lineHeight.snug,
  },
  h4: {
    fontFamily: fonts.heading.medium,
    fontSize: typography.fontSize.xl,
    lineHeight: typography.fontSize.xl * typography.lineHeight.normal,
  },

  // Body text - using soft sans-serif
  body: {
    fontFamily: fonts.body.regular,
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  bodyBold: {
    fontFamily: fonts.body.semibold,
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  bodyLarge: {
    fontFamily: fonts.body.regular,
    fontSize: typography.fontSize.lg,
    lineHeight: typography.fontSize.lg * typography.lineHeight.relaxed,
  },
  bodySmall: {
    fontFamily: fonts.body.regular,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },

  // Special text styles
  caption: {
    fontFamily: fonts.body.regular,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
  },
  label: {
    fontFamily: fonts.body.medium,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.wide,
  },

  // Display text - for splash/intro
  display: {
    fontFamily: fonts.heading.bold,
    fontSize: 52,
    lineHeight: 52 * typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.wider,
  },
} as const;

export type FontFamily = typeof fonts;
export type TypographyKey = keyof typeof typography;
export type TextStyleKey = keyof typeof textStyles;
