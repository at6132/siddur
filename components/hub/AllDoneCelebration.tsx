/**
 * "All done" celebration — when the last goal of the day is checked off.
 * Centered glass moment: soft bloom, checkmark spring, calm copy.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  Easing,
  useReducedMotion,
  interpolate,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';

interface AllDoneCelebrationProps {
  visible: boolean;
  onDismiss: () => void;
}

const ORB_COUNT = 8;
const springEnter = { damping: 18, stiffness: 160 };
const springSettle = { damping: 16, stiffness: 120 };

export const AllDoneCelebration: React.FC<AllDoneCelebrationProps> = ({
  visible,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const { colors, tokens } = theme;
  const { spacing, type, radii, shadows } = tokens;
  const reduceMotion = useReducedMotion();
  const { width: W, height: H } = useWindowDimensions();

  const overlayOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentScale = useSharedValue(0.92);
  const contentY = useSharedValue(12);
  const checkScale = useSharedValue(0);
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(8);

  useEffect(() => {
    if (!visible) {
      overlayOpacity.value = withTiming(0, { duration: 180 });
      contentOpacity.value = withTiming(0, { duration: 160 });
      contentScale.value = withTiming(0.96, { duration: 160 });
      return;
    }

    if (reduceMotion) {
      overlayOpacity.value = 1;
      contentOpacity.value = 1;
      contentScale.value = 1;
      contentY.value = 0;
      checkScale.value = 1;
      ringScale.value = 1;
      ringOpacity.value = 0.5;
      titleOpacity.value = 1;
      titleY.value = 0;
      return;
    }

    overlayOpacity.value = withTiming(1, { duration: 280 });
    contentOpacity.value = withTiming(1, { duration: 260 });
    contentScale.value = withSpring(1, springEnter);
    contentY.value = withSpring(0, springEnter);
    checkScale.value = withDelay(
      80,
      withSequence(
        withSpring(1.08, { damping: 12, stiffness: 220 }),
        withSpring(1, springSettle)
      )
    );
    ringOpacity.value = withDelay(60, withTiming(0.55, { duration: 320 }));
    ringScale.value = withDelay(
      60,
      withSequence(
        withTiming(1.15, { duration: 520, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 420, easing: Easing.inOut(Easing.quad) })
      )
    );
    titleOpacity.value = withDelay(140, withTiming(1, { duration: 280 }));
    titleY.value = withDelay(140, withSpring(0, springSettle));
  }, [visible, reduceMotion]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [
      { scale: contentScale.value },
      { translateY: contentY.value },
    ],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const markSize = spacing['2xl'] + spacing.sm;
  const ringSize = spacing['3xl'] + spacing.md;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Animated.View style={[styles.root, overlayStyle]}>
        <Pressable
          style={styles.pressable}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss celebration"
        >
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colorWithAlpha(colors.neutral[900], 0.28) },
            ]}
          />

          {!reduceMotion
            ? Array.from({ length: ORB_COUNT }).map((_, i) => (
                <SoftOrb
                  key={`orb-${i}`}
                  index={i}
                  visible={visible}
                  screenW={W}
                  screenH={H}
                  color={
                    i % 3 === 0
                      ? colors.primary.main
                      : i % 3 === 1
                        ? colors.accent.lavender
                        : colors.accent.gold
                  }
                />
              ))
            : null}

          <Animated.View style={[styles.centerStage, contentStyle]} pointerEvents="none">
            <View
              style={[
                styles.cardShell,
                shadows.lg,
                {
                  borderRadius: radii.xl,
                  borderColor: colorWithAlpha(colors.primary.main, 0.22),
                },
              ]}
            >
              <BlurView
                intensity={tokens.glass.intensity.button + 28}
                tint={theme.isDark ? 'dark' : 'light'}
                style={[styles.blur, { borderRadius: radii.xl }]}
              >
                <View
                  style={[
                    styles.cardInner,
                    {
                      backgroundColor: colorWithAlpha(colors.background.primary, 0.72),
                      paddingVertical: spacing.xl,
                      paddingHorizontal: spacing.xl + spacing.sm,
                      borderRadius: radii.xl,
                    },
                  ]}
                >
                  <View style={[styles.markWrap, { width: ringSize, height: ringSize }]}>
                    <Animated.View
                      style={[
                        styles.ring,
                        ringStyle,
                        {
                          borderColor: colorWithAlpha(colors.primary.main, 0.35),
                          width: ringSize,
                          height: ringSize,
                          borderRadius: ringSize / 2,
                        },
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.checkCircle,
                        checkStyle,
                        {
                          backgroundColor: colorWithAlpha(colors.primary.main, 0.18),
                          width: markSize,
                          height: markSize,
                          borderRadius: markSize / 2,
                        },
                      ]}
                    >
                      <Ionicons
                        name="checkmark"
                        size={28}
                        color={colors.primary.dark}
                      />
                    </Animated.View>
                  </View>

                  <Animated.View style={[styles.copy, titleStyle]}>
                    <Text
                      style={[
                        type.textStyles.h2,
                        {
                          color: colors.text.primary,
                          textAlign: 'center',
                          marginBottom: spacing.xs,
                        },
                      ]}
                    >
                      All done
                    </Text>
                    <Text
                      style={[
                        type.textStyles.body,
                        {
                          color: colors.text.secondary,
                          textAlign: 'center',
                          marginBottom: spacing.md,
                        },
                      ]}
                    >
                      Today's goals are complete
                    </Text>
                    <Text
                      style={[
                        type.textStyles.caption,
                        { color: colors.text.tertiary, textAlign: 'center' },
                      ]}
                    >
                      Tap to continue
                    </Text>
                  </Animated.View>
                </View>
              </BlurView>
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
};

function SoftOrb({
  index,
  visible,
  screenW,
  screenH,
  color,
}: {
  index: number;
  visible: boolean;
  screenW: number;
  screenH: number;
  color: string;
}) {
  const progress = useSharedValue(0);
  const angle = (index / ORB_COUNT) * Math.PI * 2 + 0.35;
  const dist = 72 + (index % 3) * 28;
  const size = 8 + (index % 3) * 4;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  useEffect(() => {
    if (!visible) {
      progress.value = 0;
      return;
    }
    const delay = 40 + index * 55;
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })
    );
  }, [visible, index, progress]);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const reach = interpolate(t, [0, 1], [0, dist]);
    const opacity = interpolate(t, [0, 0.15, 0.7, 1], [0, 0.55, 0.35, 0]);
    const scale = interpolate(t, [0, 0.2, 1], [0.4, 1, 0.7]);
    return {
      position: 'absolute' as const,
      left: screenW / 2 - size / 2,
      top: screenH / 2 - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      opacity,
      transform: [
        { translateX: dx * reach },
        { translateY: dy * reach - 8 },
        { scale },
      ],
    };
  });

  return <Animated.View style={style} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  pressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerStage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  cardShell: {
    width: '100%',
    maxWidth: 300,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  blur: {
    overflow: 'hidden',
  },
  cardInner: {
    alignItems: 'center',
  },
  markWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ring: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  checkCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    alignItems: 'center',
    width: '100%',
  },
});
