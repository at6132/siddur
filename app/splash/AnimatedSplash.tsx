import React, { useEffect, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../src/design/theme/context';
import { colorWithAlpha } from '../../src/design/colorAlpha';
interface AnimatedSplashProps {
  onAnimationComplete: () => void;
}

const GLOW_RATIO = 1.5;

const LOGO_SPRING = { damping: 16, stiffness: 140, mass: 0.9 } as const;
const GLOW_SPRING = { damping: 20, stiffness: 70, mass: 1 } as const;

const ENTER_FADE_MS = 450;
const HOLD_MS = 900;
const EXIT_FADE_MS = 350;
const REDUCED_HOLD_MS = 600;

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({
  onAnimationComplete,
}) => {
  const { theme } = useTheme();
  const { colors, tokens } = theme;
  const logoSize = tokens.spacing['4xl'] * 2;
  const glowSize = logoSize * GLOW_RATIO;
  const reduceMotion = useReducedMotion();

  const logoScale = useSharedValue(reduceMotion ? 1 : 0.88);
  const logoOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const glowScale = useSharedValue(reduceMotion ? 1 : 0.7);
  const glowOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const containerOpacity = useSharedValue(1);
  const containerScale = useSharedValue(1);

  useEffect(() => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onAnimationComplete();
    };

    const exitFade = Easing.out(Easing.cubic);

    if (reduceMotion) {
      containerOpacity.value = withDelay(
        REDUCED_HOLD_MS,
        withTiming(0, { duration: EXIT_FADE_MS, easing: exitFade }, (done) => {
          if (done) runOnJS(finish)();
        }),
      );
      return;
    }

    glowOpacity.value = withTiming(1, {
      duration: ENTER_FADE_MS,
      easing: Easing.out(Easing.cubic),
    });
    glowScale.value = withSpring(1, GLOW_SPRING);

    logoOpacity.value = withTiming(1, {
      duration: ENTER_FADE_MS,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withSpring(1, LOGO_SPRING);

    // Hold, then fade the whole screen out. The scale nudge is part of the exit.
    containerScale.value = withDelay(
      ENTER_FADE_MS + HOLD_MS,
      withTiming(1.03, { duration: EXIT_FADE_MS, easing: exitFade }),
    );
    containerOpacity.value = withDelay(
      ENTER_FADE_MS + HOLD_MS,
      withTiming(0, { duration: EXIT_FADE_MS, easing: exitFade }, (done) => {
        if (done) runOnJS(finish)();
      }),
    );
    // Runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const glowColor = useMemo(
    () => colorWithAlpha(colors.primary.main, theme.isDark ? 0.22 : 0.28),
    [colors.primary.main, theme.isDark],
  );

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.background.primary },
        containerStyle,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <LinearGradient
        colors={theme.backgroundGradientLoop}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.centerContent}>
        <Animated.View
          style={[
            styles.glow,
            {
              width: glowSize,
              height: glowSize,
              borderRadius: glowSize / 2,
              backgroundColor: glowColor,
            },
            glowStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.logoContainer,
            { width: logoSize, height: logoSize },
            logoStyle,
          ]}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: logoSize, height: logoSize }}
            accessible={false}
            resizeMode="contain"
          />
        </Animated.View>
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
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
