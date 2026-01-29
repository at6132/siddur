import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
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

const GOAL_EMOJIS: Record<SpiritualGoal, string> = {
  daily_tehillim: '📖',
  mincha: '🕯️',
  neshama: '✨',
  sefiras_haomer: '🌾',
  brachos: '🙏',
};

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

const GlassOption: React.FC<{
  children: React.ReactNode;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}> = ({ children, selected, disabled, onPress }) => {
  const content = (
    <View style={styles.optionInner}>{children}</View>
  );

  if (Platform.OS === 'web') {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.7} style={disabled && styles.disabled}>
        <View style={[styles.optionWeb, selected && styles.optionSelectedWeb]}>
          <LinearGradient
            colors={selected ? ['rgba(165,196,212,0.35)', 'rgba(165,196,212,0.2)'] : ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.5)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {content}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.7} style={disabled && styles.disabled}>
      <BlurView intensity={selected ? 80 : 50} tint="light" style={[styles.optionNative, selected && styles.optionSelectedNative]}>
        <LinearGradient
          colors={selected ? ['rgba(165,196,212,0.3)', 'rgba(165,196,212,0.15)'] : ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.3)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {content}
      </BlurView>
    </TouchableOpacity>
  );
};

export const SpiritualGoals: React.FC<SpiritualGoalsProps> = ({ onSelect, onSkip }) => {
  const [selected, setSelected] = useState<Set<SpiritualGoal>>(new Set());
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
            <Text style={styles.emoji}>🌟</Text>
            <Text style={styles.title}>What would you{'\n'}like help with?</Text>
            <Text style={styles.subtitle}>Choose up to 2 — we'll send gentle reminders</Text>

            <View style={styles.optionsContainer}>
              {availableGoals.map((option) => {
                const isSelected = selected.has(option.value);
                const isDisabled = !isSelected && selected.size >= 2;
                return (
                  <GlassOption key={option.value} selected={isSelected} disabled={isDisabled} onPress={() => toggleGoal(option.value)}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.optionEmoji}>{GOAL_EMOJIS[option.value]}</Text>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option.label}</Text>
                  </GlassOption>
                );
              })}
            </View>

            {selected.size > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{selected.size} selected</Text>
              </View>
            )}

            <View style={styles.actions}>
              {selected.size > 0 && (
                <GlassButton title="Continue" onPress={() => onSelect(Array.from(selected))} variant="primary" size="large" />
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
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  orb1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, top: height * 0.08, right: -70, overflow: 'hidden' },
  orb2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, bottom: height * 0.1, left: -60, overflow: 'hidden' },
  progressContainer: { position: 'absolute', top: height * 0.08, flexDirection: 'row', gap: spacing.sm },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(212,165,184,0.4)' },
  progressDotActive: { width: 28, backgroundColor: colors.secondary.main },
  cardContainer: { width: width - spacing.lg * 2, maxWidth: 380 },
  glassCardWeb: { borderRadius: borderRadius['2xl'], overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)', shadowColor: 'rgba(165,196,212,0.5)', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 1, shadowRadius: 40, elevation: 20 },
  glassCardNative: { borderRadius: borderRadius['2xl'], overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' },
  cardContent: { padding: spacing.xl, alignItems: 'center' },
  emoji: { fontSize: 48, marginBottom: spacing.md },
  title: { ...textStyles.h2, color: colors.text.primary, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { ...textStyles.body, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.lg },
  optionsContainer: { width: '100%', gap: spacing.sm, marginBottom: spacing.md },
  disabled: { opacity: 0.4 },
  optionWeb: { borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', shadowColor: 'rgba(0,0,0,0.1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
  optionSelectedWeb: { borderColor: colors.secondary.main, shadowColor: 'rgba(165,196,212,0.4)', shadowOffset: { width: 0, height: 8 }, shadowRadius: 20 },
  optionNative: { borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  optionSelectedNative: { borderColor: colors.secondary.main },
  optionInner: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  checkbox: { width: 22, height: 22, borderRadius: borderRadius.sm, borderWidth: 2, borderColor: colors.text.tertiary, marginRight: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { borderColor: colors.secondary.main, backgroundColor: colors.secondary.main },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  optionEmoji: { fontSize: 20, marginRight: spacing.sm },
  optionText: { ...textStyles.body, color: colors.text.primary, flex: 1 },
  optionTextSelected: { ...textStyles.bodyBold, color: colors.secondary.dark },
  badge: { backgroundColor: 'rgba(165,196,212,0.3)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, marginBottom: spacing.md },
  badgeText: { ...textStyles.caption, color: colors.secondary.dark, fontWeight: '600' },
  actions: { width: '100%', alignItems: 'center', gap: spacing.md },
  skipButton: { paddingVertical: spacing.sm },
  skipText: { ...textStyles.body, color: colors.text.tertiary },
});
