import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTour } from '../../src/tour/TourContext';
import { useTheme } from '../../src/design/theme';
import { fonts } from '../../src/design/typography';
import { colorWithAlpha } from '../../src/design/colorAlpha';
import { borderRadius, spacing } from '../../src/design/spacing';

const CARD_MAX_WIDTH = 340;
const CARD_GAP = 16;
const SPRING = { damping: 22, stiffness: 260, mass: 0.9 };

export function ProductTourOverlay() {
  const {
    active,
    step,
    stepIndex,
    stepCount,
    targetRect,
    reduceMotion,
    next,
    skip,
  } = useTour();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const opacity = useSharedValue(0);
  const cardY = useSharedValue(18);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!active || !step) {
      opacity.value = withTiming(0, { duration: reduceMotion ? 120 : 200 });
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }
    opacity.value = withTiming(1, {
      duration: reduceMotion ? 140 : 280,
      easing: Easing.out(Easing.cubic),
    });
    cardY.value = reduceMotion ? 0 : 16;
    if (!reduceMotion) {
      cardY.value = withSpring(0, SPRING);
    }
    if (reduceMotion) {
      pulse.value = 1;
    } else {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.045, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
    }
  }, [active, step?.id, reduceMotion, opacity, cardY, pulse, step]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardY.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const hole = useMemo(() => {
    if (!targetRect) return null;
    const pad = step?.holePadding ?? 8;
    const x = Math.max(0, targetRect.x - pad);
    const y = Math.max(0, targetRect.y - pad);
    const width = Math.min(windowWidth - x, targetRect.width + pad * 2);
    const height = Math.min(windowHeight - y, targetRect.height + pad * 2);
    return {
      x,
      y,
      width,
      height,
      radius: step?.holeRadius ?? 16,
    };
  }, [targetRect, step?.holePadding, step?.holeRadius, windowWidth, windowHeight]);

  const cardLayout = useMemo(() => {
    const cardWidth = Math.min(CARD_MAX_WIDTH, windowWidth - spacing.lg * 2);
    let top = insets.top + spacing.lg;
    if (hole) {
      const below = hole.y + hole.height + CARD_GAP;
      const above = hole.y - CARD_GAP - 168;
      const spaceBelow = windowHeight - below - insets.bottom;
      if (spaceBelow >= 180) {
        top = below;
      } else if (above > insets.top + spacing.sm) {
        top = Math.max(insets.top + spacing.sm, above);
      } else {
        top = Math.max(insets.top + spacing.sm, windowHeight * 0.28);
      }
    }
    return {
      width: cardWidth,
      left: (windowWidth - cardWidth) / 2,
      top,
    };
  }, [hole, windowWidth, windowHeight, insets.top, insets.bottom]);

  if (!active || !step) return null;

  const isLast = stepIndex >= stepCount - 1;
  const scrim = colorWithAlpha(theme.colors.text.primary, theme.isDark ? 0.62 : 0.48);
  const ringColor = theme.colors.primary.main;
  const cardBg = theme.isDark
    ? colorWithAlpha(theme.colors.background.secondary, 0.94)
    : colorWithAlpha(theme.colors.background.primary, 0.96);

  return (
    <Animated.View
      style={[styles.root, overlayStyle]}
      pointerEvents="box-none"
      accessibilityViewIsModal
    >
      {/* Dimmed regions leave a clear hole around the target */}
      {hole ? (
        <>
          <View style={[styles.scrim, { top: 0, left: 0, right: 0, height: hole.y, backgroundColor: scrim }]} />
          <View
            style={[
              styles.scrim,
              {
                top: hole.y + hole.height,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: scrim,
              },
            ]}
          />
          <View
            style={[
              styles.scrim,
              {
                top: hole.y,
                left: 0,
                width: hole.x,
                height: hole.height,
                backgroundColor: scrim,
              },
            ]}
          />
          <View
            style={[
              styles.scrim,
              {
                top: hole.y,
                left: hole.x + hole.width,
                right: 0,
                height: hole.height,
                backgroundColor: scrim,
              },
            ]}
          />
          {/* Swallow taps on the hole so the tour stays in control */}
          <Pressable
            style={{
              position: 'absolute',
              top: hole.y,
              left: hole.x,
              width: hole.width,
              height: hole.height,
            }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              ringStyle,
              {
                top: hole.y - 3,
                left: hole.x - 3,
                width: hole.width + 6,
                height: hole.height + 6,
                borderRadius: hole.radius + 3,
                borderColor: ringColor,
                shadowColor: ringColor,
              },
            ]}
          />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]} />
      )}

      <Animated.View
        style={[
          styles.cardWrap,
          cardAnimStyle,
          {
            top: cardLayout.top,
            left: cardLayout.left,
            width: cardLayout.width,
          },
        ]}
        pointerEvents="box-none"
      >
        <BlurView
          intensity={theme.isDark ? 40 : 28}
          tint={theme.isDark ? 'dark' : 'light'}
          style={[
            styles.card,
            {
              backgroundColor: cardBg,
              borderColor: colorWithAlpha(theme.colors.primary.main, 0.22),
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.stepLabel, { color: theme.colors.text.tertiary }]}>
              {stepIndex + 1} of {stepCount}
            </Text>
            <Pressable
              onPress={skip}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Skip tour"
              style={({ pressed }) => [{ opacity: pressed ? 0.55 : 1 }]}
            >
              <Text style={[styles.skip, { color: theme.colors.text.secondary }]}>Skip</Text>
            </Pressable>
          </View>

          <Text style={[styles.title, { color: theme.colors.text.primary }]}>{step.title}</Text>
          <Text style={[styles.body, { color: theme.colors.text.secondary }]}>{step.body}</Text>

          <View style={styles.footer}>
            <View style={styles.dots}>
              {Array.from({ length: stepCount }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i === stepIndex
                          ? theme.colors.primary.main
                          : colorWithAlpha(theme.colors.text.secondary, 0.28),
                      width: i === stepIndex ? 16 : 6,
                    },
                  ]}
                />
              ))}
            </View>

            <Pressable
              onPress={next}
              accessibilityRole="button"
              accessibilityLabel={isLast ? 'Done' : 'Next'}
              style={({ pressed }) => [
                styles.nextBtn,
                {
                  backgroundColor: theme.colors.primary.main,
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Text style={[styles.nextText, { color: theme.colors.text.inverse }]}>
                {isLast ? 'Done' : 'Next'}
              </Text>
            </Pressable>
          </View>
        </BlurView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
  },
  scrim: {
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'transparent',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  cardWrap: {
    position: 'absolute',
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  stepLabel: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  skip: {
    fontFamily: fonts.body.semibold,
    fontSize: 15,
  },
  title: {
    fontFamily: fonts.heading.semibold,
    fontSize: 24,
    lineHeight: 30,
    marginBottom: spacing.xs,
  },
  body: {
    fontFamily: fonts.body.regular,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  nextBtn: {
    minHeight: 44,
    minWidth: 96,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    fontFamily: fonts.body.semibold,
    fontSize: 16,
  },
});
