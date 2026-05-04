/** Keep in sync with `ThemeMode` in `./theme/context` (avoid circular import). */
export type ScreenGradientMode = 'light' | 'dark';

/** Canonical 3-stop screen background (matches `buildTheme` / brand kit). */
export const LIGHT_SCREEN_GRADIENT = ['#FAF9F7', '#F5E6E8', '#E8F0F5'] as const;
export const DARK_SCREEN_GRADIENT = ['#0A0811', '#141129', '#0D0F1C'] as const;

export type ScreenGradientTuple = readonly [string, string, string];
export type ScreenGradientLoopTuple = readonly [string, string, string, string];

export function screenBackgroundGradient(mode: ScreenGradientMode): ScreenGradientTuple {
  return mode === 'dark' ? DARK_SCREEN_GRADIENT : LIGHT_SCREEN_GRADIENT;
}

/** Closed loop for LinearGradient (returns to first stop). */
export function screenBackgroundGradientLoop(mode: ScreenGradientMode): ScreenGradientLoopTuple {
  const g = screenBackgroundGradient(mode);
  return [g[0], g[1], g[2], g[0]];
}

/**
 * Same brand stops as the default loop, different order (onboarding / emphasis).
 * Dark mode: falls back to canonical loop until dedicated dark variants exist.
 */
export function screenBackgroundGradientLoopAltWelcome(mode: ScreenGradientMode): ScreenGradientLoopTuple {
  if (mode === 'dark') return screenBackgroundGradientLoop(mode);
  const g = LIGHT_SCREEN_GRADIENT;
  return [g[1], g[0], g[2], g[0]];
}

export function screenBackgroundGradientLoopAltNotifications(mode: ScreenGradientMode): ScreenGradientLoopTuple {
  if (mode === 'dark') return screenBackgroundGradientLoop(mode);
  const g = LIGHT_SCREEN_GRADIENT;
  return [g[2], g[0], g[1], g[0]];
}

export function screenBackgroundGradientLoopAltSpiritual(mode: ScreenGradientMode): ScreenGradientLoopTuple {
  if (mode === 'dark') return screenBackgroundGradientLoop(mode);
  const g = LIGHT_SCREEN_GRADIENT;
  return [g[0], g[2], g[1], g[0]];
}

/** Light-mode defaults when a screen does not call `useTheme()` (app may force light). Prefer `theme.backgroundGradient`. */
export const DEFAULT_SCREEN_BACKGROUND = LIGHT_SCREEN_GRADIENT;
export const DEFAULT_SCREEN_BACKGROUND_LOOP = screenBackgroundGradientLoop('light');

/** First two stops (cream → rose) for compact gradients. */
export const DEFAULT_SCREEN_BACKGROUND_SOFT = [LIGHT_SCREEN_GRADIENT[0], LIGHT_SCREEN_GRADIENT[1]] as const;
