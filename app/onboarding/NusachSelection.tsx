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
import { NUSACH_OPTIONS, Nusach } from '../../src/types/nusach';

const { width, height } = Dimensions.get('window');

interface NusachSelectionProps {
  onSelect: (nusach: Nusach) => void;
  onSkip?: () => void;
}

// Glass Card Component with proper liquid glass effect
const GlassCard: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.glassCardWeb, style]}>
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.85)',
            'rgba(255, 255, 255, 0.65)',
            'rgba(255, 255, 255, 0.75)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    );
  }

  return (
    <BlurView intensity={100} tint="light" style={[styles.glassCardNative, style]}>
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.6)',
          'rgba(255, 255, 255, 0.3)',
          'rgba(255, 255, 255, 0.4)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </BlurView>
  );
};

// Glass Option Component
const GlassOption: React.FC<{
  children: React.ReactNode;
  selected: boolean;
  onPress: () => void;
}> = ({ children, selected, onPress }) => {
  if (Platform.OS === 'web') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.optionWeb, selected && styles.optionSelectedWeb]}>
          <LinearGradient
            colors={
              selected
                ? ['rgba(212, 165, 184, 0.35)', 'rgba(212, 165, 184, 0.2)']
                : ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.5)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {children}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <BlurView
        intensity={selected ? 80 : 50}
        tint="light"
        style={[styles.optionNative, selected && styles.optionSelectedNative]}
      >
        <LinearGradient
          colors={
            selected
              ? ['rgba(212, 165, 184, 0.3)', 'rgba(212, 165, 184, 0.15)']
              : ['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.3)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </BlurView>
    </TouchableOpacity>
  );
};

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
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5', '#FAF9F7']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Orbs with gradient */}
      <View style={styles.orb1}>
        <LinearGradient
          colors={['rgba(212, 165, 184, 0.5)', 'rgba(212, 165, 184, 0.2)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>
      <View style={styles.orb2}>
        <LinearGradient
          colors={['rgba(165, 196, 212, 0.5)', 'rgba(165, 196, 212, 0.2)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, styles.progressDotActive]} />
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
        <GlassCard>
          <View style={styles.cardContent}>
            <Text style={styles.emoji}>📿</Text>
            <Text style={styles.title}>Which nusach{'\n'}do you daven?</Text>
            <Text style={styles.subtitle}>
              This helps us show you the right tefillot
            </Text>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {NUSACH_OPTIONS.map((option) => (
                <GlassOption
                  key={option.value}
                  selected={selected === option.value}
                  onPress={() => setSelected(option.value)}
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
                </GlassOption>
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
    width: 220,
    height: 220,
    borderRadius: 110,
    top: height * 0.06,
    left: -70,
    overflow: 'hidden',
  },
  orb2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: height * 0.08,
    right: -60,
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
    backgroundColor: 'rgba(212, 165, 184, 0.4)',
  },
  progressDotActive: {
    width: 28,
    backgroundColor: colors.primary.main,
  },
  cardContainer: {
    width: width - spacing.lg * 2,
    maxWidth: 380,
  },
  // Web glass card
  glassCardWeb: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: 'rgba(212, 165, 184, 0.5)',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 20,
  },
  // Native glass card
  glassCardNative: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  cardContent: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
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
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  // Web option
  optionWeb: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  optionSelectedWeb: {
    borderColor: colors.primary.main,
    shadowColor: 'rgba(212, 165, 184, 0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
  },
  // Native option
  optionNative: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  optionSelectedNative: {
    borderColor: colors.primary.main,
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary.main,
  },
  optionText: {
    ...textStyles.bodyLarge,
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
