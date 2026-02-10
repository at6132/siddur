/**
 * Mizrach Compass - Points toward East (Mizrach) for davening
 * variant="apple" = large Apple Compass–style dial for modal
 * variant="compact" = small arrow (legacy)
 *
 * Uses expo-location watchHeadingAsync (system compass) when available,
 * with fallback to Magnetometer + Accelerometer for tilt-compensated heading.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Line, G, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import Magnetometer from 'expo-sensors/build/Magnetometer';
import Accelerometer from 'expo-sensors/build/Accelerometer';
import { useTheme } from '../../src/design/theme';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';

const COMPACT_SIZE = 100;
const APPLE_SIZE = 280;
const ARROW_SIZE = 24;

/**
 * Tilt-compensated heading: use gravity (accelerometer) to project the magnetic
 * field onto the horizontal plane, so the compass only responds to rotation
 * (yaw), not to tilting the phone up/down.
 * Returns heading in degrees: 0 = North, 90 = East.
 */
function getTiltCompensatedHeading(
  mx: number,
  my: number,
  mz: number,
  ax: number,
  ay: number,
  az: number
): number {
  // Roll and pitch from gravity (device tilt)
  const roll = Math.atan2(ay, az);
  const pitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az));

  // Project magnetic vector onto horizontal plane (world frame)
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const cosRoll = Math.cos(roll);
  const sinRoll = Math.sin(roll);

  const xh =
    mx * cosPitch +
    my * sinRoll * sinPitch -
    mz * cosRoll * sinPitch;
  const yh = my * cosRoll + mz * sinRoll;

  // Magnitude too small = unreliable (e.g. near poles or heavy tilt)
  const norm = Math.sqrt(xh * xh + yh * yh);
  if (norm < 0.01) return 0;

  // Heading: 0 = North, 90 = East (same convention as before)
  let headingRad = Math.atan2(yh, xh);
  let deg = (headingRad * 180) / Math.PI;
  deg = (90 - deg + 360) % 360;
  return deg;
}

/** Angle from current heading to East (Mizrach) - for arrow rotation */
function getMizrachRotation(heading: number): number {
  return (90 - heading + 360) % 360;
}

// ---- Apple-style compass (large modal) ----
const APPLE_R = APPLE_SIZE / 2;
const TICK_R = APPLE_R - 20;
const CARDINAL_R = APPLE_R - 44;

