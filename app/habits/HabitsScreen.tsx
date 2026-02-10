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
import { HabitTracker } from '../../src/storage/HabitTracker';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { SpiritualGoal } from '../../src/types/preferences';

export const HabitsScreen: React.FC = () => {
  const [goals, setGoals] = useState<SpiritualGoal[]>([]);
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());
  const [todayMarked, setTodayMarked] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [checkmarkAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadHabits();
    
    // Gentle pulse animation for mark button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (todayMarked) {
      Animated.spring(checkmarkAnim, {
        toValue: 1,
        tension: 50,
        friction: 5,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(checkmarkAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [todayMarked]);

  const loadHabits = async () => {
    const preferences = await UserPreferencesService.getPreferences();
    if (preferences?.spiritualGoals) {
      setGoals(preferences.spiritualGoals);
    }

    const marked = await HabitTracker.getMarkedDates();
    setMarkedDates(marked);

    const todayMarkedStatus = await HabitTracker.isMarkedToday();
    setTodayMarked(todayMarkedStatus);
  };

  const toggleToday = async () => {
    const newMarked = !todayMarked;
    await HabitTracker.markToday(newMarked);
    setTodayMarked(newMarked);
    loadHabits();
  };

  // Get recent marked dates for display
  const recentDates = Array.from(markedDates)
    .sort()
    .reverse()
    .slice(0, 7);

  // Calculate streak
  const calculateStreak = () => {
    const sortedDates = Array.from(markedDates).sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedDateStr = expectedDate.toISOString().split('T')[0];
      
      if (date === expectedDateStr) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const streak = calculateStreak();
  const checkmarkScale = checkmarkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1.2],
  });
  const checkmarkRotate = checkmarkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
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
        {/* Header with Streak */}
        <FadeIn delay={0}>
          <View style={styles.headerCard}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={90} style={styles.headerBlur}>
                <View style={styles.headerContent}>
                  <Text style={styles.headerTitle}>A Moment for Your Neshama</Text>
                  <Text style={styles.headerSubtitle}>Show up today, even just a little</Text>
                  {streak > 0 && (
                    <View style={styles.streakBadge}>
                      <Text style={styles.streakEmoji}>🔥</Text>
                      <Text style={styles.streakText}>{streak} day{streak !== 1 ? 's' : ''} in a row</Text>
                    </View>
                  )}
                </View>
              </BlurView>
            ) : (
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                style={styles.headerBlur}
              >
                <View style={styles.headerContent}>
                  <Text style={styles.headerTitle}>A Moment for Your Neshama</Text>
                  <Text style={styles.headerSubtitle}>Show up today, even just a little</Text>
                  {streak > 0 && (
                    <View style={styles.streakBadge}>
                      <Text style={styles.streakEmoji}>🔥</Text>
                      <Text style={styles.streakText}>{streak} day{streak !== 1 ? 's' : ''} in a row</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            )}
          </View>
        </FadeIn>

        {/* Mark Today Card */}
        <FadeIn delay={100}>
          <View style={styles.markCard}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={80} style={styles.markBlur}>
                <View style={styles.markContent}>
                  <Text style={styles.markTitle}>Today</Text>
                  <Text style={styles.markDate}>
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </Text>
                  <Animated.View style={{ transform: [{ scale: todayMarked ? 1 : pulseAnim }] }}>
                    <TouchableOpacity
                      style={[styles.markButton, todayMarked && styles.markButtonActive]}
                      onPress={toggleToday}
                      activeOpacity={0.8}
                    >
                      {todayMarked ? (
                        <Animated.Text
                          style={[
                            styles.markButtonText,
                            styles.markButtonTextActive,
                            {
                              transform: [
                                { scale: checkmarkScale },
                                { rotate: checkmarkRotate },
                              ],
                            },
                          ]}
                        >
                          ✓
                        </Animated.Text>
                      ) : (
                        <Text style={styles.markButtonText}>Mark Today</Text>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                  {!todayMarked && (
                    <Text style={styles.markHint}>Tap when you've taken a moment</Text>
                  )}
                  {todayMarked && (
                    <Text style={styles.markCongrats}>Beautiful. You showed up today ✨</Text>
                  )}
                </View>
              </BlurView>
            ) : (
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                style={styles.markBlur}
              >
                <View style={styles.markContent}>
                  <Text style={styles.markTitle}>Today</Text>
                  <Text style={styles.markDate}>
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </Text>
                  <Animated.View style={{ transform: [{ scale: todayMarked ? 1 : pulseAnim }] }}>
                    <TouchableOpacity
                      style={[styles.markButton, todayMarked && styles.markButtonActive]}
                      onPress={toggleToday}
                      activeOpacity={0.8}
                    >
                      {todayMarked ? (
                        <Animated.Text
                          style={[
                            styles.markButtonText,
                            styles.markButtonTextActive,
                            {
                              transform: [
                                { scale: checkmarkScale },
                                { rotate: checkmarkRotate },
                              ],
                            },
                          ]}
                        >
                          ✓
                        </Animated.Text>
                      ) : (
                        <Text style={styles.markButtonText}>Mark Today</Text>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                  {!todayMarked && (
                    <Text style={styles.markHint}>Tap when you've taken a moment</Text>
                  )}
                  {todayMarked && (
                    <Text style={styles.markCongrats}>Beautiful. You showed up today ✨</Text>
                  )}
                </View>
              </LinearGradient>
            )}
          </View>
        </FadeIn>

        {/* Goals Card */}
        {goals.length > 0 && (
          <FadeIn delay={200}>
            <View style={styles.goalsCard}>
              {Platform.OS !== 'web' ? (
                <BlurView intensity={80} style={styles.goalsBlur}>
                  <View style={styles.goalsContent}>
                    <Text style={styles.sectionTitle}>Your Spiritual Goals</Text>
                    {goals.map((goal, index) => (
                      <FadeIn key={goal} delay={250 + index * 50}>
                        <View style={styles.goalItem}>
                          <View style={styles.goalDot} />
                          <Text style={styles.goalText}>
                            {goal.charAt(0).toUpperCase() + goal.slice(1).replace(/_/g, ' ')}
                          </Text>
                        </View>
                      </FadeIn>
                    ))}
                  </View>
                </BlurView>
              ) : (
                <LinearGradient
                  colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                  style={styles.goalsBlur}
                >
                  <View style={styles.goalsContent}>
                    <Text style={styles.sectionTitle}>Your Spiritual Goals</Text>
                    {goals.map((goal, index) => (
                      <FadeIn key={goal} delay={250 + index * 50}>
                        <View style={styles.goalItem}>
                          <View style={styles.goalDot} />
                          <Text style={styles.goalText}>
                            {goal.charAt(0).toUpperCase() + goal.slice(1).replace(/_/g, ' ')}
                          </Text>
                        </View>
                      </FadeIn>
                    ))}
                  </View>
                </LinearGradient>
              )}
            </View>
          </FadeIn>
        )}

        {/* Recent Days */}
        {recentDates.length > 0 && (
          <FadeIn delay={300}>
            <View style={styles.recentCard}>
              {Platform.OS !== 'web' ? (
                <BlurView intensity={80} style={styles.recentBlur}>
                  <View style={styles.recentContent}>
                    <Text style={styles.sectionTitle}>Recent Days</Text>
                    {recentDates.map((dateStr, index) => {
                      const date = new Date(dateStr);
                      const isToday = dateStr === new Date().toISOString().split('T')[0];
                      
                      return (
                        <FadeIn key={dateStr} delay={350 + index * 40}>
                          <View style={[styles.dateItem, isToday && styles.dateItemToday]}>
                            <View style={styles.dateLeft}>
                              <Text style={styles.dateDay}>
                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                              </Text>
                              <Text style={styles.dateText}>
                                {date.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </Text>
                              {isToday && <Text style={styles.todayBadge}>Today</Text>}
                            </View>
                            <Text style={styles.checkmark}>✓</Text>
                          </View>
                        </FadeIn>
                      );
                    })}
                  </View>
                </BlurView>
              ) : (
                <LinearGradient
                  colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                  style={styles.recentBlur}
                >
                  <View style={styles.recentContent}>
                    <Text style={styles.sectionTitle}>Recent Days</Text>
                    {recentDates.map((dateStr, index) => {
                      const date = new Date(dateStr);
                      const isToday = dateStr === new Date().toISOString().split('T')[0];
                      
                      return (
                        <FadeIn key={dateStr} delay={350 + index * 40}>
                          <View style={[styles.dateItem, isToday && styles.dateItemToday]}>
                            <View style={styles.dateLeft}>
                              <Text style={styles.dateDay}>
                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                              </Text>
                              <Text style={styles.dateText}>
                                {date.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </Text>
                              {isToday && <Text style={styles.todayBadge}>Today</Text>}
                            </View>
                            <Text style={styles.checkmark}>✓</Text>
                          </View>
                        </FadeIn>
                      );
                    })}
                  </View>
                </LinearGradient>
              )}
            </View>
          </FadeIn>
        )}

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
    paddingTop: spacing.xl + spacing.safeTopInset,
  },

  // Header Card
  headerCard: {
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
  headerBlur: {
    overflow: 'hidden',
  },
  headerContent: {
    padding: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.heading.bold,
    fontSize: 26,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.gold,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    shadowColor: colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  streakEmoji: {
    fontSize: 18,
    marginRight: spacing.xs,
  },
  streakText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.primary,
  },

  // Mark Card
  markCard: {
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
  markBlur: {
    overflow: 'hidden',
  },
  markContent: {
    padding: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },
  markTitle: {
    fontFamily: fonts.heading.bold,
    fontSize: 22,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  markDate: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  markButton: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl * 1.5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.light,
    borderWidth: 2,
    borderColor: colors.primary.main,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 180,
    alignItems: 'center',
  },
  markButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.dark,
  },
  markButtonText: {
    fontFamily: fonts.body.bold,
    fontSize: 18,
    color: colors.primary.dark,
  },
  markButtonTextActive: {
    fontSize: 36,
    color: '#fff',
  },
  markHint: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  markCongrats: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.primary.dark,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  // Goals Card
  goalsCard: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  goalsBlur: {
    overflow: 'hidden',
  },
  goalsContent: {
    padding: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  sectionTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 165, 184, 0.2)',
  },
  goalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.main,
    marginRight: spacing.sm,
  },
  goalText: {
    fontFamily: fonts.body.regular,
    fontSize: 15,
    color: colors.text.primary,
  },

  // Recent Card
  recentCard: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  recentBlur: {
    overflow: 'hidden',
  },
  recentContent: {
    padding: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(165, 196, 212, 0.2)',
    borderRadius: borderRadius.md,
  },
  dateItemToday: {
    backgroundColor: 'rgba(212, 165, 184, 0.15)',
  },
  dateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateDay: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.secondary,
    minWidth: 35,
  },
  dateText: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.primary,
  },
  todayBadge: {
    fontFamily: fonts.body.medium,
    fontSize: 11,
    color: colors.primary.dark,
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  checkmark: {
    fontSize: 20,
    color: colors.semantic.success,
  },
});
