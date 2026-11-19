/**
 * Mizrach Compass - Points toward Jerusalem for davening
 * variant="apple" = large Apple Compass–style dial for modal
 * variant="compact" = small arrow (legacy)
 *
 * GPS → great-circle bearing to the Kotel / Temple Mount (true/geographic).
 * Device heading is converted to true north (magHeading + WMM declination) so
 * the dial matches Apple Compass with “Use True North”. Dial tracks 1:1 on the
 * short arc (no full spin when crossing north).
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
import { useTheme } from '../../src/design/theme';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { LOCATION_REQUIRED_MESSAGE, LOCATION_TIME_PLACEHOLDER, requestLocationFromUser } from '../../src/services/LocationAccess';
import {
  getMagneticDeclination,
  magneticToTrueHeading,
} from '../../src/services/magneticDeclination';

const COMPACT_SIZE = 100;
const APPLE_SIZE = 300;
const ARROW_SIZE = 24;

/** Kotel / Temple Mount — traditional direction for tefillah */
const JERUSALEM = {
  latitude: 31.7767,
  longitude: 35.2345,
} as const;

/** Default when GPS / stored location is unavailable (classic “east”) */
const DEFAULT_JERUSALEM_BEARING = 90;

/**
 * Initial great-circle bearing from (lat1, lon1) to (lat2, lon2).
 * Returns degrees clockwise from true north: 0 = N, 90 = E.
 */
