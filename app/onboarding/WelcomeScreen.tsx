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

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const heartScale = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
      Animated.spring(heartScale, { toValue: 1, tension: 50, friction: 5, useNativeDriver: true }),
      Animated.timing(buttonOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F5E6E8', '#FAF9F7', '#E8F0F5', '#FAF9F7']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={styles.orb1}>
        <LinearGradient colors={['rgba(212,165,184,0.5)', 'rgba(212,165,184,0.2)']} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.orb2}>
        <LinearGradient colors={['rgba(165,196,212,0.5)', 'rgba(165,196,212,0.2)']} style={StyleSheet.absoluteFill} />
      </View>

      <Animated.View style={[styles.cardContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <GlassCard>
          <View style={styles.cardContent}>
            <Text style={styles.title}>You're all set</Text>
            
            <Text style={styles.subtitle}>
              We'll take care of the timing —{'\n'}you just show up.
            </Text>

            <Animated.View style={[styles.heartContainer, { transform: [{ scale: heartScale }] }]}>
              <Text style={styles.heart}>💜</Text>
            </Animated.View>

            <Animated.View style={[styles.buttonContainer, { opacity: buttonOpacity }]}>
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
  },
  orb1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: height * 0.1,
    left: -70,
    overflow: 'hidden',
  },
  orb2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: height * 0.1,
    right: -60,
    overflow: 'hidden',
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
    shadowColor: 'rgba(212,165,184,0.5)',
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
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  title: {
    ...textStyles.h2,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...textStyles.bodyLarge,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 28,
  },
  heartContainer: {
    marginVertical: spacing.xl,
  },
  heart: {
    fontSize: 56,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
});
