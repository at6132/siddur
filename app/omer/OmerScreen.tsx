import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen, Section, ListRow, GlassButton } from '../../components/ui';
import { PracticeHeader } from '../../components/hub/PracticeKit';
import { useTheme, type AppTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';
import { OmerCalculator } from '../../src/core/omer/OmerCalculator';
import { ZmanimService } from '../../src/core/zmanim/ZmanimService';
import { StorageService } from '../../src/storage/StorageService';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import type { LocationObject } from 'expo-location';
import { LOCATION_REQUIRED_MESSAGE, requestLocationFromUser } from '../../src/services/LocationAccess';
import {
  OMER_EXTRA_AFTER_COUNT,
  OMER_HARACHAMAN_HEBREW,
  getOmerRibonoShelOlamParagraph,
} from '../../src/content/omer/postOmerLiturgy';

function formatTimeUntilAt(now: Date, until: Date): string | null {
  const ms = until.getTime() - now.getTime();
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const remainderMins = mins % 60;
  if (hours > 0 && remainderMins > 0) return `${hours}h ${remainderMins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

function formatTimeLocal(date: Date | undefined): string {
  return ZmanimService.formatTime(date);
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const OmerScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { spacing } = theme.tokens;

  const [todayCounted, setTodayCounted] = useState(false);
  /** Sunset + tzeit for today; display/count nights derived with clock (see OmerCalculator). */
  const [omerZmanim, setOmerZmanim] = useState<{
    sunset: Date | null;
    tzeis: Date | null;
  } | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const [showReflection, setShowReflection] = useState(false);
  const [showExtraAfterOmer, setShowExtraAfterOmer] = useState(false);

  const loadOmerData = useCallback(async () => {
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
    const tz = ext.tzeis instanceof Date && !Number.isNaN(ext.tzeis.getTime()) ? ext.tzeis : null;
    const ss = ext.sunset instanceof Date && !Number.isNaN(ext.sunset.getTime()) ? ext.sunset : null;
    setOmerZmanim({ sunset: ss, tzeis: tz });
  }, []);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!omerZmanim) {
      setTodayCounted(false);
      return;
    }
    const { sunset, tzeis } = omerZmanim;
    const displayN = OmerCalculator.getDisplayOmerDay(clock, sunset, tzeis);
    const countN = OmerCalculator.getOmerNightToCount(clock, sunset, tzeis);
    if (displayN == null || countN == null) {
      setTodayCounted(false);
      return;
    }
    const after = !tzeis || clock >= tzeis;
    let cancelled = false;
    Promise.all([
      StorageService.getOmerCounts(),
      StorageService.getOmerWidgetCountdownAfterNight(),
    ]).then(([counts, cdNight]) => {
      if (cancelled) return;
      const c = counts ?? {};
      const markedThisNight = after && !!c[countN];
      const waitingForNextTzeit =
        !after &&
        cdNight != null &&
        cdNight + 1 === countN &&
        !!c[cdNight];
      const markedDisplayDayEarly = !after && displayN != null && !!c[displayN];
      setTodayCounted(markedThisNight || waitingForNextTzeit || markedDisplayDayEarly);
    });
    return () => {
      cancelled = true;
    };
  }, [omerZmanim, clock]);

  useFocusEffect(
    useCallback(() => {
      loadOmerData();
    }, [loadOmerData])
  );

  const tzeis = omerZmanim?.tzeis ?? null;
  const sunset = omerZmanim?.sunset ?? null;
  const displayNight =
    omerZmanim != null
      ? OmerCalculator.getDisplayOmerDay(clock, sunset, tzeis)
      : null;
  const countNight =
    omerZmanim != null
      ? OmerCalculator.getOmerNightToCount(clock, sunset, tzeis)
      : null;

  const afterTzeis = !tzeis || clock >= tzeis;
  const waitUntilTzeis = tzeis && !afterTzeis ? formatTimeUntilAt(clock, tzeis) : null;

  const toggleReflection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowReflection((v) => !v);
  };

  const toggleExtraAfterOmer = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowExtraAfterOmer((v) => !v);
  };

  const header = (
    <PracticeHeader onBack={() => navigation.goBack()} />
  );

  if (omerZmanim === null) {
    return <Screen header={header} state="loading" />;
  }

  if (displayNight === null) {
    return (
      <Screen
        header={header}
        state="empty"
        emptyTitle="Not counting now"
        emptyMessage="Omer is between Pesach and Shavuos. When it starts, this screen stays simple: tonight's words and one tap when you're done."
      />
    );
  }

  /** Before tzeit: marks on-screen day (displayNight). After tzeit: halachic count night. */
  const nightKeyForMark =
    (afterTzeis ? countNight : displayNight) ?? countNight ?? displayNight;

  const toggleToday = async () => {
    if (nightKeyForMark == null) return;
    const newCounted = !todayCounted;
    if (newCounted) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.selectionAsync();
    }
    await StorageService.markOmerDay(nightKeyForMark, newCounted);
    await StorageService.setOmerWidgetCountdownAfterNight(newCounted ? nightKeyForMark : null);
    setTodayCounted(newCounted);
  };

  const weekNum = OmerCalculator.getOmerWeek(displayNight);
  const blessing = OmerCalculator.getOmerBlessing(displayNight);
  const meditation = OmerCalculator.getSefirahMeditation(displayNight);
  const omerTonightTheme =
    OmerCalculator.getOmerInfo(displayNight)?.meaning ?? meditation?.title ?? '';
  const progress = (displayNight / 49) * 100;
  const isLagBaomer = displayNight === 33;

  const extraSections = [
    ...OMER_EXTRA_AFTER_COUNT,
    {
      title: 'רבונו של עולם',
      bodyHebrew: getOmerRibonoShelOlamParagraph(blessing.sefiraHebrew),
    },
  ];

  return (
    <Screen scroll header={header} bottomExtra={spacing.lg}>
      {/* Tonight's count */}
      <View style={styles.focal}>
        <Text style={styles.overline}>{`Night ${displayNight} · week ${weekNum}`}</Text>
        <View style={styles.digitRow}>
          <Text style={styles.bigDay} accessibilityLabel={`Night ${displayNight} of 49`}>
            {displayNight}
          </Text>
          <Text style={styles.ofLabel}>of 49</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        {isLagBaomer ? <Text style={styles.lagNote}>Lag BaOmer, a lighter day</Text> : null}
        {!tzeis ? (
          <Pressable
            onPress={async () => {
              const granted = await requestLocationFromUser();
              if (granted) await loadOmerData();
            }}
            accessibilityRole="button"
            style={styles.locationPrompt}
          >
            <Text style={styles.locationPromptText}>
              {`Nightfall ${ZmanimService.formatTime(null)}. ${LOCATION_REQUIRED_MESSAGE}`}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Liturgy: plain text on the gradient, separated by hairlines */}
      <View style={styles.liturgy}>
        <Text style={styles.brachaHebrew}>{blessing.blessingHebrew}</Text>
        <View style={styles.softRule} />
        <Text style={styles.countHebrew}>{blessing.countHebrew}</Text>
        <View style={styles.softRule} />
        <Text style={styles.harachamanHebrew}>{OMER_HARACHAMAN_HEBREW}</Text>
      </View>

      <Section>
        <ListRow
          title={showExtraAfterOmer ? 'Hide' : 'More tefillos after Harachaman'}
          trailing={
            <Ionicons
              name={showExtraAfterOmer ? 'chevron-up' : 'chevron-down'}
              size={theme.tokens.type.fontSize.lg}
              color={theme.colors.text.tertiary}
            />
          }
          onPress={toggleExtraAfterOmer}
        />
      </Section>
      {showExtraAfterOmer ? (
        <View style={styles.extraAfterOmerBody}>
          {extraSections.map((section) => (
            <View key={section.title} style={styles.extraLiturgySection}>
              <Text style={styles.extraLiturgyTitle}>{section.title}</Text>
              <Text style={styles.extraLiturgyHebrew}>{section.bodyHebrew}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Primary action */}
      {!afterTzeis && todayCounted ? (
        <Text style={styles.doneButtonCaption}>
          {`Today is day ${displayNight}. ${waitUntilTzeis ? `In ${waitUntilTzeis}: day ${countNight}` : `Next: day ${countNight}`} (after nightfall ${formatTimeLocal(tzeis ?? undefined)}).`}
        </Text>
      ) : null}
      <GlassButton
        title={todayCounted ? 'Counted' : 'Mark as complete'}
        variant={todayCounted ? 'secondary' : 'primary'}
        size="lg"
        onPress={toggleToday}
        disabled={nightKeyForMark == null}
        style={styles.doneButton}
      />

      {meditation ? (
        <View style={styles.optionalBlock}>
          <Section>
            <ListRow
              title={showReflection ? 'Close' : 'Something to work on today'}
              trailing={
                <Ionicons
                  name={showReflection ? 'chevron-up' : 'chevron-down'}
                  size={theme.tokens.type.fontSize.lg}
                  color={theme.colors.text.tertiary}
                />
              }
              onPress={toggleReflection}
            />
          </Section>
          {showReflection ? (
            <View>
              <Text style={styles.reflectionMeta}>
                <Text style={styles.reflectionStrong}>{`You're on night ${displayNight}`}</Text>
                {' of the count. Tradition gives this night a focus: '}
                <Text style={styles.reflectionStrong}>{omerTonightTheme}</Text>
                {'. The lines below are meant as a small, practical way to connect with that idea today.'}
              </Text>
              <Text style={styles.reflectionBody}>
                {meditation.meditation} {meditation.question}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
};

function createStyles(theme: AppTheme) {
  const { spacing, radii, type, hebrew } = theme.tokens;
  const hebrewBlock = (size: 'xsmall' | 'small' | 'medium') => ({
    ...hebrew.readerStyle(size),
    color: theme.colors.text.primary,
    textAlign: 'center' as const,
  });

  return StyleSheet.create({
    focal: {
      marginBottom: spacing.lg,
      marginHorizontal: spacing.sm,
    },
    overline: {
      ...type.textStyles.label,
      color: theme.colors.text.secondary,
      textTransform: 'uppercase',
    },
    digitRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    bigDay: {
      fontFamily: type.fonts.heading.bold,
      fontSize: type.fontSize['5xl'] * 1.5,
      lineHeight: type.fontSize['5xl'] * 1.5,
      letterSpacing: type.letterSpacing.tighter,
      color: theme.colors.primary.main,
    },
    ofLabel: {
      ...type.textStyles.bodyLarge,
      color: theme.colors.text.secondary,
    },
    progressTrack: {
      height: spacing.xs,
      borderRadius: radii.full,
      overflow: 'hidden',
      marginTop: spacing.md,
      backgroundColor: colorWithAlpha(theme.colors.primary.main, 0.18),
    },
    progressFill: {
      height: '100%',
      borderRadius: radii.full,
      backgroundColor: theme.colors.primary.main,
    },
    lagNote: {
      ...type.textStyles.label,
      color: theme.colors.text.primary,
      marginTop: spacing.sm,
    },
    locationPrompt: {
      minHeight: 44,
      justifyContent: 'center',
      marginTop: spacing.xs,
    },
    locationPromptText: {
      ...type.textStyles.bodySmall,
      color: theme.colors.text.secondary,
    },
    liturgy: {
      paddingVertical: spacing.md,
      marginBottom: spacing.lg,
    },
    brachaHebrew: hebrewBlock('small'),
    countHebrew: hebrewBlock('medium'),
    harachamanHebrew: hebrewBlock('small'),
    softRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.neutral[300],
      marginVertical: spacing.lg,
      alignSelf: 'stretch',
    },
    extraAfterOmerBody: {
      paddingBottom: spacing.sm,
      marginBottom: spacing.md,
    },
    extraLiturgySection: {
      marginBottom: spacing.lg,
    },
    extraLiturgyTitle: {
      ...type.textStyles.label,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    extraLiturgyHebrew: hebrewBlock('xsmall'),
    doneButtonCaption: {
      ...type.textStyles.bodySmall,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    doneButton: {
      marginBottom: spacing.lg,
    },
    optionalBlock: {
      marginBottom: spacing.lg,
    },
    reflectionMeta: {
      ...type.textStyles.bodySmall,
      color: theme.colors.text.tertiary,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.md,
    },
    reflectionStrong: {
      fontFamily: type.fonts.body.semibold,
      color: theme.colors.text.secondary,
    },
    reflectionBody: {
      ...type.textStyles.body,
      color: theme.colors.text.secondary,
      paddingHorizontal: spacing.sm,
    },
  });
}
