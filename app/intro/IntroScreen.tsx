import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassButton } from '../../components/ui/GlassButton';
import { colors } from '../../src/design/colors';
import { spacing } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';

const { width, height } = Dimensions.get('window');

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: '🕯️',
    title: 'Gentle Reminders',
    description: 'Notifications that guide, never guilt',
  },
  {
    icon: '📅',
    title: 'Jewish Calendar',
    description: 'Zmanim, holidays & spiritual moments',
  },
  {
    icon: '✨',
    title: 'Sefiras HaOmer',
    description: 'Beautiful countdown with meaning',
  },
  {
    icon: '📖',
    title: 'Tehillim',
    description: 'Psalms for every moment',
  },
];

interface IntroScreenProps {
  onBegin: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onBegin }) => {
  const [currentFeature, setCurrentFeature] = useState(0);
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const featuresTranslateY = useRef(new Animated.Value(50)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;
  
  // Floating orbs animations
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;
  const orb3 = useRef(new Animated.Value(0)).current;

  // Feature card animations
  const featureAnimations = FEATURES.map(() => ({
    opacity: useRef(new Animated.Value(0)).current,
    translateX: useRef(new Animated.Value(-30)).current,
  }));

  useEffect(() => {
    // Start floating orbs animation
    const createOrbAnimation = (orb: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(orb, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
    };

    createOrbAnimation(orb1, 4000).start();
    createOrbAnimation(orb2, 5000).start();
    createOrbAnimation(orb3, 6000).start();

    // Main entrance animation sequence
    Animated.sequence([
      // Logo appears with spring
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      
      // Title slides up
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      
      // Subtitle fades in
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      
      // Features section
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(featuresOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(featuresTranslateY, {
          toValue: 0,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      
      // Stagger feature cards
      Animated.stagger(
        150,
        featureAnimations.map(({ opacity, translateX }) =>
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.spring(translateX, {
              toValue: 0,
              tension: 50,
              friction: 8,
              useNativeDriver: true,
            }),
          ])
        )
      ),
      
      // Button appears
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScale, {
          toValue: 1,
          tension: 50,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Cycle through feature highlights
    const featureInterval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % FEATURES.length);
    }, 3000);

    return () => clearInterval(featureInterval);
  }, []);

  const orb1TranslateY = orb1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });

  const orb2TranslateY = orb2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 25],
  });

  const orb3TranslateX = orb3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating orbs */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          { transform: [{ translateY: orb1TranslateY }] },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          { transform: [{ translateY: orb2TranslateY }] },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orb3,
          { transform: [{ translateX: orb3TranslateX }] },
        ]}
      />

      {/* Main content */}
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Title */}
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          Siddur
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          style={[styles.subtitle, { opacity: subtitleOpacity }]}
        >
          Your spiritual companion
        </Animated.Text>

        {/* Features */}
        <Animated.View
          style={[
            styles.featuresContainer,
            {
              opacity: featuresOpacity,
              transform: [{ translateY: featuresTranslateY }],
            },
          ]}
        >
          {FEATURES.map((feature, index) => (
            <Animated.View
              key={feature.title}
              style={[
                styles.featureCard,
                currentFeature === index && styles.featureCardActive,
                {
                  opacity: featureAnimations[index].opacity,
                  transform: [
                    { translateX: featureAnimations[index].translateX },
                  ],
                },
              ]}
            >
              <BlurView intensity={80} style={styles.featureBlur}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>
                    {feature.description}
                  </Text>
                </View>
              </BlurView>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Begin button */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: buttonOpacity,
              transform: [{ scale: buttonScale }],
            },
          ]}
        >
          <GlassButton
            title="Begin Your Journey"
            onPress={onBegin}
            variant="primary"
            size="large"
          />
          <Text style={styles.footerText}>
            Designed for the modern Jewish woman
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(212, 165, 184, 0.3)',
    top: height * 0.1,
    left: -50,
  },
  orb2: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(165, 196, 212, 0.3)',
    top: height * 0.3,
    right: -30,
  },
  orb3: {
    width: 180,
    height: 180,
    backgroundColor: 'rgba(212, 196, 232, 0.25)',
    bottom: height * 0.15,
    left: width * 0.2,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoContainer: {
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 140,
    height: 140,
  },
  title: {
    ...textStyles.h1,
    fontSize: 42,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: 2,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  featureCard: {
    marginBottom: spacing.sm,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  featureCardActive: {
    borderColor: colors.primary.main,
    borderWidth: 2,
  },
  featureBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  featureIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    ...textStyles.bodyBold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  featureDescription: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  buttonContainer: {
    alignItems: 'center',
    width: '100%',
  },
  footerText: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
});
