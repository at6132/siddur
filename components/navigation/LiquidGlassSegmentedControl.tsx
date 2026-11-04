import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  GlassView,
  GlassContainer,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { fonts } from '../../src/design/typography';
import { colorWithAlpha } from '../../src/design/colorAlpha';

/** Higher damping = less overshoot when the orb snaps after a swipe. */
const springConfig = { damping: 32, stiffness: 280, mass: 0.85 };

const BAR_HEIGHT = 40;
const PILL_RADIUS = BAR_HEIGHT / 2;
const SEGMENTS_PADDING_H = 3;
const ORB_INSET = 2;
const LABEL_PAD_H = 14;
const FALLBACK_LABEL_WIDTH = 92;

/** True real liquid glass (iOS 26+ UIVisualEffectView), not BlurView faux glass. */
function canUseNativeLiquidGlass(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    if (!isLiquidGlassAvailable()) return false;
    if (typeof isGlassEffectAPIAvailable === 'function' && !isGlassEffectAPIAvailable()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function orbLeftForIndex(index: number, segmentWidth: number) {
  return SEGMENTS_PADDING_H + index * segmentWidth + ORB_INSET;
}

export interface LiquidGlassSegmentedControlProps {
  tabs: { key: string; label: string }[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

export const LiquidGlassSegmentedControl: React.FC<LiquidGlassSegmentedControlProps> = ({
  tabs,
  activeIndex,
  onIndexChange,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const useNativeLiquidGlass = useMemo(() => canUseNativeLiquidGlass(), []);
  const nativeLiquidGlassSV = useSharedValue(useNativeLiquidGlass ? 1 : 0);

  const tabCount = tabs.length;
  const measuredWidths = useRef<number[]>(Array(tabCount).fill(0));
  const [maxLabelWidth, setMaxLabelWidth] = useState(0);

  const labelWidth = maxLabelWidth || FALLBACK_LABEL_WIDTH;
  const segmentWidth = labelWidth + LABEL_PAD_H * 2;
  const barWidth = SEGMENTS_PADDING_H * 2 + segmentWidth * tabCount;
  const orbWidth = Math.max(0, segmentWidth - ORB_INSET * 2);
  const orbHeight = BAR_HEIGHT - ORB_INSET * 2;
  const minOrbX = SEGMENTS_PADDING_H + ORB_INSET;
  const maxOrbX = barWidth - SEGMENTS_PADDING_H - ORB_INSET - orbWidth;

  const orbX = useSharedValue(orbLeftForIndex(activeIndex, segmentWidth));
  const orbScale = useSharedValue(1);
  const dragStretchX = useSharedValue(0);
  const dragGlassOpacity = useSharedValue(1);
  const isDraggingOrb = useRef(false);

  const onLabelMeasure = useCallback(
    (index: number, width: number) => {
      const next = Math.ceil(width);
      if (measuredWidths.current[index] === next) return;
      measuredWidths.current[index] = next;
      if (measuredWidths.current.length !== tabCount) {
        measuredWidths.current = Array(tabCount).fill(0);
        measuredWidths.current[index] = next;
      }
      if (measuredWidths.current.every((w) => w > 0)) {
        const max = Math.max(...measuredWidths.current);
        setMaxLabelWidth((prev) => (prev === max ? prev : max));
      }
    },
    [tabCount]
  );

  const snapToIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(tabCount - 1, index));
      onIndexChange(clamped);
    },
    [onIndexChange, tabCount]
  );

  const handleBarTap = useCallback(
    (x: number) => {
      const index = Math.floor((x - SEGMENTS_PADDING_H) / segmentWidth);
      const clamped = Math.max(0, Math.min(tabCount - 1, index));
      onIndexChange(clamped);
      orbX.value = withSpring(orbLeftForIndex(clamped, segmentWidth), springConfig);
    },
    [onIndexChange, tabCount, segmentWidth, orbX]
  );

  const barTapGesture = Gesture.Tap().onEnd((e) => {
    runOnJS(handleBarTap)(e.x);
  });

  const dragStartX = useSharedValue(0);

  const bubblePanGesture = Gesture.Pan()
    .onStart(() => {
      isDraggingOrb.current = true;
      dragStartX.value = orbX.value;
      orbScale.value = withSpring(1.06, { damping: 14, stiffness: 200 });
      if (nativeLiquidGlassSV.value === 0) {
        dragGlassOpacity.value = withTiming(0.18, { duration: 120, easing: Easing.out(Easing.ease) });
      }
    })
    .onUpdate((e) => {
      const next = dragStartX.value + e.translationX;
      orbX.value = Math.min(maxOrbX, Math.max(minOrbX, next));
      dragStretchX.value = e.translationX;
    })
    .onEnd(() => {
      isDraggingOrb.current = false;
      orbScale.value = withSpring(1, springConfig);
      dragStretchX.value = withSpring(0, springConfig);
      if (nativeLiquidGlassSV.value === 0) {
        dragGlassOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) });
      }
      const currentCenter = orbX.value + orbWidth / 2;
      const targetIndex = Math.round(
        (currentCenter - SEGMENTS_PADDING_H - segmentWidth / 2) / segmentWidth
      );
      runOnJS(snapToIndex)(targetIndex);
    });

  useEffect(() => {
    if (!isDraggingOrb.current) {
      orbX.value = withSpring(orbLeftForIndex(activeIndex, segmentWidth), springConfig);
    }
  }, [activeIndex, segmentWidth, orbX]);

  const bubbleAnimatedStyle = useAnimatedStyle(() => {
    const stretch = interpolate(
      dragStretchX.value,
      [-80, -40, 0, 40, 80],
      [-0.05, -0.025, 0, 0.025, 0.05]
    );
    return {
      transform: [
        { translateX: orbX.value },
        { scaleX: orbScale.value + stretch },
        { scaleY: orbScale.value - Math.abs(stretch) * 0.5 },
      ],
    };
  });

  const bubbleGlassOverlayStyle = useAnimatedStyle(() => ({
    opacity: dragGlassOpacity.value,
  }));

  const glassColorScheme = (theme.isDark ? 'dark' : 'light') as 'dark' | 'light';
  const barTint = colorWithAlpha(theme.colors.primary.light, theme.isDark ? 0.22 : 0.35);
  const orbTint = colorWithAlpha(theme.colors.primary.main, theme.isDark ? 0.28 : 0.4);

  const orbNode = (
    <GestureDetector gesture={bubblePanGesture}>
      <Animated.View
        style={[
          styles.orbOuter,
          {
            width: orbWidth,
            height: orbHeight,
            borderRadius: orbHeight / 2,
            top: ORB_INSET,
          },
          bubbleAnimatedStyle,
        ]}
      >
        {useNativeLiquidGlass ? (
          <GlassView
            style={[StyleSheet.absoluteFill, { borderRadius: orbHeight / 2 }]}
            glassEffectStyle="clear"
            colorScheme={glassColorScheme}
            tintColor={orbTint}
          />
        ) : Platform.OS !== 'web' ? (
          <>
            <BlurView
              intensity={95}
              tint={theme.isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={
                theme.isDark
                  ? ['rgba(255,255,255,0.25)', 'rgba(200,200,255,0.15)', 'rgba(255,255,255,0.08)']
                  : ['rgba(255,255,255,0.78)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.35)']
              }
              style={StyleSheet.absoluteFill}
            />
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.orbGlassOverlay,
                { borderRadius: orbHeight / 2 },
                bubbleGlassOverlayStyle,
              ]}
            />
            <View style={[styles.orbBorder, { borderRadius: orbHeight / 2 }]} />
          </>
        ) : (
          <>
            <LinearGradient
              colors={
                theme.isDark
                  ? ['rgba(255,255,255,0.25)', 'rgba(220,220,255,0.12)']
                  : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.65)']
              }
              style={StyleSheet.absoluteFill}
            />
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.orbGlassOverlay,
                { borderRadius: orbHeight / 2 },
                bubbleGlassOverlayStyle,
              ]}
            />
            <View style={[styles.orbBorder, { borderRadius: orbHeight / 2 }]} />
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );

  const labelsLayer = (
    <View style={[styles.segmentsWrapper, { width: barWidth }]} pointerEvents="box-none">
      {orbNode}
      {tabs.map((tab, index) => {
        const isFocused = activeIndex === index;
        return (
          <View
            key={tab.key}
            style={[styles.segment, { width: segmentWidth }]}
            pointerEvents="none"
          >
            <Text
              style={[
                styles.label,
                {
                  color: isFocused ? theme.colors.primary.main : theme.colors.text.tertiary,
                  fontFamily: isFocused ? fonts.body.semibold : fonts.body.medium,
                },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <GestureDetector gesture={barTapGesture}>
      <View style={[styles.outer, { width: barWidth }, useNativeLiquidGlass && styles.outerNative]}>
        <View style={styles.measure} pointerEvents="none">
          {tabs.map((tab, index) => (
            <Text
              key={`measure-${tab.key}`}
              style={styles.measureLabel}
              onLayout={(e) => onLabelMeasure(index, e.nativeEvent.layout.width)}
            >
              {tab.label}
            </Text>
          ))}
        </View>

        {useNativeLiquidGlass ? (
          <GlassContainer spacing={8} style={[styles.nativeGlassRoot, { width: barWidth }]}>
            <GlassView
              style={[styles.nativeBarGlass, { borderRadius: PILL_RADIUS }]}
              glassEffectStyle="regular"
              colorScheme={glassColorScheme}
              tintColor={barTint}
            />
            {labelsLayer}
          </GlassContainer>
        ) : (
          <View style={[styles.islandFallback, { width: barWidth }]}>
            {Platform.OS !== 'web' ? (
              <>
                <BlurView
                  intensity={92}
                  tint={theme.isDark ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={
                    theme.isDark
                      ? ['rgba(22,19,32,0.55)', 'rgba(18,17,33,0.42)', 'rgba(14,14,24,0.32)']
                      : ['rgba(255,255,255,0.42)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0.18)']
                  }
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.glassBorder} />
              </>
            ) : (
              <LinearGradient
                colors={
                  theme.isDark
                    ? ['rgba(30,29,45,0.72)', 'rgba(24,23,37,0.6)', 'rgba(17,17,28,0.5)']
                    : ['rgba(255,255,255,0.62)', 'rgba(255,255,255,0.48)', 'rgba(255,255,255,0.36)']
                }
                style={StyleSheet.absoluteFill}
              >
                <View style={styles.glassBorder} />
              </LinearGradient>
            )}
            {labelsLayer}
          </View>
        )}
      </View>
    </GestureDetector>
  );
};

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    outer: {
      alignSelf: 'center',
      height: BAR_HEIGHT,
      marginBottom: 20,
      borderRadius: PILL_RADIUS,
      overflow: 'hidden',
      shadowColor: theme.colors.shadow.dark,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: theme.isDark ? 0.4 : 0.1,
      shadowRadius: theme.isDark ? 24 : 20,
      elevation: 10,
      backgroundColor: 'transparent',
    },
    outerNative: {
      overflow: 'visible',
      shadowOpacity: theme.isDark ? 0.35 : 0.08,
      shadowRadius: theme.isDark ? 22 : 18,
    },
    measure: {
      position: 'absolute',
      opacity: 0,
      left: 0,
      top: 0,
    },
    measureLabel: {
      fontFamily: fonts.body.semibold,
      fontSize: 13,
      letterSpacing: 0.15,
    },
    nativeGlassRoot: {
      height: BAR_HEIGHT,
      borderRadius: PILL_RADIUS,
      overflow: 'visible',
    },
    nativeBarGlass: {
      ...StyleSheet.absoluteFill,
    },
    islandFallback: {
      height: BAR_HEIGHT,
      borderRadius: PILL_RADIUS,
      overflow: 'hidden',
    },
    glassBorder: {
      ...StyleSheet.absoluteFill,
      borderRadius: PILL_RADIUS,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.28)' : 'rgba(255, 255, 255, 0.7)',
    },
    segmentsWrapper: {
      height: BAR_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SEGMENTS_PADDING_H,
    },
    orbOuter: {
      position: 'absolute',
      left: 0,
      overflow: 'hidden',
      shadowColor: theme.colors.shadow.dark,
      shadowOffset: { width: 0, height: theme.isDark ? 4 : 2 },
      shadowOpacity: theme.isDark ? 0.35 : 0.1,
      shadowRadius: theme.isDark ? 12 : 6,
      elevation: 6,
      backgroundColor: 'transparent',
      zIndex: 1,
    },
    orbGlassOverlay: {
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.55)',
    },
    orbBorder: {
      ...StyleSheet.absoluteFill,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.45)' : 'rgba(255, 255, 255, 0.9)',
    },
    segment: {
      height: BAR_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    label: {
      fontFamily: fonts.body.medium,
      fontSize: 13,
      letterSpacing: 0.15,
      includeFontPadding: false,
      textAlign: 'center',
      textAlignVertical: 'center',
      lineHeight: 16,
    },
  });
}
