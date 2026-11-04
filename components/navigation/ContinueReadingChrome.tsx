import React, { useCallback, useEffect, useState } from 'react';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { MiniPlayer } from '../ui/MiniPlayer';
import {
  LastPrayerSessionService,
  type LastPrayerSession,
} from '../../src/storage/LastPrayerSession';

/** Clears floating LiquidGlassTabBar (64 bar + 12 margin + gap). */
const TAB_BAR_CLEARANCE = 88;

function routeTreeHasSiddurReader(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;
  const s = state as { index?: number; routes?: Array<{ name?: string; state?: unknown }> };
  const routes = s.routes;
  if (!routes || routes.length === 0) return false;
  const idx = typeof s.index === 'number' ? s.index : routes.length - 1;
  const route = routes[idx];
  if (!route) return false;
  if (route.name === 'SiddurReader') return true;
  return routeTreeHasSiddurReader(route.state);
}

/**
 * Continue-where-you-left-off strip above the tab bar.
 * Opens root SiddurReader with the persisted prayer session.
 */
export function ContinueReadingChrome() {
  const navigation = useNavigation<any>();
  const [session, setSession] = useState<LastPrayerSession | null>(null);
  const onSiddurReader = useNavigationState((state) => routeTreeHasSiddurReader(state));

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const next = await LastPrayerSessionService.get();
      if (alive) setSession(next);
    };
    load();
    const id = setInterval(load, 1500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const onPress = useCallback(() => {
    if (!session) return;
    navigation.navigate('SiddurReader', {
      service: session.service,
      sectionKey: session.sectionKey,
      resumeProgress: session.progress,
    });
  }, [navigation, session]);

  if (!session || onSiddurReader) return null;

  return (
    <MiniPlayer
      title={session.titleEnglish}
      titleHebrew={session.titleHebrew || undefined}
      progress={session.progress}
      visible
      bottomOffset={TAB_BAR_CLEARANCE}
      onPress={onPress}
    />
  );
}
