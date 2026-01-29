import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassButton } from '../../components/ui/GlassButton';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';
import { NUSACH_OPTIONS, Nusach } from '../../src/types/nusach';

const { width, height } = Dimensions.get('window');

interface NusachSelectionProps {
  onSelect: (nusach: Nusach) => void;
  onSkip?: () => void;
}

export const NusachSelection: React.FC<NusachSelectionProps> = ({
  onSelect,
  onSkip,
}) => {
  const [selected, setSelected] = useState<Nusach | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Orbs */}
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />

      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={styles.progressDot} />
        <View style={styles.progressDot} />
      </View>

      {/* Main Glass Card */}
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <BlurView intensity={100} tint="light" style={styles.glassCard}>
          <View style={styles.glassOverlay}>
            <Text style={styles.emoji}>📿</Text>
            <Text style={styles.title}>Which nusach{'\n'}do you daven?</Text>
            <Text style={styles.subtitle}>
              This helps us show you the right tefillot
            </Text>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {NUSACH_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setSelected(option.value)}
                  activeOpacity={0.7}
                >
                  <BlurView
                    intensity={selected === option.value ? 80 : 40}
                    tint="light"
                    style={[
                      styles.optionCard,
                      selected === option.value && styles.optionCardSelected,
                    ]}
                  >
                    <View style={styles.optionInner}>
                      <View
                        style={[
                          styles.radio,
                          selected === option.value && styles.radioSelected,
                        ]}
                      >
                        {selected === option.value && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.optionText,
                          selected === option.value && styles.optionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {selected && (
                <GlassButton
                  title="Continue"
                  onPress={() => onSelect(selected)}
                  variant="primary"
                  size="large"
                />
              )}
              {onSkip && (
                <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                  <Text style={styles.skipText}>I'm not sure yet</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </BlurView>
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
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(212, 165, 184, 0.35)',
    top: height * 0.08,
    left: -60,
  },
  orb2: {
    width: 160,
    height: 160,
    backgroundColor: 'rgba(165, 196, 212, 0.35)',
    bottom: height * 0.1,
    right: -50,
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
    backgroundColor: 'rgba(212, 165, 184, 0.4)',
  },
  progressDotActive: {
    width: 28,
    backgroundColor: colors.primary.main,
  },
  cardContainer: {
    width: width - spacing.xl * 2,
    maxWidth: 400,
  },
  glassCard: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  glassOverlay: {
    padding: spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 44,
    marginBottom: spacing.md,
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
  optionsContainer: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  optionCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  optionCardSelected: {
    borderColor: colors.primary.main,
    borderWidth: 2,
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary.main,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.main,
  },
  optionText: {
    ...textStyles.body,
    color: colors.text.primary,
  },
  optionTextSelected: {
    ...textStyles.bodyBold,
    color: colors.primary.dark,
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
