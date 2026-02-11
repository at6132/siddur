/**
 * Goals History – scroll through past days, see what you accomplished.
 * Satisfying: completion badges, slide-up day detail, staggered list.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { FadeIn } from '../../components/animations/FadeIn';
import { ScalePress } from '../../components/animations/ScalePress';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { colors } from '../../src/design/colors';
import { toLocalDateString } from '../../src/utils/dateUtils';
import { DailyGoalsService, type DailyGoalsDay } from '../../src/storage/DailyGoalsService';

const { height: H } = Dimensions.get('window');
const springConfig = { damping: 22, stiffness: 160 };

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const today = toLocalDateString();
  const isToday = dateStr === today;
  if (isToday) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = dateStr === toLocalDateString(yesterday);
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export interface DaySummary {
  dateStr: string;
  completed: number;
  total: number;
}

export const GoalsHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [streak, setStreak] = useState(0);
  const [selectedDay, setSelectedDay] = useState<DailyGoalsDay | null>(null);
  const [detailDateStr, setDetailDateStr] = useState<string | null>(null);
  const modalTranslateY = useSharedValue(H);
  const modalOpacity = useSharedValue(0);

  const load = useCallback(async () => {
    const [list, streakCount] = await Promise.all([
      DailyGoalsService.getHistorySummaries(60),
      DailyGoalsService.getCompletionStreak(),
    ]);
    setSummaries(list);
    setStreak(streakCount);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openDay = async (dateStr: string) => {
    const day = await DailyGoalsService.getDay(dateStr);
    if (day) {
      setDetailDateStr(dateStr);
      setSelectedDay(day);
      modalTranslateY.value = H;
      modalOpacity.value = 0;
      modalTranslateY.value = withSpring(0, springConfig);
      modalOpacity.value = withTiming(1, { duration: 200 });
    }
  };

  const finishClose = useCallback(() => {
    setSelectedDay(null);
    setDetailDateStr(null);
  }, []);

  const closeModal = useCallback(() => {
    modalTranslateY.value = withTiming(H, { duration: 240, easing: Easing.in(Easing.ease) }, (finished) => {
      if (finished) runOnJS(finishClose)();
    });
    modalOpacity.value = withTiming(0, { duration: 200 });
  }, [finishClose]);

  const completedCount = selectedDay ? selectedDay.goals.filter((g) => g.completed).length : 0;
  const totalCount = selectedDay ? selectedDay.goals.length : 0;

  const modalSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']} style={StyleSheet.absoluteFill} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Past days</Text>
        <Text style={styles.subtitle}>Scroll through and tap a day to see what you accomplished</Text>

        {summaries.length > 0 && (
          <FadeIn delay={0}>
            <View style={styles.statsRow}>
              <Text style={styles.statsText}>You've set goals on <Text style={styles.statsBold}>{summaries.length}</Text> day{summaries.length !== 1 ? 's' : ''}</Text>
            </View>
          </FadeIn>
        )}

        {streak > 0 && (
          <FadeIn delay={0}>
            <View style={styles.streakBanner}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakText}>{streak} day streak of crushing it</Text>
            </View>
          </FadeIn>
        )}

        {summaries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>Your story starts today</Text>
            <Text style={styles.emptyText}>Add goals this morning, check them off tonight. Come back here to scroll through every day you crushed it.</Text>
          </View>
        ) : (
          summaries.map((s, i) => (
            <FadeIn key={s.dateStr} delay={i * 40}>
              <ScalePress scale={0.98} onPress={() => openDay(s.dateStr)}>
                <View style={styles.dayCard}>
                  <View style={styles.dayCardLeft}>
                    <Text style={styles.dayLabel}>{formatDateLabel(s.dateStr)}</Text>
                    <Text style={styles.dayDate}>{s.dateStr}</Text>
                  </View>
                  <View style={[styles.badge, s.completed === s.total && s.total > 0 && styles.badgeAll]}>
                    <Text style={[styles.badgeText, s.completed === s.total && s.total > 0 && styles.badgeTextAll]}>
                      {s.completed}/{s.total} {s.completed === s.total && s.total > 0 ? '✓' : ''}
                    </Text>
                  </View>
                  <Text style={styles.dayArrow}>→</Text>
                </View>
              </ScalePress>
            </FadeIn>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={selectedDay != null} transparent animationType="none">
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalTouchable} onPress={(e) => e.stopPropagation()}>
            <Animated.View style={[styles.modalCard, modalSlideStyle]}>
              {selectedDay && detailDateStr && (
                <>
                  <View style={styles.modalHandle} />
                  <Text style={styles.modalTitle}>{formatDateLabel(detailDateStr)}</Text>
                  <Text style={styles.modalSubtitle}>{detailDateStr} · {completedCount}/{totalCount} completed</Text>
                  <ScrollView style={styles.modalList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {selectedDay.goals.map((g, i) => (
                      <FadeIn key={g.id} delay={i * 50}>
                        <View style={styles.modalGoalRow}>
                          <Text style={[styles.modalGoalText, g.completed && styles.modalGoalDone]}>
                            {g.completed ? '✓' : '○'} {g.text}
                          </Text>
                        </View>
                      </FadeIn>
                    ))}
                  </ScrollView>
                  <TouchableOpacity style={styles.modalClose} onPress={closeModal}>
                    <Text style={styles.modalCloseText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.xl + spacing.safeTopInset },
  backRow: { marginBottom: spacing.md },
  backText: { fontFamily: fonts.body.medium, fontSize: 16, color: colors.text.secondary },
  title: { fontFamily: fonts.heading.bold, fontSize: 28, color: colors.text.primary, marginBottom: 4 },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.text.secondary, marginBottom: spacing.lg },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontFamily: fonts.heading.semibold, fontSize: 18, color: colors.text.primary, marginBottom: spacing.sm, textAlign: 'center' },
  emptyText: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.text.tertiary, textAlign: 'center', lineHeight: 22 },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  streakEmoji: { fontSize: 24, marginRight: spacing.sm },
  streakText: { fontFamily: fonts.body.semibold, fontSize: 16, color: colors.primary.dark },
  statsRow: { marginBottom: spacing.md },
  statsText: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.text.secondary },
  statsBold: { fontFamily: fonts.body.semibold, color: colors.primary.dark },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.85)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  dayCardLeft: { flex: 1 },
  dayLabel: { fontFamily: fonts.heading.semibold, fontSize: 17, color: colors.text.primary },
  dayDate: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.text.tertiary, marginTop: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.light,
    marginRight: spacing.sm,
  },
  badgeAll: { backgroundColor: colors.semantic?.success ?? '#5a9e5a' },
  badgeText: { fontFamily: fonts.body.semibold, fontSize: 13, color: colors.primary.dark },
  badgeTextAll: { color: '#fff' },
  dayArrow: { fontFamily: fonts.body.regular, fontSize: 18, color: colors.text.tertiary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalTouchable: { flex: 1, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 34,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text.tertiary,
    opacity: 0.5,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { fontFamily: fonts.heading.bold, fontSize: 22, color: colors.text.primary, marginBottom: 4 },
  modalSubtitle: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.text.secondary, marginBottom: spacing.md },
  modalList: { maxHeight: 320, marginBottom: spacing.md },
  modalGoalRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: 2,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  modalGoalText: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.text.primary },
  modalGoalDone: { textDecorationLine: 'line-through', color: colors.text.tertiary },
  modalClose: { backgroundColor: colors.primary.main, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  modalCloseText: { fontFamily: fonts.body.semibold, fontSize: 16, color: '#fff' },
});
