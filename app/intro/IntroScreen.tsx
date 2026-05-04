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
import { DEFAULT_SCREEN_BACKGROUND } from '../../src/design/screenGradient';
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
    title: 'Custom Reminders',
    description: 'Nudge you when you need',
  },
  {
    icon: '📅',
    title: 'Zmanim Calendar',
    description: 'Zmanim, Rosh Chodesh & more',
  },
  {
    icon: '✨',
    title: 'Custom Countdowns',
    description: '40 day Nishmas, Sefirah & more',
  },
  {
    icon: '📖',
    title: 'Tehillim',
    description: '',
  },
];

interface IntroScreenProps {
  onBegin: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onBegin }) => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [showContent, setShowContent] = useState(false);

  // Logo animations - starts centered, moves up
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoPositionY = useRef(new Animated.Value(0)).current; // 0 = center, negative = up

  // Glow animation
  const glowScale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Content animations (title, subtitle, features, button)
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const featuresTranslateY = useRef(new Animated.Value(30)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;

  // Floating orbs
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;
  const orb3 = useRef(new Animated.Value(0)).current;

  // Sparkles
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;
  const sparkle4 = useRef(new Animated.Value(0)).current;

  // Feature card animations
  const featureAnimations = FEATURES.map(() => ({
    opacity: useRef(new Animated.Value(0)).current,
    translateX: useRef(new Animated.Value(-20)).current,
  }));

  useEffect(() => {
    // Start floating orbs
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

    // Main animation sequence
    Animated.sequence([
      // Phase 1: Logo appears in center with spring
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 35,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // Phase 2: Glow expands
      Animated.parallel([
        Animated.timing(glowOpacity, {
          toValue: 0.5,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(glowScale, {
          toValue: 1.3,
          tension: 25,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),

      // Phase 3: Sparkles
      Animated.stagger(90, [
        Animated.sequence([
          Animated.timing(sparkle1, { 
            toValue: 1, 
            duration: 300, 
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true 
          }),
          Animated.timing(sparkle1, { 
            toValue: 0, 
            duration: 300, 
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true 
          }),
        ]),
        Animated.sequence([
          Animated.timing(sparkle2, { 
            toValue: 1, 
            duration: 300, 
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true 
          }),
          Animated.timing(sparkle2, { 
            toValue: 0, 
            duration: 300, 
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true 
          }),
        ]),
        Animated.sequence([
          Animated.timing(sparkle3, { 
            toValue: 1, 
            duration: 300, 
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true 
          }),
          Animated.timing(sparkle3, { 
            toValue: 0, 
            duration: 300, 
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true 
          }),
        ]),
        Animated.sequence([
          Animated.timing(sparkle4, { 
            toValue: 1, 
            duration: 300, 
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true 
          }),
          Animated.timing(sparkle4, { 
            toValue: 0, 
            duration: 300, 
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true 
          }),
        ]),
      ]),

      // Phase 4: Logo drifts up smoothly while content fades in
      Animated.delay(400),
    ]).start(() => {
      setShowContent(true);
      
      // Logo moves up - liquid smooth
      Animated.parallel([
        Animated.timing(logoPositionY, {
          toValue: -height * 0.22,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 0.75,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.2,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      // Content appears - smooth cascade
      Animated.sequence([
        Animated.delay(250),
        // Title
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(titleTranslateY, {
            toValue: 0,
            tension: 45,
            friction: 9,
            useNativeDriver: true,
          }),
        ]),
        // Subtitle
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Features
        Animated.delay(250),
        Animated.parallel([
          Animated.timing(featuresOpacity, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(featuresTranslateY, {
            toValue: 0,
            tension: 40,
            friction: 9,
            useNativeDriver: true,
          }),
        ]),
        // Stagger feature cards
        Animated.stagger(
          100,
          featureAnimations.map(({ opacity, translateX }) =>
            Animated.parallel([
              Animated.timing(opacity, {
                toValue: 1,
                duration: 400,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.spring(translateX, {
                toValue: 0,
                tension: 45,
                friction: 9,
                useNativeDriver: true,
              }),
            ])
          )
        ),
        // Button
        Animated.delay(150),
        Animated.parallel([
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(buttonScale, {
            toValue: 1,
            tension: 45,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });

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
    <View style={styles.container} pointerEvents="box-none">
      <LinearGradient
        colors={[...DEFAULT_SCREEN_BACKGROUND]}
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

      {/* Logo Section - Animated position */}
      <Animated.View
        style={[
          styles.logoSection,
          {
            transform: [
              { translateY: logoPositionY },
              { scale: logoScale },
            ],
          },
        ]}
      >
        {/* Glow */}
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />

        {/* Logo */}
        <Animated.View style={{ opacity: logoOpacity }}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Sparkles */}
        <Animated.View
          style={[styles.sparkle, styles.sparkle1, { opacity: sparkle1, transform: [{ scale: sparkle1 }] }]}
        />
        <Animated.View
          style={[styles.sparkle, styles.sparkle2, { opacity: sparkle2, transform: [{ scale: sparkle2 }] }]}
        />
        <Animated.View
          style={[styles.sparkle, styles.sparkle3, { opacity: sparkle3, transform: [{ scale: sparkle3 }] }]}
        />
        <Animated.View
          style={[styles.sparkle, styles.sparkle4, { opacity: sparkle4, transform: [{ scale: sparkle4 }] }]}
        />
      </Animated.View>

      {/* Content Section */}
      {showContent && (
        <View style={styles.contentSection}>
          {/* Subtitle / Tagline */}
          <Animated.Text
            style={[
              styles.subtitle,
              {
                opacity: subtitleOpacity,
                transform: [{ translateY: titleTranslateY }],
              },
            ]}
          >
            With you, when you choose.
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
                  {
                    opacity: featureAnimations[index].opacity,
                    transform: [
                      { translateX: featureAnimations[index].translateX },
                    ],
                  },
                ]}
              >
                <BlurView intensity={40} tint="light" style={styles.featureBlur}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    {feature.description ? (
                      <Text style={styles.featureDescription}>
                        {feature.description}
                      </Text>
                    ) : null}
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
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    paddingTop: spacing.safeTopInset,
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
    top: height * 0.08,
    left: -50,
  },
  orb2: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(165, 196, 212, 0.3)',
    top: height * 0.25,
    right: -30,
  },
  orb3: {
    width: 180,
    height: 180,
    backgroundColor: 'rgba(212, 196, 232, 0.25)',
    bottom: height * 0.12,
    left: width * 0.15,
  },

  // Logo section - centered initially
  logoSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(212, 165, 184, 0.25)',
  },
  logoImage: {
    width: 140,
    height: 140,
  },
  sparkle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8D4A5',
  },
  sparkle1: {
    top: -40,
    left: -50,
  },
  sparkle2: {
    top: -25,
    right: -55,
  },
  sparkle3: {
    bottom: -35,
    left: -40,
  },
  sparkle4: {
    bottom: -50,
    right: -35,
  },

  // Content section
  contentSection: {
    position: 'absolute',
    top: height * 0.32,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  subtitle: {
    ...textStyles.bodyLarge,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  featureCard: {
    marginBottom: spacing.sm,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  featureBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  featureIcon: {
    fontSize: 26,
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
    marginTop: spacing.sm,
  },
});
