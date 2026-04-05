/**
 * Moon Phase Animation – shows current lunar phase with a subtle animation.
 * Uses jewishDay (1–30) to compute phase; lunar cycle ~29.5 days.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const MOON_SIZE_DEFAULT = 36;
const MOON_SIZE_COMPACT = 24;
const LUNAR_CYCLE = 29.5;

interface MoonPhaseAnimationProps {
  jewishDay: number; // 1–30
  isDark?: boolean;
  /** Smaller moon for half-width home tiles */
  compact?: boolean;
}

export const MoonPhaseAnimation: React.FC<MoonPhaseAnimationProps> = ({
  jewishDay,
  isDark = false,
  compact = false,
}) => {
  const MOON_SIZE = compact ? MOON_SIZE_COMPACT : MOON_SIZE_DEFAULT;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  // Phase 0 = new moon, 0.5 = full, 1 = new
  const phase = ((jewishDay - 1) % 30) / LUNAR_CYCLE;
  // Shadow sweeps left to right: new (0) centered, full (0.5) to side, new (1) centered
  const shadowTranslateX = Math.sin(phase * Math.PI) * MOON_SIZE * 1.8;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    glow.start();
    return () => {
      pulse.stop();
      glow.stop();
    };
  }, [pulseAnim, glowAnim]);

  const moonColor = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(255,248,220,0.95)';
  const shadowColor = isDark ? 'rgba(20,18,30,0.95)' : 'rgba(230,228,235,0.98)';

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <Animated.View
        style={[
          styles.moonWrapper,
          {
            width: MOON_SIZE + 12,
            height: MOON_SIZE + 12,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {/* Glow ring behind moon */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              width: MOON_SIZE + 8,
              height: MOON_SIZE + 8,
              borderRadius: (MOON_SIZE + 8) / 2,
              borderColor: moonColor,
              opacity: glowAnim,
            },
          ]}
        />
        <View
          style={[
            styles.moonCircle,
            {
              width: MOON_SIZE,
              height: MOON_SIZE,
              borderRadius: MOON_SIZE / 2,
              backgroundColor: moonColor,
              overflow: 'hidden',
            },
          ]}
        >
          {/* Shadow overlay – simulates unlit portion */}
          <Animated.View
            style={[
              styles.shadowOverlay,
              {
                width: MOON_SIZE * 1.1,
                height: MOON_SIZE * 1.1,
                borderRadius: MOON_SIZE / 2,
                backgroundColor: shadowColor,
                left: MOON_SIZE / 2 - MOON_SIZE * 0.55 + shadowTranslateX,
                top: -MOON_SIZE * 0.05,
              },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  containerCompact: {
    marginBottom: 2,
  },
  moonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonCircle: {
    position: 'relative',
  },
  shadowOverlay: {
    position: 'absolute',
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 1,
    left: 2,
    top: 2,
  },
});
