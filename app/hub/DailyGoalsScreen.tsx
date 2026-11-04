/**
 * Daily Goals – add in the morning, check off at night.
 * Grouped list with a spring check-off, haptics on toggles, and a native keyboard-aware form.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { Screen, Section, ListRow, Chip, GlassButton, EmptyState } from '../../components/ui';
import { PracticeHeader, PracticeField, GroupLabel } from '../../components/hub/PracticeKit';
import { AllDoneCelebration } from '../../components/hub/AllDoneCelebration';
import { GoalProgressRing } from '../../components/hub/GoalProgressRing';
import { useTheme } from '../../src/design/theme';
import { DailyGoalsService, type DailyGoalItem } from '../../src/storage/DailyGoalsService';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { SPIRITUAL_GOAL_OPTIONS } from '../../src/types/preferences';

const MIN_TARGET = 44;

interface GoalCheckRowProps {
  goal: DailyGoalItem;
  onToggle: () => void;
  onRemove: () => void;
}

function GoalCheckRow({ goal, onToggle, onRemove }: GoalCheckRowProps) {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(goal.completed ? 1 : 0);
  const checkSize = spacing.lg + spacing.xs;

  useEffect(() => {
    const target = goal.completed ? 1 : 0;
    pop.value = reduceMotion ? target : withSpring(target, { damping: 14, stiffness: 260 });
  }, [goal.completed, reduceMotion, pop]);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ scale: 0.6 + pop.value * 0.4 }],
  }));

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: MIN_TARGET,
        paddingVertical: spacing.xs,
        paddingLeft: spacing.xs,
        paddingRight: spacing.md,
      }}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: goal.completed }}
        accessibilityLabel={goal.text}
        hitSlop={spacing.xs}
        style={{
          width: MIN_TARGET,
          height: MIN_TARGET,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: checkSize,
            height: checkSize,
            borderRadius: checkSize / 2,
            borderWidth: spacing['2xs'],
            borderColor: goal.completed ? theme.colors.primary.main : theme.colors.neutral[400],
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: theme.colors.primary.main,
                alignItems: 'center',
                justifyContent: 'center',
              },
              fillStyle,
            ]}
          >
            <Ionicons name="checkmark" size={type.fontSize.base} color={theme.colors.text.inverse} />
          </Animated.View>
        </View>
      </Pressable>

      <Text
        style={[
          type.textStyles.body,
          {
            flex: 1,
            marginLeft: spacing.xs,
            color: goal.completed ? theme.colors.text.tertiary : theme.colors.text.primary,
            textDecorationLine: goal.completed ? 'line-through' : 'none',
          },
        ]}
        numberOfLines={3}
      >
        {goal.text}
      </Text>

      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${goal.text}`}
        style={{
          width: MIN_TARGET,
          height: MIN_TARGET,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="close" size={type.fontSize.xl} color={theme.colors.text.tertiary} />
      </Pressable>
    </View>
  );
}

export const DailyGoalsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { spacing } = theme.tokens;
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
    const goal = goals.find((g) => g.id === goalId);
    const wasCompleted = goal?.completed ?? false;
    void Haptics.selectionAsync();
    const next = await DailyGoalsService.toggleGoal(new Date(), goalId);
    setGoals(next);
    const newCompleted = next.filter((g) => g.completed).length;
    if (!wasCompleted && newCompleted === next.length && next.length > 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCelebration(true);
    }
  };

  const handleRemove = async (goalId: string) => {
    void Haptics.selectionAsync();
    const next = await DailyGoalsService.removeGoal(new Date(), goalId);
    setGoals(next);
  };

  const completedCount = goals.filter((g) => g.completed).length;
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const subtitle = streak > 0 ? `${dayName} · ${streak} day streak` : dayName;

  return (
    <View style={{ flex: 1 }}>
    <Screen
      scroll={false}
      header={
        <PracticeHeader
          title="Today's goals"
          subtitle={subtitle}
          onBack={() => navigation.goBack()}
          backLabel="Back to Hub"
        />
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'flex-start', marginBottom: spacing.lg, marginHorizontal: spacing.sm }}>
            <GoalProgressRing completed={completedCount} total={goals.length} />
          </View>

          {goals.length === 0 ? (
            <EmptyState title="No goals yet" message="Add a few below to start your day." />
          ) : (
            <Section title="Your goals" footer="Tap the circle when it is done.">
              {goals.map((g) => (
                <GoalCheckRow
                  key={g.id}
                  goal={g}
                  onToggle={() => handleToggle(g.id)}
                  onRemove={() => handleRemove(g.id)}
                />
              ))}
            </Section>
          )}

          <PracticeField
            label="Add your own"
            placeholder="e.g. Wake at 6, Mincha, Call Mom"
            value={quickAddText}
            onChangeText={setQuickAddText}
            onSubmitEditing={() => handleAddGoal(quickAddText)}
            returnKeyType="done"
            style={{ marginBottom: spacing.sm }}
          />
          <GlassButton
            title="Add goal"
            onPress={() => handleAddGoal(quickAddText)}
            disabled={!quickAddText.trim()}
            style={{ marginBottom: spacing.lg }}
          />

          {spiritualLabels.length > 0 ? (
            <View style={{ marginBottom: spacing.lg }}>
              <GroupLabel>Quick add</GroupLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {spiritualLabels.map((label) => (
                  <Chip key={label} label={`+ ${label}`} onPress={() => handleAddGoal(label)} />
                ))}
              </View>
            </View>
          ) : null}

          <Section>
            <ListRow
              title="Past days"
              subtitle="See what you have accomplished"
              showChevron
              onPress={() => (navigation as any).navigate('GoalsHistory')}
            />
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
    <AllDoneCelebration visible={showCelebration} onDismiss={() => setShowCelebration(false)} />
    </View>
  );
};
