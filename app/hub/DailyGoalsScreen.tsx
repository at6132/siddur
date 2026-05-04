/**
 * Daily Goals – add in the morning, check off at night.
 * Satisfying UX: progress bar, bounce checkbox, slide-in new goals, "All done!" celebration.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { FadeIn as FadeInLegacy } from '../../components/animations/FadeIn';
import { GoalRow } from '../../components/hub/GoalRow';
import { AllDoneCelebration } from '../../components/hub/AllDoneCelebration';
import { GoalProgressRing } from '../../components/hub/GoalProgressRing';
import { SlideInRow } from '../../components/hub/SlideInRow';
import { ScalePress } from '../../components/animations/ScalePress';
import { BackButton } from '../../components/ui/BackButton';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { colors } from '../../src/design/colors';
import { DEFAULT_SCREEN_BACKGROUND } from '../../src/design/screenGradient';
import { DailyGoalsService, type DailyGoalItem } from '../../src/storage/DailyGoalsService';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { SPIRITUAL_GOAL_OPTIONS } from '../../src/types/preferences';

function ViewPastDaysButton({ onPress }: { onPress: () => void }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.04,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <TouchableOpacity
      style={styles.historyButtonWrap}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Animated.View style={[styles.historyButton, { transform: [{ scale: pulse }] }]}>
        <Text style={styles.historyButtonText}>View past days</Text>
        <Text style={styles.historyButtonSubtext}>See all you've accomplished</Text>
        <Text style={styles.historyButtonArrow}>→</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export const DailyGoalsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [goals, setGoals] = useState<DailyGoalItem[]>([]);
  const [quickAddText, setQuickAddText] = useState('');
  const [spiritualLabels, setSpiritualLabels] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [streak, setStreak] = useState(0);
  const prevCompletedRef = useRef(0);

  const load = useCallback(async () => {
    const [todayGoals, prefs, streakCount] = await Promise.all([
      DailyGoalsService.getToday(),
      UserPreferencesService.getPreferences(),
      DailyGoalsService.getCompletionStreak(),
    ]);
    setGoals(todayGoals);
    setStreak(streakCount);
    prevCompletedRef.current = todayGoals.filter((g) => g.completed).length;
    const selected = prefs?.spiritualGoals ?? [];
    setSpiritualLabels(selected.map((g) => SPIRITUAL_GOAL_OPTIONS.find((o) => o.value === g)?.label ?? g.replace(/_/g, ' ')));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAddGoal = async (text: string) => {
    const t = text.trim();
    if (!t) return;
    const next = await DailyGoalsService.addGoal(new Date(), t);
    setGoals(next);
    setQuickAddText('');
  };

  const handleToggle = async (goalId: string) => {
    const prevCompleted = goals.filter((g) => g.completed).length;
    const goal = goals.find((g) => g.id === goalId);
    const wasCompleted = goal?.completed ?? false;
    const next = await DailyGoalsService.toggleGoal(new Date(), goalId);
    setGoals(next);
    const newCompleted = next.filter((g) => g.completed).length;
    if (!wasCompleted && newCompleted === next.length && next.length > 0) {
      setShowCelebration(true);
    }
  };

  const handleRemove = async (goalId: string) => {
    const next = await DailyGoalsService.removeGoal(new Date(), goalId);
    setGoals(next);
  };

  const completedCount = goals.filter((g) => g.completed).length;
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={styles.container}>
      <LinearGradient colors={[...DEFAULT_SCREEN_BACKGROUND]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <BackButton onPress={() => navigation.goBack()} label="Back to Hub" style={styles.backRow} />

          <Text style={styles.title}>Today's goals</Text>
          <Text style={styles.subtitle}>{dayName}</Text>
          {streak > 0 && (
            <View style={styles.streakPill}>
              <Text style={styles.streakPillText}>🔥 {streak} day streak</Text>
            </View>
          )}

          <View style={styles.progressWrap}>
            <GoalProgressRing completed={completedCount} total={goals.length} />
          </View>

          {spiritualLabels.length > 0 && (
            <FadeInLegacy delay={0}>
              <Text style={styles.quickLabel}>Quick add</Text>
              <View style={styles.chipRow}>
                {spiritualLabels.map((label) => (
                  <ScalePress key={label} onPress={() => handleAddGoal(label)} scale={0.92}>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>+ {label}</Text>
                    </View>
                  </ScalePress>
                ))}
              </View>
            </FadeInLegacy>
          )}

          <FadeInLegacy delay={50}>
            <Text style={styles.quickLabel}>Add your own</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Wake at 6, Mincha, Call Mom"
                placeholderTextColor={colors.text.tertiary}
                value={quickAddText}
                onChangeText={setQuickAddText}
                onSubmitEditing={() => handleAddGoal(quickAddText)}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addBtn, !quickAddText.trim() && styles.addBtnDisabled]}
                onPress={() => handleAddGoal(quickAddText)}
                disabled={!quickAddText.trim()}
              >
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </FadeInLegacy>

          <Text style={styles.listLabel}>Your goals</Text>
          {goals.length > 0 && (
            <Text style={styles.listHint}>Tap the circle when you've done it — so satisfying</Text>
          )}
          {goals.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No goals yet. Add a few above to start your day.</Text>
            </View>
          ) : (
            goals.map((g, i) => (
              <SlideInRow key={g.id} delay={i * 35}>
                <GoalRow
                  goal={g}
                  onToggle={() => handleToggle(g.id)}
                  onRemove={() => handleRemove(g.id)}
                />
              </SlideInRow>
            ))
          )}

          <ViewPastDaysButton onPress={() => (navigation as any).navigate('GoalsHistory')} />

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      <AllDoneCelebration visible={showCelebration} onDismiss={() => setShowCelebration(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.xl + spacing.safeTopInset },
  backRow: { marginBottom: spacing.md },
  backText: { fontFamily: fonts.body.medium, fontSize: 16, color: colors.text.secondary },
  title: { fontFamily: fonts.heading.bold, fontSize: 28, color: colors.text.primary, marginBottom: 4 },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.text.secondary, marginBottom: spacing.md },
  progressWrap: { alignItems: 'center', marginBottom: spacing.lg },
  quickLabel: { fontFamily: fonts.heading.semibold, fontSize: 14, color: colors.text.secondary, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  chipText: { fontFamily: fonts.body.medium, fontSize: 14, color: colors.primary.dark },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  input: {
    flex: 1,
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  addBtn: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { fontFamily: fonts.body.semibold, fontSize: 15, color: '#fff' },
  listLabel: { fontFamily: fonts.heading.semibold, fontSize: 16, color: colors.text.primary, marginBottom: spacing.xs },
  listHint: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.text.tertiary, marginBottom: spacing.sm },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.text.tertiary },
  historyButtonWrap: { marginTop: spacing.xl },
  historyButton: {
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  historyButtonText: { fontFamily: fonts.heading.semibold, fontSize: 17, color: '#fff', marginBottom: 2 },
  historyButtonSubtext: { fontFamily: fonts.body.regular, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  historyButtonArrow: { fontFamily: fonts.body.regular, fontSize: 18, color: '#fff', marginTop: 4 },
  bottomSpacer: { height: 140 },
  streakPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: spacing.md,
  },
  streakPillText: { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.primary.dark },
});
