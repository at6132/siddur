/**
 * Mizrach Compass - Points toward East (Mizrach) for davening
 * variant="apple" = large Apple Compass–style dial for modal
 * variant="compact" = small arrow (legacy)
 *
 * Uses expo-location watchHeadingAsync (system compass) when available,
 * with fallback to Magnetometer + Accelerometer for tilt-compensated heading.
 */

import React, { useEffect, useState, useRef, useCallback, useId } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Line,
  G,
  Text as SvgText,
  Circle,
  Defs,
  RadialGradient,
  Stop,
  Path,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import Magnetometer from 'expo-sensors/build/Magnetometer';
import Accelerometer from 'expo-sensors/build/Accelerometer';
import { useTheme } from '../../src/design/theme';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';

const COMPACT_SIZE = 100;
const APPLE_SIZE = 300;
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
const TICK_R = APPLE_R - 18;
const CARDINAL_R = APPLE_R - 48;
const FACE_RING_R = APPLE_R - 6;

function AppleCompassFace({
  heading,
  onClose,
  theme,
}: {
  heading: number;
  onClose?: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const gradId = useId().replace(/:/g, '');
  const rotation = useSharedValue(-heading);
  useEffect(() => {
    rotation.value = withSpring(-heading, { damping: 22, stiffness: 120 });
  }, [heading]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const cardinals = [
    { label: 'N', deg: 0, accent: 'north' as const },
    { label: 'E', deg: 90, accent: 'east' as const },
    { label: 'S', deg: 180, accent: 'cardinal' as const },
    { label: 'W', deg: 270, accent: 'cardinal' as const },
  ];

  const eastHighlightR = TICK_R - 4;
  const wedgeA = (68 * Math.PI) / 180;
  const wedgeB = (112 * Math.PI) / 180;
  const wx1 = APPLE_R + eastHighlightR * Math.sin(wedgeA);
  const wy1 = APPLE_R - eastHighlightR * Math.cos(wedgeA);
  const wx2 = APPLE_R + eastHighlightR * Math.sin(wedgeB);
  const wy2 = APPLE_R - eastHighlightR * Math.cos(wedgeB);
  const eastWedgePath = `M ${APPLE_R} ${APPLE_R} L ${wx1} ${wy1} A ${eastHighlightR} ${eastHighlightR} 0 0 1 ${wx2} ${wy2} Z`;

  const cardinalFill = (accent: 'north' | 'east' | 'cardinal') => {
    if (accent === 'north') return theme.colors.secondary.dark;
    if (accent === 'east') return theme.colors.primary.dark;
    return theme.colors.text.tertiary;
  };

  const sheetGradient = theme.isDark
    ? (['rgba(36,32,48,0.98)', 'rgba(22,20,34,0.99)'] as const)
    : (['rgba(255,252,253,0.98)', 'rgba(245,236,242,0.99)'] as const);

  return (
    <View
      style={[
        appleStyles.sheet,
        {
          borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(212,165,184,0.35)',
          shadowColor: theme.colors.shadow.dark,
          ...(Platform.OS === 'android'
            ? {
                backgroundColor: theme.isDark ? 'rgba(22,20,34,0.98)' : 'rgba(245,236,242,0.98)',
              }
            : {}),
        },
      ]}
    >
      <LinearGradient colors={sheetGradient} style={StyleSheet.absoluteFill} />
      <Text style={[appleStyles.sheetKicker, { color: theme.colors.text.tertiary }]}>Compass</Text>
      <Text style={[appleStyles.sheetTitle, { color: theme.colors.text.primary }]}>מזרח</Text>

      <View style={appleStyles.dialColumn}>
        <View style={appleStyles.headingIndicator} pointerEvents="none">
          <View
            style={[
              appleStyles.headingStem,
              { backgroundColor: theme.colors.primary.main },
            ]}
          />
          <View
            style={[
              appleStyles.headingJewel,
              {
                borderTopColor: theme.colors.primary.dark,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
              },
            ]}
          />
        </View>

        <View
          style={[
            appleStyles.ring,
            {
              borderColor: theme.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.85)',
              backgroundColor: theme.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.45)',
            },
          ]}
        >
          <View style={appleStyles.faceWrapper}>
            <Animated.View style={[appleStyles.face, rotateStyle]}>
              <Svg width={APPLE_SIZE} height={APPLE_SIZE} style={appleStyles.svg}>
                <Defs>
                  <RadialGradient
                    id={`mizFace_${gradId}`}
                    gradientUnits="userSpaceOnUse"
                    cx={APPLE_R * 0.92}
                    cy={APPLE_R * 0.78}
                    fx={APPLE_R * 0.92}
                    fy={APPLE_R * 0.78}
                    rx={FACE_RING_R * 1.05}
                    ry={FACE_RING_R * 1.05}
                  >
                    <Stop
                      offset="0%"
                      stopColor={theme.isDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.98)'}
                    />
                    <Stop
                      offset="52%"
                      stopColor={theme.isDark ? 'rgba(120,96,140,0.14)' : 'rgba(232,210,220,0.6)'}
                    />
                    <Stop
                      offset="100%"
                      stopColor={theme.isDark ? 'rgba(8,6,14,0.55)' : 'rgba(198,182,196,0.42)'}
                    />
                  </RadialGradient>
                </Defs>
                <Circle
                  cx={APPLE_R}
                  cy={APPLE_R}
                  r={FACE_RING_R}
                  fill={`url(#mizFace_${gradId})`}
                  stroke={theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                  strokeWidth={1}
                />
                <Circle
                  cx={APPLE_R}
                  cy={APPLE_R}
                  r={TICK_R + 6}
                  fill="none"
                  stroke={theme.colors.primary.main}
                  strokeOpacity={0.12}
                  strokeWidth={1}
                />
                <Path
                  d={eastWedgePath}
                  fill={theme.colors.primary.main}
                  fillOpacity={theme.isDark ? 0.14 : 0.18}
                />
                {Array.from({ length: 36 }, (_, i) => i * 10).map((deg) => {
                  const rad = (deg * Math.PI) / 180;
                  const isMajor = deg % 30 === 0;
                  const isCardinal = deg % 90 === 0;
                  const inner = TICK_R - (isCardinal ? 18 : isMajor ? 14 : 10);
                  const outer = TICK_R - (isCardinal ? 2 : isMajor ? 4 : 2);
                  const x1 = APPLE_R + inner * Math.sin(rad);
                  const y1 = APPLE_R - inner * Math.cos(rad);
                  const x2 = APPLE_R + outer * Math.sin(rad);
                  const y2 = APPLE_R - outer * Math.cos(rad);
                  return (
                    <Line
                      key={deg}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={
                        isCardinal
                          ? theme.colors.text.secondary
                          : theme.isDark
                            ? 'rgba(255,255,255,0.22)'
                            : 'rgba(0,0,0,0.14)'
                      }
                      strokeOpacity={isCardinal ? 0.9 : isMajor ? 0.55 : 0.35}
                      strokeWidth={isCardinal ? 2.25 : isMajor ? 1.6 : 1}
                      strokeLinecap="round"
                    />
                  );
                })}
                {cardinals.map(({ label, deg, accent }) => {
                  const rad = (deg * Math.PI) / 180;
                  const x = APPLE_R + CARDINAL_R * Math.sin(rad);
                  const y = APPLE_R - CARDINAL_R * Math.cos(rad);
                  return (
                    <G key={label} transform={`translate(${x}, ${y})`}>
                      <SvgText
                        fill={cardinalFill(accent)}
                        fontSize={accent === 'east' ? 22 : 21}
                        fontWeight="600"
                        fontFamily={Platform.select({ ios: 'System', default: 'sans-serif' })}
                        textAnchor="middle"
                        alignmentBaseline="middle"
                      >
                        {label}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>
            </Animated.View>
          </View>
        </View>
      </View>

      <View style={appleStyles.readout}>
        <Text style={[appleStyles.readoutDeg, { color: theme.colors.text.primary }]}>
          {Math.round(heading)}°
        </Text>
      </View>
      {onClose && (
        <TouchableOpacity
          style={[
            appleStyles.closeButton,
            {
              borderColor: theme.colors.primary.dark + '55',
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.65)',
            },
          ]}
          onPress={onClose}
          activeOpacity={0.85}
        >
          <Text style={[appleStyles.closeButtonText, { color: theme.colors.primary.dark }]}>
            Done
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const appleStyles = StyleSheet.create({
  sheet: {
    maxWidth: 360,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.22,
        shadowRadius: 28,
      },
      android: { elevation: 14 },
      default: {},
    }),
  },
  sheetKicker: {
    fontFamily: fonts.body.semiBold,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sheetTitle: {
    fontFamily: fonts.hebrew.semibold,
    fontSize: 26,
    marginBottom: spacing.sm,
    writingDirection: 'rtl',
  },
  dialColumn: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  ring: {
    width: APPLE_SIZE,
    height: APPLE_SIZE,
    borderRadius: APPLE_R,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
    alignItems: 'center',
    marginBottom: 2,
    zIndex: 2,
  },
  headingStem: {
    width: 3,
    height: 10,
    borderRadius: 2,
    marginBottom: -1,
  },
  headingJewel: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  readout: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  readoutDeg: {
    fontFamily: fonts.heading.bold,
    fontSize: 32,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  closeButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl + 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
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
      <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
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
