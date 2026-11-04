import React, { useEffect, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassButton } from '../../components/ui/GlassButton';
import { useTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Feature {
  icon: IconName;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: 'flame-outline',
    title: 'Custom Reminders',
    description: 'Nudge you when you need',
  },
  {
    icon: 'calendar-outline',
    title: 'Zmanim Calendar',
    description: 'Zmanim, Rosh Chodesh & more',
  },
  {
    icon: 'hourglass-outline',
    title: 'Custom Countdowns',
    description: '40 day Nishmas, Sefirah & more',
  },
  {
    icon: 'book-outline',
    title: 'Tehillim',
    description: '',
  },
];

const SPRING = { damping: 16, stiffness: 140, mass: 1 } as const;
const SOFT_SPRING = { damping: 20, stiffness: 90, mass: 1 } as const;

/** Timeline (ms) for the logo reveal before the content cascades in. */
const GLOW_AT = 700;
const SPARKLE_AT = 1200;
const SPARKLE_STAGGER = 90;
const CONTENT_AT = 2450;

interface RevealProps {
  delay?: number;
  fromY?: number;
  fromX?: number;
  fromScale?: number;
  reduceMotion: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Fades + springs a child into place on mount (UI thread). */
const Reveal: React.FC<RevealProps> = ({
  delay = 0,
  fromY = 0,
  fromX = 0,
  fromScale = 1,
  reduceMotion,
  style,
  children,
}) => {
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(delay, withSpring(1, SPRING));
  }, [delay, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, progress.value)),
    transform: [
      { translateY: (1 - progress.value) * fromY },
      { translateX: (1 - progress.value) * fromX },
      { scale: fromScale + (1 - fromScale) * progress.value },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

interface OrbProps {
  size: number;
  color: string;
  axis: 'x' | 'y';
  distance: number;
  duration: number;
  reduceMotion: boolean;
  style: StyleProp<ViewStyle>;
}

/** Slow ambient drift. Ambient loops use gentle timing; interactive motion uses springs. */
const Orb: React.FC<OrbProps> = ({
  size,
  color,
  axis,
  distance,
  duration,
  reduceMotion,
  style,
}) => {
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [drift, duration, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform:
      axis === 'y'
        ? [{ translateY: drift.value * distance }]
        : [{ translateX: drift.value * distance }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        { width: size, height: size, backgroundColor: color },
        style,
        animatedStyle,
      ]}
    />
  );
};

interface SparkleProps {
  index: number;
  color: string;
  reduceMotion: boolean;
  style: StyleProp<ViewStyle>;
}

const Sparkle: React.FC<SparkleProps> = ({ index, color, reduceMotion, style }) => {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withDelay(
      SPARKLE_AT + index * SPARKLE_STAGGER,
      withSequence(
        withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) }),
      ),
    );
  }, [index, pulse, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.sparkle, { backgroundColor: color }, style, animatedStyle]}
    />
  );
};

