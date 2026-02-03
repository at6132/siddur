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
          colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.8)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    );
  }
  return (
    <BlurView intensity={120} tint="light" style={styles.glassCardNative}>
      <LinearGradient
        colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.5)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </BlurView>
  );
};

// Enhanced chip component with animations
const AnimatedChip: React.FC<{
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  index: number;
}> = ({ label, selected, disabled, onPress, index }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 80,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    if (!disabled) {
      Animated.spring(pressScale, {
        toValue: 0.94,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.9}
      >
        <Animated.View 
          style={[
            styles.chip,
            selected && styles.chipSelected,
            disabled && styles.chipDisabled,
            { transform: [{ scale: pressScale }] }
          ]}
        >
          <Text style={[
            styles.chipText,
            selected && styles.chipTextSelected,
          ]}>
            {label}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const SpiritualGoals: React.FC<SpiritualGoalsProps> = ({ onSelect, onSkip }) => {
  const [selected, setSelected] = useState<Set<SpiritualGoal>>(new Set());
  const [customText, setCustomText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(0)).current;
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;
  const inputOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Main card entrance
    Animated.parallel([
      Animated.timing(fadeAnim, { 
        toValue: 1, 
        duration: 800, 
        useNativeDriver: true 
      }),
      Animated.spring(slideAnim, { 
        toValue: 0, 
        tension: 40, 
        friction: 9, 
        useNativeDriver: true 
      }),
    ]).start();

    // Gentle floating orb animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(orb1Anim, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Anim, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        }),
        Animated.timing(orb2Anim, {
          toValue: 0,
          duration: 10000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    // Animate button when selection changes
    if (selected.size > 0) {
      Animated.spring(buttonScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(buttonScale, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [selected]);

  useEffect(() => {
    // Animate custom input
    if (showCustomInput) {
      Animated.spring(inputOpacity, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(inputOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showCustomInput]);

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

  const orb1TranslateY = orb1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30],
  });

  const orb2TranslateY = orb2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -25],
  });

  return (
    <View style={styles.container}>
      {/* Enhanced Background Gradient */}
      <LinearGradient
        colors={['#FAF9F7', '#E8F0F5', '#F5E6E8', '#FAF9F7']}
        style={StyleSheet.absoluteFill}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Floating Orbs with animation */}
      <Animated.View style={[styles.orb1, { transform: [{ translateY: orb1TranslateY }] }]}>
        <LinearGradient 
          colors={['rgba(165,196,212,0.6)', 'rgba(165,196,212,0.25)']} 
          style={StyleSheet.absoluteFill} 
        />
      </Animated.View>
      <Animated.View style={[styles.orb2, { transform: [{ translateY: orb2TranslateY }] }]}>
        <LinearGradient 
          colors={['rgba(212,196,232,0.6)', 'rgba(212,196,232,0.25)']} 
          style={StyleSheet.absoluteFill} 
        />
      </Animated.View>

      {/* Enhanced Progress Dots */}
      <View style={styles.progressContainer}>
        <View style={styles.progressDot} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
      </View>

      <Animated.View style={[styles.cardContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <GlassCard>
          <View style={styles.cardContent}>
            <Text style={styles.title}>What would you{'\n'}like help with?</Text>
            <Text style={styles.subtitle}>Choose up to 2 — we'll send gentle reminders</Text>

            {/* Animated chips */}
            <View style={styles.chipsContainer}>
              {availableGoals.map((option, index) => {
                const isSelected = selected.has(option.value);
                const isDisabled = !isSelected && !canSelect;
                return (
                  <AnimatedChip
                    key={option.value}
                    label={option.label}
                    selected={isSelected}
                    disabled={isDisabled}
                    onPress={() => toggleGoal(option.value)}
                    index={index}
                  />
                );
              })}

              {/* Custom chip */}
              <AnimatedChip
                label="+ Custom"
                selected={showCustomInput}
                disabled={!canSelect && !showCustomInput}
                onPress={toggleCustom}
                index={availableGoals.length}
              />
            </View>

            {/* Custom input with animation */}
            {showCustomInput && (
              <Animated.View 
                style={[
                  styles.customInputContainer,
                  { opacity: inputOpacity }
                ]}
              >
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
              </Animated.View>
            )}

            {/* Enhanced selected count badge */}
            {selected.size > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {selected.size} selected • {2 - selected.size} remaining
                </Text>
              </View>
            )}

            {/* Actions with animated button */}
            <View style={styles.actions}>
              {selected.size > 0 && (
                <Animated.View 
                  style={[
                    styles.buttonWrapper,
                    { 
                      opacity: buttonScale,
                      transform: [{ scale: buttonScale }]
                    }
                  ]}
                >
                  <GlassButton 
                    title="Continue" 
                    onPress={handleContinue} 
                    variant="primary" 
                    size="large" 
                  />
                </Animated.View>
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
    width: 230, 
    height: 230, 
    borderRadius: 115, 
    top: height * 0.07, 
    right: -80, 
    overflow: 'hidden',
  },
  orb2: { 
    position: 'absolute', 
    width: 190, 
    height: 190, 
    borderRadius: 95, 
    bottom: height * 0.09, 
    left: -70, 
    overflow: 'hidden',
  },
  progressContainer: { 
    position: 'absolute', 
    top: height * 0.08, 
    flexDirection: 'row', 
    gap: spacing.md,
  },
  progressDot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: 'rgba(212,165,184,0.35)',
  },
  progressDotActive: { 
    width: 32, 
    backgroundColor: colors.secondary.main,
    shadowColor: colors.secondary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  cardContainer: { 
    width: width - spacing.lg * 2, 
    maxWidth: 400,
  },
  glassCardWeb: { 
    borderRadius: borderRadius['3xl'], 
    overflow: 'hidden', 
    borderWidth: 2, 
    borderColor: 'rgba(255,255,255,0.9)', 
    shadowColor: colors.shadow.dark, 
    shadowOffset: { width: 0, height: 24 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 48, 
    elevation: 24,
  },
  glassCardNative: { 
    borderRadius: borderRadius['3xl'], 
    overflow: 'hidden', 
    borderWidth: 2, 
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 16,
  },
  cardContent: { 
    padding: spacing['2xl'], 
    alignItems: 'center',
  },
  title: { 
    ...textStyles.h2, 
    color: colors.text.primary, 
    textAlign: 'center', 
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  subtitle: { 
    ...textStyles.body, 
    color: colors.text.secondary, 
    textAlign: 'center', 
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minHeight: 48,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 2,
    borderColor: 'rgba(165,196,212,0.4)',
    justifyContent: 'center',
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  chipSelected: {
    backgroundColor: 'rgba(165,196,212,0.3)',
    borderColor: colors.secondary.main,
    shadowColor: 'rgba(165,196,212,0.5)',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    ...textStyles.body,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    ...textStyles.bodyBold,
    color: colors.secondary.dark,
    fontSize: 16,
  },
  customInputContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  customInput: {
    ...textStyles.body,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.secondary.main,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: 56,
    color: colors.text.primary,
    textAlign: 'center',
    shadowColor: colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  badge: { 
    backgroundColor: 'rgba(165,196,212,0.35)', 
    paddingHorizontal: spacing.lg, 
    paddingVertical: spacing.sm, 
    borderRadius: borderRadius.full, 
    marginBottom: spacing.lg,
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  badgeText: { 
    ...textStyles.caption, 
    color: colors.secondary.dark, 
    fontWeight: '600',
    fontSize: 13,
  },
  actions: { 
    width: '100%', 
    alignItems: 'center', 
    gap: spacing.lg,
  },
  buttonWrapper: {
    width: '100%',
  },
  skipButton: { 
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: { 
    ...textStyles.body, 
    color: colors.text.tertiary,
  },
});
