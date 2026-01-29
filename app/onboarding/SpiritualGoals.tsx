import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassButton } from '../../components/ui/GlassButton';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';
import {
  SPIRITUAL_GOAL_OPTIONS,
  SpiritualGoal,
} from '../../src/types/preferences';
import { OmerCalculator } from '../../src/core/omer/OmerCalculator';

const { width, height } = Dimensions.get('window');

interface SpiritualGoalsProps {
  onSelect: (goals: SpiritualGoal[]) => void;
  onSkip?: () => void;
}

const GlassCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.glassCardWeb}>
        <LinearGradient
          colors={['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.65)', 'rgba(255,255,255,0.75)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    );
  }
  return (
    <BlurView intensity={100} tint="light" style={styles.glassCardNative}>
      <LinearGradient
        colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.4)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </BlurView>
  );
};

export const SpiritualGoals: React.FC<SpiritualGoalsProps> = ({ onSelect, onSkip }) => {
  const [selected, setSelected] = useState<Set<SpiritualGoal>>(new Set());
  const [customText, setCustomText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const isOmerPeriod = OmerCalculator.isOmerPeriod();
  const availableGoals = isOmerPeriod
    ? SPIRITUAL_GOAL_OPTIONS
    : SPIRITUAL_GOAL_OPTIONS.filter((g) => g.value !== 'sefiras_haomer');

  const toggleGoal = (goal: SpiritualGoal) => {
    const newSelected = new Set(selected);
    if (newSelected.has(goal)) {
      newSelected.delete(goal);
    } else if (newSelected.size < 2) {
      newSelected.add(goal);
    }
    setSelected(newSelected);
  };

  const toggleCustom = () => {
    if (showCustomInput) {
      setShowCustomInput(false);
      setCustomText('');
      const newSelected = new Set(selected);
      newSelected.delete('custom');
      setSelected(newSelected);
    } else if (selected.size < 2) {
      setShowCustomInput(true);
    }
  };

  const handleCustomSubmit = () => {
    if (customText.trim()) {
      const newSelected = new Set(selected);
      newSelected.add('custom');
      setSelected(newSelected);
    }
  };

  const handleContinue = () => {
    onSelect(Array.from(selected));
  };

  const canSelect = selected.size < 2;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAF9F7', '#E8F0F5', '#F5E6E8', '#FAF9F7']}
        style={StyleSheet.absoluteFill}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <View style={styles.orb1}>
        <LinearGradient colors={['rgba(165,196,212,0.5)', 'rgba(165,196,212,0.2)']} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.orb2}>
        <LinearGradient colors={['rgba(212,196,232,0.5)', 'rgba(212,196,232,0.2)']} style={StyleSheet.absoluteFill} />
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressDot} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={styles.progressDot} />
      </View>

      <Animated.View style={[styles.cardContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <GlassCard>
          <View style={styles.cardContent}>
            <Text style={styles.title}>What would you{'\n'}like help with?</Text>
            <Text style={styles.subtitle}>Choose up to 2 — we'll send gentle reminders</Text>

            {/* Suggestion chips */}
            <View style={styles.chipsContainer}>
              {availableGoals.map((option) => {
                const isSelected = selected.has(option.value);
                const isDisabled = !isSelected && !canSelect;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => toggleGoal(option.value)}
                    disabled={isDisabled}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                      isDisabled && styles.chipDisabled,
                    ]}>
                      <Text style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}>
                        {option.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Custom chip */}
              <TouchableOpacity
                onPress={toggleCustom}
                disabled={!canSelect && !showCustomInput}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.chip,
                  styles.chipCustom,
                  showCustomInput && styles.chipSelected,
                  (!canSelect && !showCustomInput) && styles.chipDisabled,
                ]}>
                  <Text style={[
                    styles.chipText,
                    showCustomInput && styles.chipTextSelected,
                  ]}>
                    + Custom
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Custom input */}
            {showCustomInput && (
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  placeholder="What's your goal?"
                  placeholderTextColor={colors.text.tertiary}
                  value={customText}
                  onChangeText={setCustomText}
                  onSubmitEditing={handleCustomSubmit}
                  returnKeyType="done"
                  autoFocus
                />
              </View>
            )}

            {/* Selected count */}
            {selected.size > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{selected.size} selected</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              {selected.size > 0 && (
                <GlassButton 
                  title="Continue" 
                  onPress={handleContinue} 
                  variant="primary" 
                  size="large" 
                />
              )}
              {onSkip && (
                <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                  <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </GlassCard>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    overflow: 'hidden',
  },
  orb1: { 
    position: 'absolute', 
    width: 200, 
    height: 200, 
    borderRadius: 100, 
    top: height * 0.08, 
    right: -70, 
    overflow: 'hidden',
  },
  orb2: { 
    position: 'absolute', 
    width: 160, 
    height: 160, 
    borderRadius: 80, 
    bottom: height * 0.1, 
    left: -60, 
    overflow: 'hidden',
  },
  progressContainer: { 
    position: 'absolute', 
    top: height * 0.08, 
    flexDirection: 'row', 
    gap: spacing.sm,
  },
  progressDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: 'rgba(212,165,184,0.4)',
  },
  progressDotActive: { 
    width: 28, 
    backgroundColor: colors.secondary.main,
  },
  cardContainer: { 
    width: width - spacing.lg * 2, 
    maxWidth: 380,
  },
  glassCardWeb: { 
    borderRadius: borderRadius['2xl'], 
    overflow: 'hidden', 
    borderWidth: 1.5, 
    borderColor: 'rgba(255,255,255,0.8)', 
    shadowColor: 'rgba(165,196,212,0.5)', 
    shadowOffset: { width: 0, height: 20 }, 
    shadowOpacity: 1, 
    shadowRadius: 40, 
    elevation: 20,
  },
  glassCardNative: { 
    borderRadius: borderRadius['2xl'], 
    overflow: 'hidden', 
    borderWidth: 1.5, 
    borderColor: 'rgba(255,255,255,0.6)',
  },
  cardContent: { 
    padding: spacing.xl, 
    alignItems: 'center',
  },
  title: { 
    ...textStyles.h2, 
    color: colors.text.primary, 
    textAlign: 'center', 
    marginBottom: spacing.sm,
  },
  subtitle: { 
    ...textStyles.body, 
    color: colors.text.secondary, 
    textAlign: 'center', 
    marginBottom: spacing.xl,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(165,196,212,0.3)',
  },
  chipSelected: {
    backgroundColor: 'rgba(165,196,212,0.25)',
    borderColor: colors.secondary.main,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipCustom: {
    borderStyle: 'dashed',
    borderColor: 'rgba(165,196,212,0.5)',
  },
  chipText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  chipTextSelected: {
    ...textStyles.bodyBold,
    color: colors.secondary.dark,
  },
  customInputContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  customInput: {
    ...textStyles.body,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.secondary.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    textAlign: 'center',
  },
  badge: { 
    backgroundColor: 'rgba(165,196,212,0.3)', 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.xs, 
    borderRadius: borderRadius.full, 
    marginBottom: spacing.md,
  },
  badgeText: { 
    ...textStyles.caption, 
    color: colors.secondary.dark, 
    fontWeight: '600',
  },
  actions: { 
    width: '100%', 
    alignItems: 'center', 
    gap: spacing.md,
  },
  skipButton: { 
    paddingVertical: spacing.sm,
  },
  skipText: { 
    ...textStyles.body, 
    color: colors.text.tertiary,
  },
});