function getBearingTo(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

function getBearingToJerusalem(latitude: number, longitude: number): number {
  return getBearingTo(
    latitude,
    longitude,
    JERUSALEM.latitude,
    JERUSALEM.longitude
  );
}

/** Clockwise turn from current heading to Jerusalem bearing — for arrow rotation */
function getMizrachRotation(heading: number, jerusalemBearing: number): number {
  return (jerusalemBearing - heading + 360) % 360;
}

/** Signed shortest turn (−180…180): positive = turn right toward Jerusalem */
function getTurnToJerusalem(heading: number, jerusalemBearing: number): number {
  return ((jerusalemBearing - heading + 540) % 360) - 180;
}

/** Normalize to [0, 360) */
function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Advance a continuous rotation so it takes the short arc to `targetDeg`
 * (matches Apple Compass — no full spin when crossing north).
 */
function shortestRotationToward(current: number, targetDeg: number): number {
  const delta =
    ((normalizeDeg(targetDeg) - normalizeDeg(current) + 540) % 360) - 180;
  return current + delta;
}

/**
 * True-north heading to match Apple Compass with “Use True North”.
 *
 * 1) Core Location trueHeading when valid (same source as Apple)
 * 2) Else magHeading + WMM declination (Expo often leaves trueHeading at -1)
 * 3) Else raw magnetic (last resort)
 */
function pickTrueHeading(
  trueHeading: number,
  magHeading: number,
  declination: number | null
): number | null {
  const trueOk = typeof trueHeading === 'number' && trueHeading >= 0;
  if (trueOk) return normalizeDeg(trueHeading);

  const magOk = typeof magHeading === 'number' && Number.isFinite(magHeading);
  if (magOk && declination != null) {
    return normalizeDeg(magneticToTrueHeading(magHeading, declination));
  }
  if (magOk) return normalizeDeg(magHeading);
  return null;
}

// ---- Apple-style compass (large modal) ----
const APPLE_R = APPLE_SIZE / 2;
const TICK_R = APPLE_R - 18;
const CARDINAL_R = APPLE_R - 48;
const FACE_RING_R = APPLE_R - 6;

function AppleCompassFace({
  heading,
  jerusalemBearing,
  bearingReady,
  onClose,
  theme,
}: {
  heading: number;
  jerusalemBearing: number;
  bearingReady: boolean;
  onClose?: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const gradId = useId().replace(/:/g, '');
  // Continuous unwrapped degrees so updates never take the long way past 0°/360°
  const rotation = useSharedValue(-heading);
  useEffect(() => {
    // Near 1:1 with device motion (Apple Compass feel) — short arc only
    rotation.value = shortestRotationToward(rotation.value, -normalizeDeg(heading));
  }, [heading, rotation]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const cardinals = [
    { label: 'N', deg: 0, accent: 'north' as const },
    { label: 'E', deg: 90, accent: 'cardinal' as const },
    { label: 'S', deg: 180, accent: 'cardinal' as const },
    { label: 'W', deg: 270, accent: 'cardinal' as const },
  ];

  // Highlight wedge ±22° around bearing to Jerusalem (fallback east if unknown)
  const targetDeg = bearingReady ? jerusalemBearing : DEFAULT_JERUSALEM_BEARING;
  const highlightR = TICK_R - 4;
  const halfWedge = 22;
  const wedgeA = ((targetDeg - halfWedge) * Math.PI) / 180;
  const wedgeB = ((targetDeg + halfWedge) * Math.PI) / 180;
  const wx1 = APPLE_R + highlightR * Math.sin(wedgeA);
  const wy1 = APPLE_R - highlightR * Math.cos(wedgeA);
  const wx2 = APPLE_R + highlightR * Math.sin(wedgeB);
  const wy2 = APPLE_R - highlightR * Math.cos(wedgeB);
  const jerusalemWedgePath = `M ${APPLE_R} ${APPLE_R} L ${wx1} ${wy1} A ${highlightR} ${highlightR} 0 0 1 ${wx2} ${wy2} Z`;

  // Marker for exact Jerusalem bearing on the dial face
  const targetRad = (targetDeg * Math.PI) / 180;
  const markerOuter = TICK_R - 2;
  const markerInner = TICK_R - 28;
  const mx1 = APPLE_R + markerInner * Math.sin(targetRad);
  const my1 = APPLE_R - markerInner * Math.cos(targetRad);
  const mx2 = APPLE_R + markerOuter * Math.sin(targetRad);
  const my2 = APPLE_R - markerOuter * Math.cos(targetRad);

  const turn = getTurnToJerusalem(heading, targetDeg);
  const aligned = Math.abs(turn) < 4;

  const cardinalFill = (accent: 'north' | 'cardinal') => {
    if (accent === 'north') return theme.colors.secondary.dark;
    return theme.colors.text.tertiary;
  };

  const sheetGradient = theme.isDark
    ? (['rgba(36,32,48,0.98)', 'rgba(22,20,34,0.99)'] as const)
    : (['rgba(255,252,253,0.98)', 'rgba(245,236,242,0.99)'] as const);

  return (
    <View
      // Compass geometry is LTR even inside Hebrew screens
      style={[
        appleStyles.sheet,
        {
          direction: 'ltr',
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
      <Text style={[appleStyles.sheetKicker, { color: theme.colors.text.tertiary }]}>
        Toward Yerushalayim
      </Text>

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
                  d={jerusalemWedgePath}
                  fill={theme.colors.primary.main}
                  fillOpacity={theme.isDark ? 0.14 : 0.18}
                />
                <Line
                  x1={mx1}
                  y1={my1}
                  x2={mx2}
                  y2={my2}
                  stroke={theme.colors.primary.dark}
                  strokeWidth={3}
                  strokeLinecap="round"
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
                        fontSize={21}
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
          {aligned ? '0°' : `${Math.round(Math.abs(turn))}°`}
        </Text>
        <Text style={[appleStyles.readoutHint, { color: theme.colors.text.tertiary }]}>
          {aligned
            ? 'Facing Yerushalayim'
            : turn > 0
              ? 'Turn right'
              : 'Turn left'}
        </Text>
        <Text style={[appleStyles.readoutMeta, { color: theme.colors.text.tertiary }]}>
          {bearingReady
            ? `True north ${Math.round(heading)}° · Yerushalayim ${Math.round(jerusalemBearing)}°`
            : `True north ${Math.round(heading)}°`}
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
    marginBottom: spacing.sm,
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
  readoutHint: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    marginTop: 4,
  },
  readoutMeta: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    marginTop: 6,
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
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [watchNonce, setWatchNonce] = useState(0);
  const [heading, setHeading] = useState(0);
  const [jerusalemBearing, setJerusalemBearing] = useState(DEFAULT_JERUSALEM_BEARING);
  const [bearingReady, setBearingReady] = useState(false);
  const arrowRotation = useSharedValue(0);
  const entranceScale = useSharedValue(0.85);
  const entranceOpacity = useSharedValue(0);
  const jerusalemBearingRef = useRef(DEFAULT_JERUSALEM_BEARING);
  const declinationRef = useRef<number | null>(null);
  const lastAccuracyRef = useRef(0);

  const updateDeclination = useCallback((latitude: number, longitude: number) => {
    const decl = getMagneticDeclination(latitude, longitude);
    if (decl != null) declinationRef.current = decl;
  }, []);

  useEffect(() => {
    if (available && variant === 'compact') {
      entranceScale.value = withSpring(1, { damping: 12, stiffness: 100 });
      entranceOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    }
  }, [available, variant]);

  const applyHeading = useCallback((degrees: number) => {
    const h = normalizeDeg(degrees);
    setHeading(h);
    const rotTarget = getMizrachRotation(h, jerusalemBearingRef.current);
    arrowRotation.value = shortestRotationToward(arrowRotation.value, rotTarget);
  }, [arrowRotation]);

  const setTargetBearing = useCallback(
    (bearing: number) => {
      const b = normalizeDeg(bearing);
      jerusalemBearingRef.current = b;
      setJerusalemBearing(b);
      setBearingReady(true);
      // Refresh arrow for compact variant with new target
      setHeading((h) => {
        const rotTarget = getMizrachRotation(h, b);
        arrowRotation.value = shortestRotationToward(arrowRotation.value, rotTarget);
        return h;
      });
    },
    [arrowRotation]
  );

  const resolveJerusalemBearing = useCallback(async (): Promise<void> => {
    const applyCoords = (latitude: number, longitude: number) => {
      updateDeclination(latitude, longitude);
      setTargetBearing(getBearingToJerusalem(latitude, longitude));
    };

    // Prefs first so declination is ready before the first heading frame
    try {
      const prefs = await UserPreferencesService.getPreferences();
      const loc = prefs?.location;
      if (
        loc &&
        typeof loc.latitude === 'number' &&
        typeof loc.longitude === 'number'
      ) {
        applyCoords(loc.latitude, loc.longitude);
      }
    } catch {
      // continue to GPS
    }

    try {
      if (Platform.OS !== 'web') {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const last = await Location.getLastKnownPositionAsync({
            maxAge: 1000 * 60 * 30,
          });
          if (last) {
            applyCoords(last.coords.latitude, last.coords.longitude);
          }
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          applyCoords(pos.coords.latitude, pos.coords.longitude);
        }
      }
    } catch {
      // keep prefs / default
    }
  }, [setTargetBearing, updateDeclination]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (variant === 'apple') setAvailable(true);
      // Still try prefs-based bearing on web for display
      resolveJerusalemBearing();
      return;
    }

    let mounted = true;
    let headingSub: { remove: () => void } | null = null;
    let positionSub: { remove: () => void } | null = null;
    lastAccuracyRef.current = 0;
    declinationRef.current = null;

    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (!mounted) return;
        if (status !== 'granted') {
          setLocationBlocked(true);
          setAvailable(true);
          return;
        }

        setLocationBlocked(false);
        setAvailable(true);

        // Jerusalem bearing + WMM declination before first heading tick
        await resolveJerusalemBearing();
        if (!mounted) return;

        try {
          positionSub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              distanceInterval: 50,
              timeInterval: 15_000,
            },
            (pos) => {
              if (!mounted) return;
              updateDeclination(pos.coords.latitude, pos.coords.longitude);
            }
          );
        } catch {
          // Heading still works via mag + last declination / trueHeading
        }
        if (!mounted) {
          positionSub?.remove();
          return;
        }

        headingSub = await Location.watchHeadingAsync(({ trueHeading, magHeading, accuracy }) => {
          if (!mounted) return;

          if (typeof accuracy === 'number') {
            if (accuracy <= 0 && lastAccuracyRef.current > 0) return;
            if (accuracy > 0) lastAccuracyRef.current = accuracy;
          }

          const picked = pickTrueHeading(
            trueHeading,
            magHeading,
            declinationRef.current
          );
          if (picked == null) return;
          applyHeading(picked);
        });
      } catch {
        if (!mounted) return;
        setLocationBlocked(true);
        setAvailable(true);
      }
    })();

    return () => {
      mounted = false;
      headingSub?.remove();
      positionSub?.remove();
    };
  }, [variant, applyHeading, resolveJerusalemBearing, updateDeclination, watchNonce]);

  const handleAllowLocation = async () => {
    const granted = await requestLocationFromUser();
    if (granted) {
      setLocationBlocked(false);
      setWatchNonce((n) => n + 1);
    }
  };

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arrowRotation.value}deg` }],
  }));

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [{ scale: entranceScale.value }],
  }));

  if (locationBlocked) {
    return (
      <TouchableOpacity
        style={[styles.wrapper, styles.placeholder]}
        onPress={handleAllowLocation}
        activeOpacity={0.7}
      >
        <Text style={[styles.hint, { color: theme.colors.text.tertiary, textAlign: 'center' }]}>
          {LOCATION_REQUIRED_MESSAGE}
        </Text>
        <Text style={[styles.hint, { color: theme.colors.text.tertiary, marginTop: spacing.xs }]}>
          Mizrach {LOCATION_TIME_PLACEHOLDER}
        </Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'apple') {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <AppleCompassFace
          heading={Platform.OS === 'web' ? jerusalemBearing : heading}
          jerusalemBearing={jerusalemBearing}
          bearingReady={bearingReady}
          onClose={onClose}
          theme={theme}
        />
      </View>
    );
  }

  if (!available || Platform.OS === 'web') {
    return (
      <View style={[styles.wrapper, styles.placeholder]}>
        <Text style={[styles.hint, { color: theme.colors.text.tertiary }]}>
          Face Yerushalayim to daven
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
            {bearingReady
              ? `Yerushalayim · ${Math.round(jerusalemBearing)}°`
              : 'Rotate to face Yerushalayim'}
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
