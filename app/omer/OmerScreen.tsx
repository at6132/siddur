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
import { StorageService } from '../../src/storage/StorageService';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import type { LocationObject } from 'expo-location';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const OmerScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(), []);

  const [omerDay, setOmerDay] = useState<number | null>(null);
  const [countedDays, setCountedDays] = useState<Set<number>>(new Set());
  const [todayCounted, setTodayCounted] = useState(false);
  const [checkAnim] = useState(new Animated.Value(0));
  const [showAllNights, setShowAllNights] = useState(false);
  const [showReflection, setShowReflection] = useState(false);

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
    const day = await OmerCalculator.getOmerDayAsync(new Date(), locationObj);
    setOmerDay(day);

    if (day) {
      const counts = await StorageService.getOmerCounts();
      const counted = new Set(
        Object.keys(counts || {})
          .map(Number)
          .filter((d) => counts![d])
      );
      setCountedDays(counted);
      setTodayCounted(counted.has(day));
    } else {
      setCountedDays(new Set());
      setTodayCounted(false);
    }
  }, []);

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

  const toggleToday = async () => {
    if (!omerDay) return;
    const newCounted = !todayCounted;
    await StorageService.markOmerDay(omerDay, newCounted);
    setTodayCounted(newCounted);
    const updated = new Set(countedDays);
    if (newCounted) updated.add(omerDay);
    else updated.delete(omerDay);
    setCountedDays(updated);
  };

  const toggleDay = async (day: number) => {
    const isCounted = countedDays.has(day);
    const newCounted = !isCounted;
    await StorageService.markOmerDay(day, newCounted);
    const updated = new Set(countedDays);
    if (newCounted) updated.add(day);
    else updated.delete(day);
    setCountedDays(updated);
    if (day === omerDay) setTodayCounted(newCounted);
  };

  const toggleAllNights = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAllNights((v) => !v);
  };

  const toggleReflection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowReflection((v) => !v);
  };

  const checkScale = checkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1.2],
  });

  const allDays = useMemo(() => Array.from({ length: 49 }, (_, i) => i + 1), []);

  if (omerDay === null) {
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
              Omer is between Pesach and Shavuos. When it starts, this screen stays simple: tonight's words,
              one tap when you're done, optional grid if you need it.
            </Text>
          </FadeIn>
        </View>
      </View>
    );
  }

  const weekNum = OmerCalculator.getOmerWeek(omerDay);
  const blessing = OmerCalculator.getOmerBlessing(omerDay);
  const meditation = OmerCalculator.getSefirahMeditation(omerDay);
  const progress = (omerDay / 49) * 100;
  const isLagBaomer = omerDay === 33;

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
          <Text style={[styles.nightWhisper, { color: theme.colors.text.tertiary }]}>
            Night {omerDay} · week {weekNum}
          </Text>
          {isLagBaomer && (
            <Text style={[styles.lagWhisper, { color: theme.colors.primary.dark }]}>
              Lag BaOmer — a lighter day
            </Text>
          )}
          <Text style={[styles.bigDay, { color: theme.colors.primary.main }]}>{omerDay}</Text>
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

        <GlassCard style={styles.mainCard}>
          <Text style={[styles.brachaHebrew, { color: theme.colors.text.primary }]}>
            {blessing.blessingHebrew}
          </Text>

          <View style={[styles.softRule, { backgroundColor: theme.colors.neutral[200] }]} />

          <Text style={[styles.countHebrew, { color: theme.colors.text.primary }]}>
            {blessing.countHebrew}
          </Text>

          <TouchableOpacity
            style={[
              styles.doneButton,
              {
                backgroundColor: todayCounted ? theme.colors.semantic.success : theme.colors.primary.main,
              },
            ]}
            onPress={toggleToday}
            activeOpacity={0.88}
          >
            {todayCounted ? (
              <Animated.Text style={[styles.doneButtonText, { transform: [{ scale: checkScale }] }]}>
                Counted ✓
              </Animated.Text>
            ) : (
              <Text style={styles.doneButtonText}>Tap when you've counted</Text>
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
              <Text style={[styles.reflectionBody, { color: theme.colors.text.secondary }]}>
                {meditation.meditation} {meditation.question}
              </Text>
            )}
          </View>
        )}

        <View style={styles.optionalBlock}>
          <TouchableOpacity onPress={toggleAllNights} activeOpacity={0.7} style={styles.disclosureRow}>
            <Text style={[styles.disclosureLabel, { color: theme.colors.text.secondary }]}>
              {showAllNights ? 'Close night list' : 'All 49 nights'}
            </Text>
            <Text style={[styles.disclosureChevron, { color: theme.colors.text.tertiary }]}>
              {showAllNights ? '⌃' : '⌄'}
            </Text>
          </TouchableOpacity>
          {showAllNights && (
            <View style={styles.gridWrap}>
              {allDays.map((day) => {
                const isCounted = countedDays.has(day);
                const isToday = day === omerDay;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.gridDot,
                      {
                        borderColor: isToday ? theme.colors.primary.main : 'transparent',
                        backgroundColor: isCounted
                          ? `${theme.colors.primary.main}35`
                          : theme.isDark
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(255,255,255,0.5)',
                      },
                    ]}
                    onPress={() => toggleDay(day)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.gridDotNum,
                        {
                          color: isToday ? theme.colors.primary.dark : theme.colors.text.secondary,
                          fontFamily: isToday ? fonts.body.bold : fonts.body.medium,
                        },
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
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
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.md,
    },
    nightWhisper: {
      fontFamily: fonts.body.medium,
      fontSize: 13,
      letterSpacing: 0.3,
      marginBottom: spacing.xs,
    },
    lagWhisper: {
      fontFamily: fonts.body.medium,
      fontSize: 13,
      marginBottom: spacing.sm,
    },
    bigDay: {
      fontFamily: fonts.heading.bold,
      fontSize: 72,
      lineHeight: 76,
      letterSpacing: -2,
    },
    bigDayCaption: {
      fontFamily: fonts.body.regular,
      fontSize: 16,
      marginTop: -4,
      marginBottom: spacing.lg,
    },
    progressLine: {
      width: '100%',
      maxWidth: 200,
      height: 3,
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: spacing.lg,
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
      marginBottom: spacing.lg,
    },
    doneButton: {
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md + 4,
      alignItems: 'center',
      justifyContent: 'center',
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
    reflectionBody: {
      fontFamily: fonts.body.regular,
      fontSize: 15,
      lineHeight: 24,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    gridWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 6,
      paddingTop: spacing.md,
      paddingHorizontal: spacing.xs,
    },
    gridDot: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridDotNum: {
      fontSize: 11,
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
