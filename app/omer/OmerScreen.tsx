import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FadeIn } from '../../components/animations/FadeIn';
import { BackButton } from '../../components/ui/BackButton';
import { GlassCard } from '../home/components/GlassCard';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import { OmerCalculator } from '../../src/core/omer/OmerCalculator';
import { ZmanimService } from '../../src/core/zmanim/ZmanimService';
import { StorageService } from '../../src/storage/StorageService';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import type { LocationObject } from 'expo-location';
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
  if (!date) return '--:--';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const OmerScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(), []);

  const [todayCounted, setTodayCounted] = useState(false);
  /** Sunset + tzeit for today; display/count nights derived with clock (see OmerCalculator). */
  const [omerZmanim, setOmerZmanim] = useState<{
    sunset: Date | null;
    tzeis: Date | null;
  } | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const [checkAnim] = useState(new Animated.Value(0));
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

  useEffect(() => {
    if (todayCounted) {
      Animated.spring(checkAnim, {
        toValue: 1,
        tension: 55,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(checkAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [todayCounted, checkAnim]);

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

  const checkScale = checkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1.2],
  });

  if (omerZmanim === null) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={theme.backgroundGradient} style={StyleSheet.absoluteFill} />
        <View style={[styles.headerMinimal, { paddingTop: insets.top + spacing.xs }]}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  if (displayNight === null) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={theme.backgroundGradient} style={StyleSheet.absoluteFill} />
        <View style={[styles.headerMinimal, { paddingTop: insets.top + spacing.xs }]}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
        <View style={styles.emptyOuter}>
          <FadeIn delay={0}>
            <Text style={[styles.emptyKicker, { color: theme.colors.text.tertiary }]}>Rest</Text>
            <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>Not counting now</Text>
            <Text style={[styles.emptyBody, { color: theme.colors.text.secondary }]}>
              Omer is between Pesach and Shavuos. When it starts, this screen stays simple: tonight's words
              and one tap when you're done.
            </Text>
          </FadeIn>
        </View>
      </View>
    );
  }

  /** Before tzeit: marks on-screen day (displayNight). After tzeit: halachic count night. */
  const nightKeyForMark =
    (afterTzeis ? countNight : displayNight) ?? countNight ?? displayNight;

  const toggleToday = async () => {
    if (nightKeyForMark == null) return;
    const newCounted = !todayCounted;
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

  return (
    <View style={styles.root}>
      <LinearGradient colors={theme.backgroundGradient} style={StyleSheet.absoluteFill} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl * 2 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerMinimal, { paddingTop: insets.top + spacing.xs }]}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>

        <View style={styles.focal}>
          <View style={styles.focalTop}>
            <Text style={[styles.nightWhisper, { color: theme.colors.text.tertiary }]}>
              Night {displayNight} · week {weekNum}
            </Text>
            {isLagBaomer && (
              <Text style={[styles.lagWhisper, { color: theme.colors.primary.dark }]}>
                Lag BaOmer — a lighter day
              </Text>
            )}
          </View>
          <View style={styles.focalDigitWrap}>
            <Text style={[styles.bigDay, { color: theme.colors.primary.main }]}>{displayNight}</Text>
          </View>
          <View style={styles.focalBottom}>
            <Text style={[styles.bigDayCaption, { color: theme.colors.text.secondary }]}>of 49</Text>
            <View style={[styles.progressLine, { backgroundColor: `${theme.colors.primary.main}18` }]}>
              <View
                style={[
                  styles.progressLineFill,
                  { width: `${progress}%`, backgroundColor: theme.colors.primary.main },
                ]}
              />
            </View>
          </View>
        </View>

        <GlassCard style={styles.mainCard}>
          <Text style={[styles.brachaHebrew, { color: theme.colors.text.primary }]}>
            {blessing.blessingHebrew}
          </Text>

          <View style={[styles.softRule, { backgroundColor: theme.colors.neutral[200] }]} />

          <Text style={[styles.countHebrew, { color: theme.colors.text.primary }]}>
            {blessing.countHebrew}
          </Text>

          <View style={[styles.softRule, { backgroundColor: theme.colors.neutral[200] }]} />

          <Text style={[styles.harachamanHebrew, { color: theme.colors.text.primary }]}>
            {OMER_HARACHAMAN_HEBREW}
          </Text>

          <View style={styles.extraAfterOmerWrap}>
            <TouchableOpacity
              onPress={toggleExtraAfterOmer}
              activeOpacity={0.7}
              style={styles.disclosureRow}
            >
              <Text style={[styles.disclosureLabel, { color: theme.colors.text.secondary }]}>
                {showExtraAfterOmer ? 'Hide' : 'More tefillos after Harachaman'}
              </Text>
              <Text style={[styles.disclosureChevron, { color: theme.colors.text.tertiary }]}>
                {showExtraAfterOmer ? '⌃' : '⌄'}
              </Text>
            </TouchableOpacity>
            {showExtraAfterOmer && (
              <View style={styles.extraAfterOmerBody}>
                {[
                  ...OMER_EXTRA_AFTER_COUNT,
                  {
                    title: 'רבונו של עולם',
                    bodyHebrew: getOmerRibonoShelOlamParagraph(blessing.sefiraHebrew),
                  },
                ].map((section) => (
                  <View key={section.title} style={styles.extraLiturgySection}>
                    <Text style={[styles.extraLiturgyTitle, { color: theme.colors.text.secondary }]}>
                      {section.title}
                    </Text>
                    <Text style={[styles.extraLiturgyHebrew, { color: theme.colors.text.primary }]}>
                      {section.bodyHebrew}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {!afterTzeis && todayCounted && (
            <Text style={[styles.doneButtonCaption, { color: theme.colors.text.secondary }]}>
              {`Today is day ${displayNight}. ${waitUntilTzeis ? `In ${waitUntilTzeis}: day ${countNight}` : `Next: day ${countNight}`} (after nightfall ${formatTimeLocal(tzeis ?? undefined)}).`}
            </Text>
          )}
          <TouchableOpacity
            style={[
              styles.doneButton,
              {
                backgroundColor: todayCounted
                  ? !afterTzeis
                    ? theme.isDark
                      ? theme.colors.neutral[600]
                      : theme.colors.neutral[200]
                    : theme.colors.semantic.success
                  : theme.colors.primary.main,
              },
            ]}
            onPress={toggleToday}
            activeOpacity={0.88}
            disabled={nightKeyForMark == null}
          >
            {todayCounted ? (
              <Animated.Text
                style={[
                  styles.doneButtonText,
                  {
                    color: !afterTzeis
                      ? theme.isDark
                        ? '#fff'
                        : theme.colors.text.primary
                      : '#fff',
                    transform: [{ scale: checkScale }],
                  },
                ]}
              >
                Counted ✓
              </Animated.Text>
            ) : (
              <Text style={styles.doneButtonText}>Mark as complete</Text>
            )}
          </TouchableOpacity>
        </GlassCard>

        {meditation && (
          <View style={styles.optionalBlock}>
            <TouchableOpacity onPress={toggleReflection} activeOpacity={0.7} style={styles.disclosureRow}>
              <Text style={[styles.disclosureLabel, { color: theme.colors.text.secondary }]}>
                {showReflection ? 'Close' : 'Something to work on today'}
              </Text>
              <Text style={[styles.disclosureChevron, { color: theme.colors.text.tertiary }]}>
                {showReflection ? '⌃' : '⌄'}
              </Text>
            </TouchableOpacity>
            {showReflection && (
              <View>
                <Text style={[styles.reflectionMeta, { color: theme.colors.text.tertiary }]}>
                  <Text style={{ fontFamily: fonts.body.semiBold, color: theme.colors.text.secondary }}>
                    You're on night {displayNight}
                  </Text>
                  {' '}
                  of the count. Tradition gives this night a focus —{' '}
                  <Text style={{ fontFamily: fonts.body.semiBold, color: theme.colors.text.secondary }}>
                    {omerTonightTheme}
                  </Text>
                  . The lines below are meant as a small, practical way to connect with that idea today.
                </Text>
                <Text style={[styles.reflectionBody, { color: theme.colors.text.secondary }]}>
                  {meditation.meditation} {meditation.question}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

function createStyles() {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg + spacing.xs,
    },
    headerMinimal: {
      marginBottom: spacing.sm,
    },
    focal: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    focalTop: {
      alignItems: 'center',
      width: '100%',
    },
    nightWhisper: {
      fontFamily: fonts.body.medium,
      fontSize: 13,
      letterSpacing: 0.3,
      marginBottom: 2,
    },
    lagWhisper: {
      fontFamily: fonts.body.medium,
      fontSize: 13,
      marginBottom: 0,
    },
    focalDigitWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      paddingVertical: spacing.xs,
    },
    focalBottom: {
      alignItems: 'center',
      width: '100%',
    },
    bigDay: {
      fontFamily: fonts.heading.bold,
      fontSize: 72,
      lineHeight: 72,
      letterSpacing: -2,
      textAlign: 'center',
    },
    bigDayCaption: {
      fontFamily: fonts.body.regular,
      fontSize: 16,
      marginTop: 2,
      marginBottom: spacing.sm,
    },
    progressLine: {
      width: '100%',
      maxWidth: 200,
      height: 3,
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: spacing.sm,
    },
    progressLineFill: {
      height: '100%',
      borderRadius: 2,
    },
    mainCard: {
      marginBottom: spacing.lg,
    },
    brachaHebrew: {
      fontFamily: fonts.hebrew.regular,
      fontSize: 18,
      lineHeight: 30,
      textAlign: 'center',
      writingDirection: 'rtl',
    },
    softRule: {
      height: StyleSheet.hairlineWidth,
      marginVertical: spacing.lg,
      alignSelf: 'stretch',
    },
    countHebrew: {
      fontFamily: fonts.hebrew.regular,
      fontSize: 22,
      lineHeight: 34,
      textAlign: 'center',
      writingDirection: 'rtl',
      marginBottom: 0,
    },
    harachamanHebrew: {
      fontFamily: fonts.hebrew.regular,
      fontSize: 19,
      lineHeight: 31,
      textAlign: 'center',
      writingDirection: 'rtl',
      marginBottom: spacing.md,
    },
    extraAfterOmerWrap: {
      marginBottom: spacing.lg,
    },
    extraAfterOmerBody: {
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
    },
    extraLiturgySection: {
      marginBottom: spacing.lg,
    },
    extraLiturgyTitle: {
      fontFamily: fonts.body.semiBold,
      fontSize: 13,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    extraLiturgyHebrew: {
      fontFamily: fonts.hebrew.regular,
      fontSize: 17,
      lineHeight: 28,
      textAlign: 'center',
      writingDirection: 'rtl',
    },
    doneButton: {
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md + 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneButtonCaption: {
      fontFamily: fonts.body.regular,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      marginBottom: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    doneButtonText: {
      fontFamily: fonts.body.semiBold,
      fontSize: 17,
      color: '#fff',
    },
    optionalBlock: {
      marginBottom: spacing.xl,
    },
    disclosureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    disclosureLabel: {
      fontFamily: fonts.body.medium,
      fontSize: 15,
    },
    disclosureChevron: {
      fontSize: 14,
      marginTop: 2,
    },
    reflectionMeta: {
      fontFamily: fonts.body.regular,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      marginBottom: spacing.md,
    },
    reflectionBody: {
      fontFamily: fonts.body.regular,
      fontSize: 15,
      lineHeight: 24,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    emptyOuter: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg + spacing.md,
      paddingBottom: spacing.xl * 2,
    },
    emptyKicker: {
      fontFamily: fonts.body.medium,
      fontSize: 12,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },
    emptyTitle: {
      fontFamily: fonts.heading.semiBold,
      fontSize: 28,
      letterSpacing: -0.5,
      marginBottom: spacing.md,
    },
    emptyBody: {
      fontFamily: fonts.body.regular,
      fontSize: 16,
      lineHeight: 25,
    },
  });
}
