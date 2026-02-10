/**
 * "All done!" celebration – when you check off the last goal of the day.
 * Satisfying overlay + subtle particles so it beats Notes.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../src/design/typography';
import { colors } from '../../src/design/colors';
import { spacing } from '../../src/design/spacing';

const { width: W, height: H } = Dimensions.get('window');
const springCeleb = { damping: 14, stiffness: 120 };

interface AllDoneCelebrationProps {
  visible: boolean;
  onDismiss: () => void;
}

const PARTICLE_COUNT = 18;
const CONFETTI_COUNT = 24;

export const AllDoneCelebration: React.FC<AllDoneCelebrationProps> = ({ visible, onDismiss }) => {
  const overlayOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.3);
  const cardOpacity = useSharedValue(0);
  const textScale = useSharedValue(0.5);
  const starOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 220 });
      cardScale.value = withSequence(
        withTiming(1.15, { duration: 180, easing: Easing.out(Easing.back(1.2)) }),
        withSpring(1, springCeleb)
      );
      cardOpacity.value = withTiming(1, { duration: 180 });
      textScale.value = withSequence(
        withDelay(120, withSpring(1.12, { damping: 8, stiffness: 220 })),
        withSpring(1, springCeleb)
      );
      starOpacity.value = withDelay(200, withTiming(1, { duration: 350 }));
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      cardScale.value = withTiming(0.8, { duration: 150 });
      cardOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    pointerEvents: visible ? 'auto' : 'none',
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    transform: [{ scale: textScale.value }],
  }));

  const starStyle = useAnimatedStyle(() => ({
    opacity: starOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss}>
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
          <FloatingParticle key={`p-${i}`} index={i} visible={visible} />
        ))}
        {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
          <ConfettiBit key={`c-${i}`} index={i} visible={visible} />
        ))}

        <View style={styles.centered}>
          <Animated.View style={cardStyle}>
            <LinearGradient
              colors={['rgba(255,255,255,0.98)', 'rgba(255,248,250,0.98)']}
              style={styles.card}
            >
              <Animated.Text style={[styles.emoji, starStyle]}>✨ 🌟 ✨</Animated.Text>
              <Animated.Text style={[styles.title, textStyle]}>All done!</Animated.Text>
              <Animated.Text style={[styles.subtitle, starStyle]}>
                You crushed today's goals
              </Animated.Text>
              <Text style={styles.tapHint}>Tap anywhere to close</Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

function FloatingParticle({ index, visible }: { index: number; visible: boolean }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.4);
  const baseX = (index - PARTICLE_COUNT / 2) * 28;

  useEffect(() => {
    if (visible) {
      const delay = index * 40;
      opacity.value = withDelay(delay, withTiming(0.65, { duration: 200 }));
      scale.value = withDelay(delay, withSpring(0.85, { damping: 15, stiffness: 100 }));
      translateY.value = withDelay(delay + 150, withTiming(-180, { duration: 1000, easing: Easing.out(Easing.ease) }));
      opacity.value = withDelay(delay + 700, withTiming(0, { duration: 350 }));
    }
  }, [visible, index]);

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: W / 2 + baseX - 6,
    top: H / 2 + 20 - 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.main,
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  return <Animated.View style={style} />;
}

const CONFETTI_COLORS = [colors.primary.main, colors.primary.light, colors.accent?.gold ?? '#E8D4A5', colors.accent?.lavender ?? '#D4C4E8'];

function ConfettiBit({ index, visible }: { index: number; visible: boolean }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);
  const angle = (index / CONFETTI_COUNT) * Math.PI * 2;
  const dist = 60 + (index % 3) * 40;

  useEffect(() => {
    if (visible) {
      const delay = 80 + (index % 5) * 60;
      opacity.value = withDelay(delay, withTiming(0.9, { duration: 150 }));
      translateY.value = withDelay(delay, withTiming(-dist * 1.8, { duration: 900, easing: Easing.out(Easing.cubic) }));
      translateX.value = withDelay(delay, withTiming(Math.cos(angle) * dist * 0.6, { duration: 900, easing: Easing.out(Easing.quad) }));
      rotate.value = withDelay(delay, withTiming(index % 2 === 0 ? 360 : -360, { duration: 800 }));
      opacity.value = withDelay(delay + 600, withTiming(0, { duration: 400 }));
    }
  }, [visible, index]);

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: W / 2 - 5,
    top: H / 2 - 5,
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return <Animated.View style={style} />;
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    minWidth: 260,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 32,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.body.medium,
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  tapHint: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.tertiary,
  },
});
