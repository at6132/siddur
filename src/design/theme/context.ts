import { createContext, useContext } from 'react';
import { darkColors, lightColors, ColorPalette } from '../colors';
import { ThemePreference } from '../../types/preferences';

export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
  mode: ThemeMode;
  isDark: boolean;
  colors: ColorPalette;
  backgroundGradient: [string, string, string];
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
  const backgroundGradient: [string, string, string] =
    mode === 'dark'
      ? ['#0A0811', '#141129', '#0D0F1C']
      : ['#FAF9F7', '#F5E6E8', '#E8F0F5'];

  return {
    mode,
    isDark: mode === 'dark',
    colors: palette,
    backgroundGradient,
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