interface IntroScreenProps {
  onBegin: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onBegin }) => {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const isCompact = height < 720;

  const [showContent, setShowContent] = useState(false);

  const logoIntroScale = useSharedValue(reduceMotion ? 1 : 0.3);
  const logoRestFactor = useSharedValue(1);
  const logoOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const logoLiftY = useSharedValue(0);
  const glowScale = useSharedValue(reduceMotion ? 0.7 : 0.5);
  const glowOpacity = useSharedValue(reduceMotion ? 0.2 : 0);

  const logoLift = -(height * (isCompact ? 0.18 : 0.22));
  const logoRestScale = isCompact ? 0.65 : 0.75;

  useEffect(() => {
    if (reduceMotion) {
      logoLiftY.value = logoLift;
      logoRestFactor.value = logoRestScale;
      setShowContent(true);
      return;
    }

    // Phase 1: logo appears centered
    logoIntroScale.value = withSpring(1, SPRING);
    logoOpacity.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });

    // Phase 2: glow expands, then settles as the logo drifts up
    glowOpacity.value = withSequence(
      withDelay(
        GLOW_AT,
        withTiming(0.5, { duration: 500, easing: Easing.out(Easing.cubic) }),
      ),
      withDelay(
        CONTENT_AT - GLOW_AT - 500,
        withTiming(0.2, { duration: 600, easing: Easing.out(Easing.cubic) }),
      ),
    );
    glowScale.value = withSequence(
      withDelay(GLOW_AT, withSpring(1.3, SOFT_SPRING)),
      withDelay(
        Math.max(0, CONTENT_AT - GLOW_AT - 900),
        withSpring(0.7, SOFT_SPRING),
      ),
    );

    // Phase 3: logo drifts up while content cascades in
    logoLiftY.value = withDelay(CONTENT_AT, withSpring(logoLift, SOFT_SPRING));
    logoRestFactor.value = withDelay(
      CONTENT_AT,
      withSpring(logoRestScale, SOFT_SPRING),
    );

    const timer = setTimeout(() => setShowContent(true), CONTENT_AT);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoSectionStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: logoLiftY.value },
      { scale: logoIntroScale.value * logoRestFactor.value },
    ],
  }));
  const logoFadeStyle = useAnimatedStyle(() => ({ opacity: logoOpacity.value }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const contentTop = height * (isCompact ? 0.26 : 0.32);
  const bottomPad = Math.max(insets.bottom, spacing.md) + spacing.sm;
  const rowPadV = isCompact ? spacing.sm : spacing.md;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...theme.backgroundGradient]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Orb
        size={200}
        color={colorWithAlpha(theme.colors.primary.main, 0.3)}
        axis="y"
        distance={-30}
        duration={4000}
        reduceMotion={reduceMotion}
        style={{ top: height * 0.08, left: -50 }}
      />
      <Orb
        size={150}
        color={colorWithAlpha(theme.colors.secondary.main, 0.3)}
        axis="y"
        distance={25}
        duration={5000}
        reduceMotion={reduceMotion}
        style={{ top: height * 0.25, right: -30 }}
      />
      <Orb
        size={180}
        color={colorWithAlpha(theme.colors.accent.lavender, 0.25)}
        axis="x"
        distance={20}
        duration={6000}
        reduceMotion={reduceMotion}
        style={{ bottom: height * 0.12, left: width * 0.15 }}
      />

      <Animated.View pointerEvents="none" style={[styles.logoSection, logoSectionStyle]}>
        <Animated.View
          style={[
            styles.glow,
            { backgroundColor: colorWithAlpha(theme.colors.primary.main, 0.25) },
            glowStyle,
          ]}
        />
        <Animated.View style={logoFadeStyle}>
          <Image
            source={require('../../assets/logo.png')}
            style={[styles.logoImage, isCompact && styles.logoImageCompact]}
            resizeMode="contain"
            accessibilityLabel="Twenty4Seven logo"
          />
        </Animated.View>

        <Sparkle index={0} color={theme.colors.accent.gold} reduceMotion={reduceMotion} style={styles.sparkle1} />
        <Sparkle index={1} color={theme.colors.accent.gold} reduceMotion={reduceMotion} style={styles.sparkle2} />
        <Sparkle index={2} color={theme.colors.accent.gold} reduceMotion={reduceMotion} style={styles.sparkle3} />
        <Sparkle index={3} color={theme.colors.accent.gold} reduceMotion={reduceMotion} style={styles.sparkle4} />
      </Animated.View>

      {/* Scrollable body + pinned CTA so nothing clips on short or iPad heights */}
      {showContent && (
        <View
          style={[
            styles.contentSection,
            {
              top: contentTop,
              paddingBottom: bottomPad,
              paddingTop: insets.top > 0 ? 0 : spacing.sm,
              paddingHorizontal: spacing.gutter,
            },
          ]}
        >
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={[styles.contentScrollInner, { paddingBottom: spacing.sm }]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            <Reveal delay={0} fromY={20} reduceMotion={reduceMotion}>
              <Text
                style={[
                  type.textStyles.bodyLarge,
                  {
                    color: theme.colors.text.secondary,
                    fontStyle: 'italic',
                    textAlign: 'center',
                    marginBottom: isCompact ? spacing.md : spacing.lg,
                  },
                ]}
              >
                With you, when you choose.
              </Text>
            </Reveal>

            <View style={styles.featuresContainer}>
              {FEATURES.map((feature, index) => (
                <Reveal
                  key={feature.title}
                  delay={250 + index * 100}
                  fromX={-20}
                  reduceMotion={reduceMotion}
                >
                  <View
                    style={[
                      styles.featureRow,
                      {
                        paddingVertical: rowPadV,
                        borderBottomColor: theme.colors.neutral[300],
                        borderBottomWidth:
                          index < FEATURES.length - 1 ? StyleSheet.hairlineWidth : 0,
                      },
                    ]}
                  >
                    <Ionicons
                      name={feature.icon}
                      size={isCompact ? 22 : 24}
                      color={theme.colors.primary.dark}
                      style={{ marginRight: spacing.md, width: 28, textAlign: 'center' }}
                      accessible={false}
                    />
                    <View style={styles.featureText}>
                      <Text style={[type.textStyles.bodyBold, { color: theme.colors.text.primary }]}>
                        {feature.title}
                      </Text>
                      {feature.description ? (
                        <Text
                          style={[
                            type.textStyles.caption,
                            { color: theme.colors.text.secondary, marginTop: spacing['2xs'] },
                          ]}
                        >
                          {feature.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Reveal>
              ))}
            </View>
          </ScrollView>

          <Reveal
            delay={250 + FEATURES.length * 100 + 150}
            fromScale={0.9}
            reduceMotion={reduceMotion}
            style={[styles.buttonContainer, { marginTop: spacing.sm }]}
          >
            <GlassButton
              title="Begin Your Journey"
              onPress={onBegin}
              variant="primary"
              size="lg"
            />
          </Reveal>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
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
  },
  logoImage: {
    width: 140,
    height: 140,
  },
  logoImageCompact: {
    width: 112,
    height: 112,
  },
  sparkle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sparkle1: { top: -40, left: -50 },
  sparkle2: { top: -25, right: -55 },
  sparkle3: { bottom: -35, left: -40 },
  sparkle4: { bottom: -50, right: -35 },
  contentSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  contentScroll: {
    flex: 1,
    width: '100%',
  },
  contentScrollInner: {
    flexGrow: 1,
    alignItems: 'center',
  },
  featuresContainer: {
    width: '100%',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  featureText: {
    flex: 1,
  },
  buttonContainer: {
    alignItems: 'center',
    width: '100%',
    flexShrink: 0,
  },
});