function AppleCompassFace({
  heading,
  onClose,
  theme,
}: {
  heading: number;
  onClose?: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const rotation = useSharedValue(-heading);
  useEffect(() => {
    rotation.value = withSpring(-heading, { damping: 20, stiffness: 90 });
  }, [heading]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const cardinals = [
    { label: 'N', deg: 0, red: true },
    { label: 'E', deg: 90, red: false, mizrach: true },
    { label: 'S', deg: 180, red: false },
    { label: 'W', deg: 270, red: false },
  ];

  return (
    <View style={appleStyles.container}>
      <LinearGradient
        colors={
          theme.isDark
            ? ['#2C2A34', '#1E1C26', '#252330']
            : ['#E8E8ED', '#F5F5F8', '#D8D8E0']
        }
        style={appleStyles.gradient}
      />
      {/* Outer ring */}
      <View style={[appleStyles.ring, theme.isDark ? appleStyles.ringDark : undefined]}>
        <View style={appleStyles.faceWrapper}>
          <Animated.View style={[appleStyles.face, rotateStyle]}>
            <Svg width={APPLE_SIZE} height={APPLE_SIZE} style={appleStyles.svg}>
              {/* Degree ticks every 30° */}
              {Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const isCardinal = deg % 90 === 0;
                const r = isCardinal ? TICK_R - 8 : TICK_R;
                const x1 = APPLE_R + (r - 12) * Math.sin(rad);
                const y1 = APPLE_R - (r - 12) * Math.cos(rad);
                const x2 = APPLE_R + r * Math.sin(rad);
                const y2 = APPLE_R - r * Math.cos(rad);
                return (
                  <Line
                    key={deg}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={theme.isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)'}
                    strokeWidth={isCardinal ? 2.5 : 1.5}
                  />
                );
              })}
              {/* Cardinal labels */}
              {cardinals.map(({ label, deg, red, mizrach }) => {
                const rad = (deg * Math.PI) / 180;
                const x = APPLE_R + CARDINAL_R * Math.sin(rad);
                const y = APPLE_R - CARDINAL_R * Math.cos(rad);
                return (
                  <G key={label} transform={`translate(${x}, ${y})`}>
                    <SvgText
                      fill={red ? '#E53935' : theme.colors.text.primary}
                      fontSize={mizrach ? 14 : 20}
                      fontWeight={red ? 'bold' : '600'}
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {label}
                    </SvgText>
                    {mizrach && (
                      <SvgText
                        y={16}
                        fill={theme.colors.primary.main}
                        fontSize={11}
                        textAnchor="middle"
                        alignmentBaseline="middle"
                      >
                        מזרח
                      </SvgText>
                    )}
                  </G>
                );
              })}
            </Svg>
          </Animated.View>
        </View>
      </View>
      {/* Fixed "you are here" indicator at top - small triangle or dot */}
      <View style={appleStyles.headingIndicator} pointerEvents="none">
        <View style={[appleStyles.headingTriangle, theme.isDark && appleStyles.headingTriangleDark]} />
      </View>
      {/* Degree readout */}
      <View style={appleStyles.readout}>
        <Text style={[appleStyles.readoutDeg, { color: theme.colors.text.primary }]}>
          {Math.round(heading)}°
        </Text>
        <Text style={[appleStyles.readoutLabel, { color: theme.colors.text.secondary }]}>
          Face east (מזרח) to daven
        </Text>
      </View>
      {onClose && (
        <TouchableOpacity style={appleStyles.closeButton} onPress={onClose} activeOpacity={0.8}>
          <Text style={[appleStyles.closeButtonText, { color: theme.colors.primary.main }]}>
            Done
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const appleStyles = StyleSheet.create({
  container: {
    width: APPLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    position: 'absolute',
    width: APPLE_SIZE + 24,
    height: APPLE_SIZE + 24,
    borderRadius: (APPLE_SIZE + 24) / 2,
    top: -12,
    left: -12,
  },
  ring: {
    width: APPLE_SIZE,
    height: APPLE_SIZE,
    borderRadius: APPLE_R,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ringDark: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  faceWrapper: {
    width: APPLE_SIZE,
    height: APPLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    width: APPLE_SIZE,
    height: APPLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  headingIndicator: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headingTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#E53935',
  },
  headingTriangleDark: {
    borderBottomColor: '#EF5350',
  },
  readout: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  readoutDeg: {
    fontFamily: fonts.heading.bold,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  readoutLabel: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    marginTop: 4,
  },
  closeButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(212, 165, 184, 0.25)',
  },
  closeButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
  },
});

// ---- Compact (small arrow) ----
export const MizrachCompass: React.FC<{
  variant?: 'compact' | 'apple';
  onClose?: () => void;
}> = ({ variant = 'compact', onClose }) => {
  const { theme } = useTheme();
  const [available, setAvailable] = useState(false);
  const [heading, setHeading] = useState(0);
  const arrowRotation = useSharedValue(0);
  const entranceScale = useSharedValue(0.85);
  const entranceOpacity = useSharedValue(0);

  useEffect(() => {
    if (available && variant === 'compact') {
      entranceScale.value = withSpring(1, { damping: 12, stiffness: 100 });
      entranceOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    }
  }, [available, variant]);

  // Refs to hold latest sensor values for tilt-compensated heading
  const magRef = useRef({ x: 0, y: 0, z: 0 });
  const accelRef = useRef({ x: 0, y: 0, z: 0 });

  const applyHeading = useCallback((degrees: number) => {
    const h = (degrees + 360) % 360;
    setHeading(h);
    const rot = getMizrachRotation(h);
    arrowRotation.value = withSpring(rot, {
      damping: 15,
      stiffness: 100,
      mass: 0.5,
    });
  }, []);

  const updateHeadingFromSensors = useCallback(() => {
    const { x: mx, y: my, z: mz } = magRef.current;
    const { x: ax, y: ay, z: az } = accelRef.current;
    const h = getTiltCompensatedHeading(mx, my, mz, ax, ay, az);
    applyHeading(h);
  }, [applyHeading]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (variant === 'apple') setAvailable(true);
      return;
    }

    let mounted = true;
    let locationSub: { remove: () => void } | null = null;
    let subMag: { remove: () => void } | null = null;
    let subAccel: { remove: () => void } | null = null;

    const startMagnetometerFallback = () => {
      Magnetometer.setUpdateInterval(80);
      Accelerometer.setUpdateInterval(80);
      subMag = Magnetometer.addListener(({ x, y, z }) => {
        if (!mounted) return;
        magRef.current = { x, y, z };
        updateHeadingFromSensors();
      });
      subAccel = Accelerometer.addListener(({ x, y, z }) => {
        if (!mounted) return;
        accelRef.current = { x, y, z };
        updateHeadingFromSensors();
      });
    };

    (async () => {
      setAvailable(true);

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;
        if (status !== 'granted') {
          if (await Magnetometer.isAvailableAsync()) startMagnetometerFallback();
          return;
        }

        locationSub = await Location.watchHeadingAsync(({ magHeading }) => {
          if (!mounted) return;
          applyHeading(magHeading);
        });
      } catch {
        if (!mounted) return;
        if (await Magnetometer.isAvailableAsync()) startMagnetometerFallback();
      }
    })();

    return () => {
      mounted = false;
      locationSub?.remove();
      subMag?.remove();
      subAccel?.remove();
    };
  }, [variant, applyHeading, updateHeadingFromSensors]);

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arrowRotation.value}deg` }],
  }));

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [{ scale: entranceScale.value }],
  }));

  if (variant === 'apple') {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <AppleCompassFace
          heading={Platform.OS === 'web' ? 90 : heading}
          onClose={onClose}
          theme={theme}
        />
      </View>
    );
  }

  if (!available || Platform.OS === 'web') {
    return (
      <View style={[styles.wrapper, styles.placeholder]}>
        <Text style={[styles.mizrachLabel, { color: theme.colors.text.tertiary }]}>
          מזרח
        </Text>
        <Text style={[styles.hint, { color: theme.colors.text.tertiary }]}>
          Face east to daven
        </Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.wrapper, entranceStyle]}>
      <View style={[styles.container, { borderColor: theme.colors.primary.main + '40' }]}>
        <LinearGradient
          colors={
            theme.isDark
              ? ['rgba(40,35,55,0.9)', 'rgba(30,25,45,0.85)']
              : ['rgba(255,255,255,0.95)', 'rgba(248,242,250,0.9)']
          }
          style={[StyleSheet.absoluteFill, styles.gradient]}
        />
        <View style={styles.compassFace}>
          <Text style={[styles.mizrachLabel, { color: theme.colors.primary.main }]}>
            מזרח
          </Text>
          <View style={styles.arrowContainer}>
            <Animated.View style={[styles.arrow, arrowStyle]}>
              <View
                style={[
                  styles.arrowShape,
                  { borderBottomColor: theme.colors.primary.main },
                ]}
              />
            </Animated.View>
          </View>
          <Text style={[styles.hint, { color: theme.colors.text.tertiary }]}>
            Rotate to face east
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  container: {
    width: COMPACT_SIZE,
    height: COMPACT_SIZE,
    borderRadius: COMPACT_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    borderRadius: COMPACT_SIZE / 2,
  },
  placeholder: {
    padding: spacing.md,
    minHeight: 60,
    alignItems: 'center',
  },
  compassFace: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: spacing.sm,
  },
  mizrachLabel: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  arrowContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  arrowShape: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: ARROW_SIZE / 2,
    borderRightWidth: ARROW_SIZE / 2,
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  hint: {
    fontFamily: fonts.body.regular,
    fontSize: 10,
    marginTop: spacing.xs,
  },
});
