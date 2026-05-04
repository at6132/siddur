import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DEFAULT_SCREEN_BACKGROUND_LOOP } from '../../src/design/screenGradient';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashProps {
  onAnimationComplete: () => void;
}

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({
  onAnimationComplete,
}) => {
  // Logo animations
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  
  // Glow animation
  const glowScale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  
  // Floating orbs
  const orb1Y = useRef(new Animated.Value(0)).current;
  const orb2Y = useRef(new Animated.Value(0)).current;
  const orb3X = useRef(new Animated.Value(0)).current;
  const orb1Opacity = useRef(new Animated.Value(0)).current;
  const orb2Opacity = useRef(new Animated.Value(0)).current;
  const orb3Opacity = useRef(new Animated.Value(0)).current;
  
  // Sparkles
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;
  const sparkle4 = useRef(new Animated.Value(0)).current;
  
  // Exit animation
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start the animation sequence
    Animated.sequence([
      // Phase 1: Orbs fade in and float
      Animated.parallel([
        Animated.timing(orb1Opacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(orb2Opacity, {
          toValue: 1,
          duration: 600,
          delay: 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(orb3Opacity, {
          toValue: 1,
          duration: 700,
          delay: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 2: Logo appears with spring
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
        // Subtle rotation
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 3: Glow expands
      Animated.parallel([
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(glowScale, {
          toValue: 1.5,
          tension: 25,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 4: Sparkles appear
      Animated.stagger(100, [
        Animated.sequence([
          Animated.timing(sparkle1, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle1, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(sparkle2, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle2, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(sparkle3, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle3, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(sparkle4, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle4, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]),
      
      // Hold for a moment
      Animated.delay(500),
      
      // Phase 5: Exit animation - liquid fade out
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(containerScale, {
          toValue: 1.15,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onAnimationComplete();
    });

    // Start continuous orb floating animations
    const floatOrb = (orb: Animated.Value, range: number, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(orb, {
            toValue: range,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb, {
            toValue: -range,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    floatOrb(orb1Y, 15, 2000);
    floatOrb(orb2Y, 20, 2500);
    floatOrb(orb3X, 12, 1800);
  }, []);

  const logoRotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '0deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
        },
      ]}
    >
      <LinearGradient
        colors={[...DEFAULT_SCREEN_BACKGROUND_LOOP]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Orbs */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          {
            opacity: orb1Opacity,
            transform: [{ translateY: orb1Y }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          {
            opacity: orb2Opacity,
            transform: [{ translateY: orb2Y }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orb3,
          {
            opacity: orb3Opacity,
            transform: [{ translateX: orb3X }],
          },
        ]}
      />

      {/* Center content */}
      <View style={styles.centerContent}>
        {/* Glow behind logo */}
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
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [
                { scale: logoScale },
                { rotate: logoRotateInterpolate },
              ],
            },
          ]}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Sparkles */}
        <Animated.View
          style={[
            styles.sparkle,
            styles.sparkle1,
            { opacity: sparkle1, transform: [{ scale: sparkle1 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.sparkle,
            styles.sparkle2,
            { opacity: sparkle2, transform: [{ scale: sparkle2 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.sparkle,
            styles.sparkle3,
            { opacity: sparkle3, transform: [{ scale: sparkle3 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.sparkle,
            styles.sparkle4,
            { opacity: sparkle4, transform: [{ scale: sparkle4 }] },
          ]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 220,
    height: 220,
    backgroundColor: 'rgba(212, 165, 184, 0.35)',
    top: height * 0.1,
    left: -80,
  },
  orb2: {
    width: 180,
    height: 180,
    backgroundColor: 'rgba(165, 196, 212, 0.35)',
    top: height * 0.35,
    right: -60,
  },
  orb3: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(212, 196, 232, 0.3)',
    bottom: height * 0.15,
    left: width * 0.15,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(212, 165, 184, 0.25)',
  },
  logoContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 180,
    height: 180,
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
    top: -20,
    right: -60,
  },
  sparkle3: {
    bottom: -30,
    left: -40,
  },
  sparkle4: {
    bottom: -50,
    right: -30,
  },
});
