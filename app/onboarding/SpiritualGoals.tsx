import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Chip, GlassButton } from '../../components/ui';
import { useTheme } from '../../src/design/theme';
import { SPIRITUAL_GOAL_OPTIONS, SpiritualGoal } from '../../src/types/preferences';
import { OmerCalculator } from '../../src/core/omer/OmerCalculator';
import { OnboardingProgress } from './OnboardingProgress';

interface SpiritualGoalsProps {
  onSelect: (goals: SpiritualGoal[]) => void;
  onSkip?: () => void;
}

const MAX_GOALS = 2;
const INPUT_MIN_HEIGHT = 48;

export const SpiritualGoals: React.FC<SpiritualGoalsProps> = ({ onSelect, onSkip }) => {
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;
  const [selected, setSelected] = useState<Set<SpiritualGoal>>(new Set());
  const [customText, setCustomText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const isOmerPeriod = OmerCalculator.isOmerPeriod();
  const availableGoals = isOmerPeriod
    ? SPIRITUAL_GOAL_OPTIONS
    : SPIRITUAL_GOAL_OPTIONS.filter((g) => g.value !== 'sefiras_haomer');

  const toggleGoal = (goal: SpiritualGoal) => {
    const newSelected = new Set(selected);
    if (newSelected.has(goal)) {
      newSelected.delete(goal);
    } else if (newSelected.size < MAX_GOALS) {
      newSelected.add(goal);
    }
    setSelected(newSelected);
  };

  const toggleCustom = () => {
    if (showCustomInput) {
      setShowCustomInput(false);
      setCustomText('');
      const newSelected = new Set(selected);
      newSelected.delete('other');
      setSelected(newSelected);
    } else if (selected.size < MAX_GOALS) {
      setShowCustomInput(true);
    }
  };

  const handleCustomSubmit = () => {
    if (customText.trim()) {
      const newSelected = new Set(selected);
      newSelected.add('other');
      setSelected(newSelected);
    }
  };

  const handleContinue = () => {
    onSelect(Array.from(selected));
  };

  const canSelect = selected.size < MAX_GOALS;

  return (
    <Screen scroll>
      <View style={styles.flex}>
        <OnboardingProgress total={3} index={1} />
        <Text style={[type.textStyles.h2, { color: theme.colors.text.primary }]}>
          What would you like help with?
        </Text>
        <Text
          style={[
            type.textStyles.body,
            { color: theme.colors.text.secondary, marginTop: spacing.sm, marginBottom: spacing.lg },
          ]}
        >
          Choose up to 2. We'll send reminders.
        </Text>

        <View style={[styles.chips, { gap: spacing.sm }]}>
          {availableGoals.map((option) => {
            const isSelected = selected.has(option.value);
            return (
              <Chip
                key={option.value}
                label={option.label}
                selected={isSelected}
                disabled={!isSelected && !canSelect}
                onPress={() => toggleGoal(option.value)}
              />
            );
          })}
          <Chip
            label="+ Custom"
            selected={showCustomInput}
            disabled={!canSelect && !showCustomInput}
            onPress={toggleCustom}
          />
        </View>

        {showCustomInput ? (
          <Animated.View
            entering={FadeInDown.springify().damping(18)}
            style={{ marginTop: spacing.md }}
          >
            <TextInput
              style={[
                type.textStyles.body,
                {
                  minHeight: INPUT_MIN_HEIGHT,
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.background.primary,
                  borderRadius: radii.lg,
                  borderWidth: StyleSheet.hairlineWidth * 2,
                  borderColor: inputFocused ? theme.colors.primary.main : theme.colors.neutral[300],
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                },
              ]}
              placeholder="What's your goal?"
              placeholderTextColor={theme.colors.text.tertiary}
              value={customText}
              onChangeText={setCustomText}
              onSubmitEditing={handleCustomSubmit}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              returnKeyType="done"
              accessibilityLabel="Custom goal"
              autoFocus
            />
          </Animated.View>
        ) : null}

        {selected.size > 0 ? (
          <Text
            style={[
              type.textStyles.caption,
              { color: theme.colors.text.secondary, marginTop: spacing.md },
            ]}
          >
            {selected.size} selected, {MAX_GOALS - selected.size} remaining
          </Text>
        ) : null}

        <View style={styles.flex} />

        <View style={{ gap: spacing.sm, paddingTop: spacing.lg }}>
          {selected.size > 0 ? (
            <Animated.View entering={FadeInDown.springify().damping(18)}>
              <GlassButton title="Continue" size="lg" onPress={handleContinue} />
            </Animated.View>
          ) : null}
          {onSkip ? <GlassButton title="Skip" variant="ghost" onPress={onSkip} /> : null}
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
