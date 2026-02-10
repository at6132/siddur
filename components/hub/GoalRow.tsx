/**
 * Single goal row: satisfying check-off with animated strikethrough and row "settle."
 * The line draws across the text when you check – way more satisfying than Notes.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { SatisfyingCheckbox } from './SatisfyingCheckbox';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { colors } from '../../src/design/colors';
import type { DailyGoalItem } from '../../src/storage/DailyGoalsService';

const springConfig = { damping: 20, stiffness: 200 };

interface GoalRowProps {
  goal: DailyGoalItem;
  onToggle: () => void;
  onRemove: () => void;
}

export const GoalRow: React.FC<GoalRowProps> = ({ goal, onToggle, onRemove }) => {
  const strikeWidth = useSharedValue(0);
  const rowScale = useSharedValue(1);
  const bgOpacity = useSharedValue(1);

  useEffect(() => {
    if (goal.completed) {
      strikeWidth.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
      rowScale.value = withSequence(
        withSpring(0.98, { damping: 18, stiffness: 300 }),
        withSpring(1, springConfig)
      );
      bgOpacity.value = withTiming(0.92, { duration: 200 });
    } else {
      strikeWidth.value = withTiming(0, { duration: 180 });
      bgOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [goal.completed]);

  const strikeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: strikeWidth.value }],
  }));

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rowScale.value }],
    opacity: bgOpacity.value,
  }));

  return (
    <Animated.View style={[styles.goalRow, rowStyle]}>
      <SatisfyingCheckbox checked={goal.completed} onToggle={onToggle} size={30} />
      <View style={styles.textWrap}>
        <Text style={[styles.goalText, goal.completed && styles.goalTextDone]} numberOfLines={2}>
          {goal.text}
        </Text>
        <Animated.View style={[styles.strikethrough, strikeStyle]} />
      </View>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={styles.removeText}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.85)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  textWrap: {
    flex: 1,
    marginLeft: 4,
    justifyContent: 'center',
  },
  goalText: {
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text.primary,
  },
  goalTextDone: {
    color: colors.text.tertiary,
  },
  strikethrough: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -1,
    height: 2,
    backgroundColor: colors.primary.main,
    borderRadius: 1,
    width: '100%',
    transformOrigin: 'left',
  },
  removeText: {
    fontFamily: fonts.body.regular,
    fontSize: 24,
    color: colors.text.tertiary,
    padding: 4,
  },
});
