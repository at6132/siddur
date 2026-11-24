/**
 * Shared “Mark as complete” control for Sefiras HaOmer (practice screen + Maariv).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { GlassButton } from '../ui/GlassButton';
import { useTheme, type AppTheme } from '../../src/design/theme';
import { OmerCalculator } from '../../src/core/omer/OmerCalculator';
import { ZmanimService } from '../../src/core/zmanim/ZmanimService';
import { StorageService } from '../../src/storage/StorageService';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import type { LocationObject } from 'expo-location';
import { PRODUCT_EVENTS, trackProduct } from '../../src/analytics';

type Props = {
  /** Prefer this night when already known (e.g. from Maariv liturgy). */
  omerDay?: number | null;
  compact?: boolean;
};

export function OmerCountAction({ omerDay, compact }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [counted, setCounted] = useState(false);
  const [nightKey, setNightKey] = useState<number | null>(omerDay ?? null);

  const refresh = useCallback(async () => {
    const prefs = await UserPreferencesService.getPreferences();
    let locationObj: LocationObject | null = null;
    if (prefs?.location) {
      locationObj = {
        coords: {
          latitude: prefs.location.latitude,
          longitude: prefs.location.longitude,
          altitude: null,
          accuracy: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as LocationObject;
    }
    const now = new Date();
    const ext = await ZmanimService.calculateExtendedZmanim(now, locationObj);
    const sunset =
      ext.sunset instanceof Date && !Number.isNaN(ext.sunset.getTime()) ? ext.sunset : null;
    const tzeis =
      ext.tzeis instanceof Date && !Number.isNaN(ext.tzeis.getTime()) ? ext.tzeis : null;
    const displayN = OmerCalculator.getDisplayOmerDay(now, sunset, tzeis);
    const countN = OmerCalculator.getOmerNightToCount(now, sunset, tzeis);
    const after = !tzeis || now >= tzeis;
    const key =
      omerDay != null && omerDay >= 1 && omerDay <= 49
        ? omerDay
        : (after ? countN : displayN) ?? countN ?? displayN;
    setNightKey(key);

    if (key == null) {
      setCounted(false);
      return;
    }
    const [counts, cdNight] = await Promise.all([
      StorageService.getOmerCounts(),
      StorageService.getOmerWidgetCountdownAfterNight(),
    ]);
    const c = counts ?? {};
    const markedThisNight = after && !!c[key];
    const waitingForNextTzeit =
      !after && cdNight != null && cdNight + 1 === countN && !!c[cdNight];
    const markedDisplayDayEarly = !after && displayN != null && !!c[displayN];
    setCounted(markedThisNight || waitingForNextTzeit || markedDisplayDayEarly);
  }, [omerDay]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onToggle = async () => {
    if (nightKey == null) return;
    const next = !counted;
    if (next) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.selectionAsync();
    }
    await StorageService.markOmerDay(nightKey, next);
    await StorageService.setOmerWidgetCountdownAfterNight(next ? nightKey : null);
    trackProduct(PRODUCT_EVENTS.OMER_COUNTED, 'omer', {
      night: nightKey,
      counted: next,
      source: 'maariv',
    });
    setCounted(next);
  };

  if (nightKey == null) return null;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {!counted ? (
        <Text style={styles.hint}>{`Night ${nightKey} of the Omer`}</Text>
      ) : null}
      <GlassButton
        title={counted ? 'Counted' : 'Mark as complete'}
        variant={counted ? 'secondary' : 'primary'}
        size={compact ? 'md' : 'lg'}
        onPress={onToggle}
        style={styles.button}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  const { spacing, type } = theme.tokens;
  return StyleSheet.create({
    wrap: {
      marginTop: spacing.lg,
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    wrapCompact: {
      marginTop: spacing.md,
    },
    hint: {
      ...type.textStyles.label,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    button: {
      alignSelf: 'stretch',
    },
  });
}
