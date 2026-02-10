import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassButton } from '../../components/ui/GlassButton';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
  onStart: () => void;
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
        colors={['rgba(255,255,255,0.65)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.5)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </BlurView>
  );
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartRotate = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.9)).current;
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered, smooth entrance animations
    Animated.sequence([
      // Card entrance
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
      ]),
      // Heart entrance with bounce and rotation
      Animated.parallel([
        Animated.spring(heartScale, { 
          toValue: 1, 
          tension: 60, 
          friction: 4, 
          useNativeDriver: true 
        }),
        Animated.spring(heartRotate, {
          toValue: 1,
          tension: 50,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
      // Button entrance
      Animated.parallel([
        Animated.timing(buttonOpacity, { 
          toValue: 1, 
          duration: 500, 
          useNativeDriver: true 
        }),
        Animated.spring(buttonScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Gentle floating orb animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
        }),
        Animated.timing(orb1Anim, {
          toValue: 0,
          duration: 6000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Anim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(orb2Anim, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const heartRotateInterpolate = heartRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '0deg'],
  });

  const orb1TranslateY = orb1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const orb2TranslateY = orb2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  return (
    <View style={styles.container}>
      {/* Enhanced gradient background */}
      <LinearGradient
        colors={['#F5E6E8', '#FAF9F7', '#E8F0F5', '#FAF9F7']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Floating orbs with animation */}
      <Animated.View style={[styles.orb1, { transform: [{ translateY: orb1TranslateY }] }]}>
        <LinearGradient 
          colors={['rgba(212,165,184,0.6)', 'rgba(212,165,184,0.2)']} 
          style={StyleSheet.absoluteFill} 
        />
      </Animated.View>
      <Animated.View style={[styles.orb2, { transform: [{ translateY: orb2TranslateY }] }]}>
        <LinearGradient 
          colors={['rgba(165,196,212,0.6)', 'rgba(165,196,212,0.2)']} 
          style={StyleSheet.absoluteFill} 
        />
      </Animated.View>

      {/* Main card with enhanced animations */}
      <Animated.View 
        style={[
          styles.cardContainer, 
          { 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }] 
          }
        ]}
      >
        <GlassCard>
          <View style={styles.cardContent}>
            <Text style={styles.title}>You're all set</Text>
            
            <Text style={styles.subtitle}>
              We'll take care of the timing —{'\n'}you just show up.
            </Text>

            {/* Animated heart with rotation */}
            <Animated.View 
              style={[
                styles.heartContainer, 
                { 
                  transform: [
                    { scale: heartScale },
                    { rotate: heartRotateInterpolate }
                  ] 
                }
              ]}
            >
              <Text style={styles.heart}>💜</Text>
            </Animated.View>

            {/* Button with entrance animation */}
            <Animated.View 
              style={[
                styles.buttonContainer, 
                { 
                  opacity: buttonOpacity,
                  transform: [{ scale: buttonScale }]
                }
              ]}
            >
              <GlassButton 
                title="Let's Begin" 
                onPress={onStart} 
                variant="primary"
                size="large" 
              />
            </Animated.View>
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
    paddingTop: spacing.safeTopInset,
  },
  orb1: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    top: height * 0.08,
    left: -80,
    overflow: 'hidden',
  },
  orb2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: height * 0.1,
    right: -70,
    overflow: 'hidden',
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
    padding: spacing['3xl'],
    alignItems: 'center',
  },
  title: {
    ...textStyles.h1,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...textStyles.bodyLarge,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: spacing.md,
  },
  heartContainer: {
    marginVertical: spacing['2xl'],
  },
  heart: {
    fontSize: 64,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});
