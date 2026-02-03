import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles, fonts } from '../../src/design/typography';
import { OmerCalculator } from '../../src/core/omer/OmerCalculator';
import { StorageService } from '../../src/storage/StorageService';

export const OmerScreen: React.FC = () => {
  const [omerDay, setOmerDay] = useState<number | null>(null);
  const [countedDays, setCountedDays] = useState<Set<number>>(new Set());
  const [todayCounted, setTodayCounted] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [checkAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadOmerData();
    
    // Pulse animation for today's count button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (todayCounted) {
      Animated.spring(checkAnim, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(checkAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [todayCounted]);

  const loadOmerData = async () => {
    const day = OmerCalculator.getOmerDay();
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
    }
  };

  const toggleToday = async () => {
    if (!omerDay) return;

    const newCounted = !todayCounted;
    await StorageService.markOmerDay(omerDay, newCounted);
    setTodayCounted(newCounted);

    const updated = new Set(countedDays);
    if (newCounted) {
      updated.add(omerDay);
    } else {
      updated.delete(omerDay);
    }
    setCountedDays(updated);
  };

  const toggleDay = async (day: number) => {
    const isCounted = countedDays.has(day);
    const newCounted = !isCounted;
    await StorageService.markOmerDay(day, newCounted);
    
    const updated = new Set(countedDays);
    if (newCounted) {
      updated.add(day);
    } else {
      updated.delete(day);
    }
    setCountedDays(updated);
  };

  if (omerDay === null) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
          style={StyleSheet.absoluteFill}
        />
        
        <View style={styles.emptyContainer}>
          <FadeIn delay={0}>
            <View style={styles.emptyCard}>
              {Platform.OS !== 'web' ? (
                <BlurView intensity={90} style={styles.emptyBlur}>
                  <View style={styles.emptyContent}>
                    <Text style={styles.emptyEmoji}>🌾</Text>
                    <Text style={styles.emptyTitle}>Not in Omer Season</Text>
                    <Text style={styles.emptySubtitle}>
                      The counting of the Omer takes place between Pesach and Shavuos
                    </Text>
                  </View>
                </BlurView>
              ) : (
                <LinearGradient
                  colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                  style={styles.emptyBlur}
                >
                  <View style={styles.emptyContent}>
                    <Text style={styles.emptyEmoji}>🌾</Text>
                    <Text style={styles.emptyTitle}>Not in Omer Season</Text>
                    <Text style={styles.emptySubtitle}>
                      The counting of the Omer takes place between Pesach and Shavuos
                    </Text>
                  </View>
                </LinearGradient>
              )}
            </View>
          </FadeIn>
        </View>
      </View>
    );
  }

  const week = OmerCalculator.getOmerWeek(omerDay);
  const blessing = OmerCalculator.getOmerBlessing(omerDay);
  const progress = (omerDay / 49) * 100;

  // Build weeks for display
  const weeks: number[][] = [];
  for (let w = 1; w <= 7; w++) {
    const weekDays: number[] = [];
    for (let d = (w - 1) * 7 + 1; d <= Math.min(w * 7, 49); d++) {
      weekDays.push(d);
    }
    weeks.push(weekDays);
  }

  const checkScale = checkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1.3],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Header */}
        <FadeIn delay={0}>
          <View style={styles.progressCard}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={90} style={styles.progressBlur}>
                <View style={styles.progressContent}>
                  <Text style={styles.progressTitle}>Counting the Omer</Text>
                  <Text style={styles.progressDay}>Day {omerDay} of 49</Text>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBg}>
                      <Animated.View 
                        style={[
                          styles.progressBarFill,
                          { width: `${progress}%` }
                        ]} 
                      />
                    </View>
                  </View>
                  <Text style={styles.progressWeek}>Week {week}</Text>
                </View>
              </BlurView>
            ) : (
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                style={styles.progressBlur}
              >
                <View style={styles.progressContent}>
                  <Text style={styles.progressTitle}>Counting the Omer</Text>
                  <Text style={styles.progressDay}>Day {omerDay} of 49</Text>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBg}>
                      <Animated.View 
                        style={[
                          styles.progressBarFill,
                          { width: `${progress}%` }
                        ]} 
                      />
                    </View>
                  </View>
                  <Text style={styles.progressWeek}>Week {week}</Text>
                </View>
              </LinearGradient>
            )}
          </View>
        </FadeIn>

        {/* Today's Blessing */}
        <FadeIn delay={100}>
          <View style={styles.blessingCard}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={80} style={styles.blessingBlur}>
                <View style={styles.blessingContent}>
                  <Text style={styles.blessingLabel}>Tonight's Count</Text>
                  <Text style={styles.blessingEnglish}>{blessing.english}</Text>
                  <Text style={styles.blessingHebrew}>{blessing.hebrew}</Text>
                  
                  <Animated.View style={{ transform: [{ scale: todayCounted ? 1 : pulseAnim }] }}>
                    <TouchableOpacity
                      style={[styles.countButton, todayCounted && styles.countButtonActive]}
                      onPress={toggleToday}
                      activeOpacity={0.8}
                    >
                      {todayCounted ? (
                        <Animated.Text
                          style={[
                            styles.countButtonText,
                            styles.countButtonTextActive,
                            { transform: [{ scale: checkScale }] },
                          ]}
                        >
                          ✓
                        </Animated.Text>
                      ) : (
                        <Text style={styles.countButtonText}>Mark as Counted</Text>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                  
                  {todayCounted && (
                    <Text style={styles.countedMessage}>You counted today 🌾</Text>
                  )}
                </View>
              </BlurView>
            ) : (
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                style={styles.blessingBlur}
              >
                <View style={styles.blessingContent}>
                  <Text style={styles.blessingLabel}>Tonight's Count</Text>
                  <Text style={styles.blessingEnglish}>{blessing.english}</Text>
                  <Text style={styles.blessingHebrew}>{blessing.hebrew}</Text>
                  
                  <Animated.View style={{ transform: [{ scale: todayCounted ? 1 : pulseAnim }] }}>
                    <TouchableOpacity
                      style={[styles.countButton, todayCounted && styles.countButtonActive]}
                      onPress={toggleToday}
                      activeOpacity={0.8}
                    >
                      {todayCounted ? (
                        <Animated.Text
                          style={[
                            styles.countButtonText,
                            styles.countButtonTextActive,
                            { transform: [{ scale: checkScale }] },
                          ]}
                        >
                          ✓
                        </Animated.Text>
                      ) : (
                        <Text style={styles.countButtonText}>Mark as Counted</Text>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                  
                  {todayCounted && (
                    <Text style={styles.countedMessage}>You counted today 🌾</Text>
                  )}
                </View>
              </LinearGradient>
            )}
          </View>
        </FadeIn>

        {/* All 49 Days Grid */}
        <FadeIn delay={200}>
          <Text style={styles.gridTitle}>All 49 Days</Text>
        </FadeIn>

        <View style={styles.weeksContainer}>
          {weeks.map((weekDays, weekIndex) => (
            <FadeIn key={weekIndex} delay={250 + weekIndex * 50}>
              <View style={styles.weekCard}>
                {Platform.OS !== 'web' ? (
                  <BlurView intensity={70} style={styles.weekBlur}>
                    <View style={styles.weekContent}>
                      <Text style={styles.weekLabel}>Week {weekIndex + 1}</Text>
                      <View style={styles.daysGrid}>
                        {weekDays.map((day) => {
                          const isCounted = countedDays.has(day);
                          const isToday = day === omerDay;
                          
                          return (
                            <TouchableOpacity
                              key={day}
                              style={[
                                styles.dayDot,
                                isCounted && styles.dayDotCounted,
                                isToday && styles.dayDotToday,
                              ]}
                              onPress={() => toggleDay(day)}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.dayNumber,
                                isCounted && styles.dayNumberCounted,
                                isToday && styles.dayNumberToday,
                              ]}>
                                {day}
                              </Text>
                              {isCounted && (
                                <View style={styles.checkBadge}>
                                  <Text style={styles.checkBadgeText}>✓</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </BlurView>
                ) : (
                  <LinearGradient
                    colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.75)']}
                    style={styles.weekBlur}
                  >
                    <View style={styles.weekContent}>
                      <Text style={styles.weekLabel}>Week {weekIndex + 1}</Text>
                      <View style={styles.daysGrid}>
                        {weekDays.map((day) => {
                          const isCounted = countedDays.has(day);
                          const isToday = day === omerDay;
                          
                          return (
                            <TouchableOpacity
                              key={day}
                              style={[
                                styles.dayDot,
                                isCounted && styles.dayDotCounted,
                                isToday && styles.dayDotToday,
                              ]}
                              onPress={() => toggleDay(day)}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.dayNumber,
                                isCounted && styles.dayNumberCounted,
                                isToday && styles.dayNumberToday,
                              ]}>
                                {day}
                              </Text>
                              {isCounted && (
                                <View style={styles.checkBadge}>
                                  <Text style={styles.checkBadgeText}>✓</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </LinearGradient>
                )}
              </View>
            </FadeIn>
          ))}
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyBlur: {
    overflow: 'hidden',
  },
  emptyContent: {
    padding: spacing.xl * 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fonts.heading.bold,
    fontSize: 24,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Progress Card
  progressCard: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  progressBlur: {
    overflow: 'hidden',
  },
  progressContent: {
    padding: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },
  progressTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 16,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  progressDay: {
    fontFamily: fonts.heading.bold,
    fontSize: 32,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(212, 165, 184, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: 4,
  },
  progressWeek: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.text.secondary,
  },

  // Blessing Card
  blessingCard: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  blessingBlur: {
    overflow: 'hidden',
  },
  blessingContent: {
    padding: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },
  blessingLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  blessingEnglish: {
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  blessingHebrew: {
    fontFamily: fonts.body.regular,
    fontSize: 18,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: spacing.lg,
  },
  countButton: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl * 1.5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent.sage,
    borderWidth: 2,
    borderColor: colors.secondary.main,
    shadowColor: colors.secondary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 200,
    alignItems: 'center',
  },
  countButtonActive: {
    backgroundColor: colors.secondary.main,
    borderColor: colors.secondary.dark,
  },
  countButtonText: {
    fontFamily: fonts.body.bold,
    fontSize: 16,
    color: colors.text.primary,
  },
  countButtonTextActive: {
    fontSize: 36,
    color: '#fff',
  },
  countedMessage: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.secondary.dark,
    marginTop: spacing.md,
  },

  // Grid
  gridTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  weeksContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  weekCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  weekBlur: {
    overflow: 'hidden',
  },
  weekContent: {
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  weekLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 13,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dayDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 184, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayDotCounted: {
    backgroundColor: colors.secondary.light,
    borderColor: colors.secondary.main,
  },
  dayDotToday: {
    borderWidth: 2,
    borderColor: colors.primary.main,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dayNumber: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.secondary,
  },
  dayNumberCounted: {
    color: colors.secondary.dark,
    fontWeight: '600',
  },
  dayNumberToday: {
    color: colors.primary.dark,
    fontWeight: 'bold',
  },
  checkBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.semantic.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeText: {
    fontSize: 10,
    color: '#fff',
  },
});
