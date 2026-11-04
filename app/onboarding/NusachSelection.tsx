import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Section, ListRow, GlassButton } from '../../components/ui';
import { useTheme } from '../../src/design/theme';
import { NUSACH_OPTIONS, Nusach } from '../../src/types/nusach';
import { OnboardingProgress } from './OnboardingProgress';

interface NusachSelectionProps {
  onSelect: (nusach: Nusach) => void;
  onSkip?: () => void;
}

const CHECK_SIZE = 24;

export const NusachSelection: React.FC<NusachSelectionProps> = ({ onSelect, onSkip }) => {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  const [selected, setSelected] = useState<Nusach | null>(null);

  return (
    <Screen scroll>
      <View style={styles.flex}>
        <OnboardingProgress total={2} index={0} />
        <Text style={[type.textStyles.h2, { color: theme.colors.text.primary }]}>
          Which nusach do you daven?
        </Text>
        <Text
          style={[
            type.textStyles.body,
            { color: theme.colors.text.secondary, marginTop: spacing.sm, marginBottom: spacing.lg },
          ]}
        >
          This helps us show you the right tefillot
        </Text>

        <Section>
          {NUSACH_OPTIONS.map((option) => {
            const isSelected = selected === option.value;
            return (
              <ListRow
                key={option.value}
                title={option.label}
                onPress={() => setSelected(option.value)}
                trailing={
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={CHECK_SIZE}
                    color={isSelected ? theme.colors.primary.main : theme.colors.neutral[400]}
                  />
                }
              />
            );
          })}
        </Section>

        <View style={styles.flex} />

        <View style={{ gap: spacing.sm, paddingTop: spacing.lg }}>
          {selected ? (
            <Animated.View entering={FadeInDown.springify().damping(18)}>
              <GlassButton title="Continue" size="lg" onPress={() => onSelect(selected)} />
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
});
