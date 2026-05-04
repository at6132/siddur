import { createContext, useContext } from 'react';
import { darkColors, lightColors, ColorPalette } from '../colors';
import { ThemePreference } from '../../types/preferences';
import { screenBackgroundGradient, screenBackgroundGradientLoop } from '../screenGradient';

export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
  mode: ThemeMode;
  isDark: boolean;
  colors: ColorPalette;
  backgroundGradient: [string, string, string];
  /** Same stops as `backgroundGradient` with first repeated (onboarding / splash loops). */
  backgroundGradientLoop: [string, string, string, string];
  statusBarStyle: 'light' | 'dark';
}

export interface ThemeContextValue {
  theme: AppTheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const buildTheme = (mode: ThemeMode): AppTheme => {
  const palette = mode === 'dark' ? darkColors : lightColors;
  const backgroundGradient = [...screenBackgroundGradient(mode)] as [string, string, string];
  const backgroundGradientLoop = [...screenBackgroundGradientLoop(mode)] as [
    string,
    string,
    string,
    string,
  ];

  return {
    mode,
    isDark: mode === 'dark',
    colors: palette,
    backgroundGradient,
    backgroundGradientLoop,
    statusBarStyle: mode === 'dark' ? 'light' : 'dark',
  };
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
