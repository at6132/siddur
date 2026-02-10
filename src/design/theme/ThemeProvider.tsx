import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeContext, buildTheme } from './context';
import { ThemePreference } from '../../types/preferences';
import { UserPreferencesService } from '../../storage/UserPreferences';
import type { ThemeMode } from './context';

// Dark mode disabled for now: always light, ignore system and stored preference
const FORCE_LIGHT_MODE = true;

const resolveMode = (preference: ThemePreference, systemScheme: ThemeMode): ThemeMode =>
  FORCE_LIGHT_MODE ? 'light' : (preference === 'system' ? systemScheme : preference);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme();
  const systemMode: ThemeMode = colorScheme === 'dark' ? 'dark' : 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [hasLoadedPreference, setHasLoadedPreference] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const prefs = await UserPreferencesService.getPreferences();
      if (!isMounted) return;
      const storedPreference = prefs?.display?.themePreference ?? 'system';
      setPreferenceState(storedPreference);
      setHasLoadedPreference(true);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const setPreference = useCallback(
    async (value: ThemePreference) => {
      setPreferenceState(value);
      await UserPreferencesService.setDisplayPreferences({ themePreference: value });
    },
    []
  );

  const mode = resolveMode(preference, systemMode);

  const theme = useMemo(() => buildTheme(mode), [mode]);

  const value = useMemo(
    () => ({
      theme,
      preference,
      setPreference,
    }),
    [theme, preference, setPreference]
  );

  if (!hasLoadedPreference) {
    return (
      <ThemeContext.Provider value={value}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
