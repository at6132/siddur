import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
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

const springConfig = { damping: 18, stiffness: 180 };

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FLOATING_MARGIN_H = 20;
const PILL_RADIUS = 32;
const SEGMENT_BAR_WIDTH = SCREEN_WIDTH - FLOATING_MARGIN_H * 2;
const ORB_HEIGHT = 40;
const SEGMENTS_WRAPPER_MIN_HEIGHT = 52;
const SEGMENTS_PADDING_H = 4;

function orbLeftForIndex(index: number, segmentWidth: number) {
  return SEGMENTS_PADDING_H + index * segmentWidth;
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
  const tabCount = tabs.length;
  const segmentWidth = SEGMENT_BAR_WIDTH / tabCount;
  const orbWidth = segmentWidth;
  const minOrbX = 0;
  const maxOrbX = SEGMENT_BAR_WIDTH - orbWidth;

  const orbX = useSharedValue(orbLeftForIndex(activeIndex, segmentWidth));
  const orbScale = useSharedValue(1);
  const dragStretchX = useSharedValue(0);
  const dragGlassOpacity = useSharedValue(1);
  const isDraggingOrb = useRef(false);

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
      orbScale.value = withSpring(1.18, { damping: 14, stiffness: 200 });
      dragGlassOpacity.value = withTiming(0.18, { duration: 120, easing: Easing.out(Easing.ease) });
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
      dragGlassOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) });
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
      [-0.08, -0.04, 0, 0.04, 0.08]
    );
    return {
      transform: [
        { translateX: orbX.value },
        { scaleX: orbScale.value + stretch },
        { scaleY: orbScale.value - Math.abs(stretch) * 0.6 },
      ],
    };
  });

  const bubbleGlassOverlayStyle = useAnimatedStyle(() => ({
    opacity: dragGlassOpacity.value,
  }));

  return (
    <GestureDetector gesture={barTapGesture}>
      <View style={styles.outer}>
        <View style={styles.islandWrapper}>
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
                    ? ['rgba(22,19,32,0.92)', 'rgba(18,17,33,0.86)', 'rgba(14,14,24,0.78)']
                    : ['rgba(255,255,255,0.72)', 'rgba(255,255,255,0.52)', 'rgba(255,255,255,0.38)']
                }
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.glassBorder} />
            </>
          ) : (
            <LinearGradient
              colors={
                theme.isDark
                  ? ['rgba(30,29,45,0.9)', 'rgba(24,23,37,0.82)', 'rgba(17,17,28,0.76)']
                  : ['rgba(255,255,255,0.88)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0.65)']
              }
              style={StyleSheet.absoluteFill}
            >
              <View style={styles.glassBorder} />
            </LinearGradient>
          )}

          <View style={[styles.segmentsWrapper, { height: SEGMENTS_WRAPPER_MIN_HEIGHT }]}>
            <GestureDetector gesture={bubblePanGesture}>
              <Animated.View
                style={[
                  styles.orbOuter,
                  {
                    width: orbWidth,
                    height: ORB_HEIGHT,
                    borderRadius: ORB_HEIGHT / 2,
                    top: (SEGMENTS_WRAPPER_MIN_HEIGHT - ORB_HEIGHT) / 2,
                  },
                  bubbleAnimatedStyle,
                ]}
              >
                {Platform.OS !== 'web' ? (
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
                        { borderRadius: ORB_HEIGHT / 2 },
                        bubbleGlassOverlayStyle,
                      ]}
                    />
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
                        { borderRadius: ORB_HEIGHT / 2 },
                        bubbleGlassOverlayStyle,
                      ]}
                    />
                  </>
                )}
                <View style={[styles.orbBorder, { borderRadius: ORB_HEIGHT / 2 }]} />
              </Animated.View>
            </GestureDetector>

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
                        fontWeight: isFocused ? '600' : '400',
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
        </View>
      </View>
    </GestureDetector>
  );
};

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    outer: {
      width: SEGMENT_BAR_WIDTH,
      alignSelf: 'center',
      marginBottom: 20,
    },
    islandWrapper: {
      width: '100%',
      borderRadius: PILL_RADIUS,
      minHeight: SEGMENTS_WRAPPER_MIN_HEIGHT + 8,
      overflow: 'hidden',
      shadowColor: theme.isDark ? '#000' : '#2C2C2C',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: theme.isDark ? 0.4 : 0.1,
      shadowRadius: theme.isDark ? 24 : 20,
      elevation: 10,
      backgroundColor: 'transparent',
    },
    glassBorder: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: PILL_RADIUS,
      borderWidth: 1.5,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.28)' : 'rgba(255, 255, 255, 0.75)',
    },
    segmentsWrapper: {
      flexDirection: 'row',
      alignItems: 'stretch',
      paddingHorizontal: SEGMENTS_PADDING_H,
    },
    orbOuter: {
      position: 'absolute',
      left: 0,
      overflow: 'hidden',
      shadowColor: theme.isDark ? '#000' : '#000',
      shadowOffset: { width: 0, height: theme.isDark ? 4 : 2 },
      shadowOpacity: theme.isDark ? 0.35 : 0.1,
      shadowRadius: theme.isDark ? 12 : 6,
      elevation: 6,
      backgroundColor: 'transparent',
    },
    orbGlassOverlay: {
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.55)',
    },
    orbBorder: {
      ...StyleSheet.absoluteFillObject,
      borderWidth: 1.5,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.45)' : 'rgba(255, 255, 255, 0.9)',
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    label: {
      fontFamily: fonts.body.medium,
      fontSize: 12,
      letterSpacing: 0.2,
      includeFontPadding: false,
    },
  });
}
