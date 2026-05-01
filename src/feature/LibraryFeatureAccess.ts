/**
 * Library “phase 1” — only some destinations are live; others show Coming soon.
 */

export const AVAILABLE_SIDDUR_SERVICES = new Set([
  'shacharis',
  'mincha',
  'maariv',
  'bentching',
  'asher_yatzar',
  'tefilas_haderech',
  'bedtime',
]);

/** More Texts grid items that navigate (not Tehillim list / not phase-1 siddur). */
export const LIBRARY_GRID_COMING_SOON_IDS = new Set([
  'gemara',
  'nach',
  'mishna',
  'rambam',
  'chumash',
  'pirkei_avos',
]);

export function isSiddurServiceAvailable(service: string): boolean {
  return AVAILABLE_SIDDUR_SERVICES.has(service);
}

/** Root stack routes that open full experiences not ready in phase 1. */
export const UNAVAILABLE_LIBRARY_ROOT_SCREENS = new Set([
  'Parsha',
  'Gemara',
  'GemaraTractate',
  'GemaraReader',
  'Nach',
  'NachBook',
  'NachReader',
  'Mishna',
  'MishnaTractate',
  'MishnaReader',
  'Rambam',
  'RambamBook',
  'RambamSection',
  'RambamReader',
  'Chumash',
  'ChumashParshahPicker',
  'ChumashReader',
  'PirkeiAvos',
]);

export function isRootLibraryScreenComingSoon(screenName: string): boolean {
  return UNAVAILABLE_LIBRARY_ROOT_SCREENS.has(screenName);
}

export function navigateOrComingSoon(
  navigation: { navigate: (name: string, params?: Record<string, unknown>) => void },
  target:
    | { type: 'siddur'; service: string }
    | { type: 'screen'; name: string; params?: Record<string, unknown> },
): void {
  if (target.type === 'siddur') {
    if (isSiddurServiceAvailable(target.service)) {
      navigation.navigate('SiddurReader', { service: target.service });
    } else {
      navigation.navigate('ComingSoon', { featureTitle: target.service });
    }
    return;
  }
  if (isRootLibraryScreenComingSoon(target.name)) {
    navigation.navigate('ComingSoon', { featureTitle: target.name });
    return;
  }
  navigation.navigate(target.name, target.params ?? {});
}

/** Home marketplace: learning widgets tied to disabled library flows. */
export const PANEL_TYPES_LIBRARY_PHASE2 = new Set<string>([
  'weekly_parsha',
  'daf_yomi',
  'nach_yomi',
  'mishna_yomis',
  'parsha_summary',
  'rambam_daily',
  'chumash_daily',
]);

export function isPanelLibraryPhase2ComingSoon(panelType: string): boolean {
  return PANEL_TYPES_LIBRARY_PHASE2.has(panelType);
}
