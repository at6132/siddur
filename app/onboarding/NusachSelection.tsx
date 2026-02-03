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

// Enhanced Glass Card Component
const GlassCard: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.glassCardWeb, style]}>
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.9)',
            'rgba(255, 255, 255, 0.7)',
            'rgba(255, 255, 255, 0.8)',
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
    <BlurView intensity={120} tint="light" style={[styles.glassCardNative, style]}>
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.7)',
          'rgba(255, 255, 255, 0.4)',
          'rgba(255, 255, 255, 0.5)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </BlurView>
  );
};

// Enhanced Glass Option Component with animations
const GlassOption: React.FC<{
  children: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  index: number;
}> = ({ children, selected, onPress, index }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 100,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.96,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  if (Platform.OS === 'web') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity 
          onPress={onPress} 
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <Animated.View 
            style={[
              styles.optionWeb, 
              selected && styles.optionSelectedWeb,
              { transform: [{ scale: pressScale }] }
            ]}
          >
            <LinearGradient
              colors={
                selected
                  ? ['rgba(212, 165, 184, 0.4)', 'rgba(212, 165, 184, 0.25)']
                  : ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.6)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {children}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity 
        onPress={onPress} 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <Animated.View style={{ transform: [{ scale: pressScale }] }}>
          <BlurView
            intensity={selected ? 100 : 60}
            tint="light"
            style={[styles.optionNative, selected && styles.optionSelectedNative]}
          >
            <LinearGradient
              colors={
                selected
                  ? ['rgba(212, 165, 184, 0.35)', 'rgba(212, 165, 184, 0.2)']
                  : ['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.4)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {children}
          </BlurView>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const NusachSelection: React.FC<NusachSelectionProps> = ({
  onSelect,
  onSkip,
}) => {
  const [selected, setSelected] = useState<Nusach | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(0)).current;
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Main card entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();

    // Gentle floating orb animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, {
          toValue: 1,
          duration: 7000,
          useNativeDriver: true,
        }),
        Animated.timing(orb1Anim, {
          toValue: 0,
          duration: 7000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Anim, {
          toValue: 1,
          duration: 9000,
          useNativeDriver: true,
        }),
        Animated.timing(orb2Anim, {
          toValue: 0,
          duration: 9000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    // Animate button when selection changes
    if (selected) {
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

  const orb1TranslateY = orb1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 25],
  });

  const orb2TranslateY = orb2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <View style={styles.container}>
      {/* Enhanced Background Gradient */}
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5', '#FAF9F7']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Orbs with animation */}
      <Animated.View style={[styles.orb1, { transform: [{ translateY: orb1TranslateY }] }]}>
        <LinearGradient
          colors={['rgba(212, 165, 184, 0.6)', 'rgba(212, 165, 184, 0.25)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
      <Animated.View style={[styles.orb2, { transform: [{ translateY: orb2TranslateY }] }]}>
        <LinearGradient
          colors={['rgba(165, 196, 212, 0.6)', 'rgba(165, 196, 212, 0.25)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Enhanced Progress Dots */}
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

            {/* Options with staggered entrance */}
            <View style={styles.optionsContainer}>
              {NUSACH_OPTIONS.map((option, index) => (
                <GlassOption
                  key={option.value}
                  index={index}
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

            {/* Actions with animated button */}
            <View style={styles.actions}>
              {selected && (
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
                    onPress={() => onSelect(selected)}
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
    width: 250,
    height: 250,
    borderRadius: 125,
    top: height * 0.05,
    left: -80,
    overflow: 'hidden',
  },
  orb2: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    bottom: height * 0.07,
    right: -70,
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
    backgroundColor: 'rgba(212, 165, 184, 0.35)',
  },
  progressDotActive: {
    width: 32,
    backgroundColor: colors.primary.main,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  cardContainer: {
    width: width - spacing.lg * 2,
    maxWidth: 400,
  },
  // Web glass card
  glassCardWeb: {
    borderRadius: borderRadius['3xl'],
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.25,
    shadowRadius: 48,
    elevation: 24,
  },
  // Native glass card
  glassCardNative: {
    borderRadius: borderRadius['3xl'],
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
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
  emoji: {
    fontSize: 52,
    marginBottom: spacing.lg,
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
  optionsContainer: {
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  // Web option
  optionWeb: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    minHeight: 64,
  },
  optionSelectedWeb: {
    borderColor: colors.primary.main,
    shadowColor: 'rgba(212, 165, 184, 0.5)',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
  },
  // Native option
  optionNative: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    minHeight: 64,
  },
  optionSelectedNative: {
    borderColor: colors.primary.main,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    minHeight: 64,
  },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: colors.text.tertiary,
    marginRight: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary.main,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  radioInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary.main,
  },
  optionText: {
    ...textStyles.bodyLarge,
    color: colors.text.primary,
    flex: 1,
  },
  optionTextSelected: {
    ...textStyles.bodyBold,
    color: colors.primary.dark,
    fontSize: 17,
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
