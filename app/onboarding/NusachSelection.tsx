import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassButton } from '../../components/ui/GlassButton';
import { ScalePress } from '../../components/animations/ScalePress';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';
import { NUSACH_OPTIONS, Nusach } from '../../src/types/nusach';
import { FadeIn } from '../../components/animations/FadeIn';

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
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateOrb = (orb: Animated.Value, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(orb, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(orb, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    animateOrb(orb1, 4000);
    animateOrb(orb2, 5500);
  }, []);

  const orb1Y = orb1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -25],
  });

  const orb2Y = orb2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Orbs */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          { transform: [{ translateY: orb1Y }] },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          { transform: [{ translateY: orb2Y }] },
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        <FadeIn delay={100}>
          <View style={styles.progress}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
          </View>
        </FadeIn>

        {/* Main Card */}
        <FadeIn delay={200}>
          <View style={styles.mainCard}>
            <BlurView intensity={80} style={styles.cardBlur}>
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.cardContent}>
                <Text style={styles.emoji}>📿</Text>
                <Text style={styles.title}>Which nusach do you daven?</Text>
                <Text style={styles.subtitle}>
                  This helps us show you the right tefillot and minhagim
                </Text>

                <View style={styles.options}>
                  {NUSACH_OPTIONS.map((option, index) => (
                    <FadeIn key={option.value} delay={300 + index * 80}>
                      <ScalePress
                        onPress={() => setSelected(option.value)}
                        style={styles.optionWrapper}
                      >
                        <View
                          style={[
                            styles.option,
                            selected === option.value && styles.optionSelected,
                          ]}
                        >
                          <BlurView
                            intensity={40}
                            style={StyleSheet.absoluteFill}
                          />
                          <View style={styles.optionInner}>
                            <View
                              style={[
                                styles.radioOuter,
                                selected === option.value &&
                                  styles.radioOuterSelected,
                              ]}
                            >
                              {selected === option.value && (
                                <View style={styles.radioInner} />
                              )}
                            </View>
                            <Text
                              style={[
                                styles.optionText,
                                selected === option.value &&
                                  styles.optionTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </View>
                        </View>
                      </ScalePress>
                    </FadeIn>
                  ))}
                </View>

                <View style={styles.actions}>
                  {selected && (
                    <FadeIn delay={100}>
                      <GlassButton
                        title="Continue"
                        onPress={() => onSelect(selected)}
                        variant="primary"
                        size="large"
                      />
                    </FadeIn>
                  )}
                  {onSkip && (
                    <GlassButton
                      title="I'm not sure yet"
                      onPress={onSkip}
                      variant="ghost"
                      size="md"
                      style={styles.skipButton}
                    />
                  )}
                </View>
              </View>
            </BlurView>
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing['3xl'],
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(212, 165, 184, 0.3)',
    top: height * 0.08,
    left: -80,
  },
  orb2: {
    width: 160,
    height: 160,
    backgroundColor: 'rgba(165, 196, 212, 0.3)',
    bottom: height * 0.15,
    right: -60,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(212, 165, 184, 0.3)',
  },
  progressDotActive: {
    backgroundColor: colors.primary.main,
    width: 24,
  },
  mainCard: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },
  cardBlur: {
    overflow: 'hidden',
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
  options: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  optionWrapper: {
    marginBottom: spacing.sm,
  },
  option: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(212, 165, 184, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  optionSelected: {
    borderColor: colors.primary.main,
    backgroundColor: 'rgba(212, 165, 184, 0.15)',
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingVertical: spacing.lg,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  radioOuterSelected: {
    borderColor: colors.primary.main,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.main,
  },
  optionText: {
    ...textStyles.bodyLarge,
    color: colors.text.primary,
  },
  optionTextSelected: {
    color: colors.primary.dark,
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    marginTop: spacing.md,
  },
  skipButton: {
    marginTop: spacing.md,
  },
});
