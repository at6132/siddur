import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  GlassView,
  GlassContainer,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { fonts } from '../../src/design/typography';
import { colorWithAlpha } from '../../src/design/colorAlpha';

/** Higher damping = less overshoot when the orb snaps after a swipe. */
const springConfig = { damping: 32, stiffness: 280, mass: 0.85 };

const FLOATING_MARGIN_H = 16;
const FLOATING_MARGIN_BOTTOM = 12;
const BAR_HEIGHT = 64;
const PILL_RADIUS = BAR_HEIGHT / 2;
const TABS_PADDING_H = 4;
const TAB_PAD_H = 8;
const MIN_TAB_WIDTH = 54;
const FALLBACK_LABEL_WIDTH = 52;
const ICON_SIZE = 22;

// Custom SVG Icons
const HomeIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9.5L12 3L21 9.5V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9.5Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 22V12H15V22"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CalendarIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M16 2V6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 2V6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 10H21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BookIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SearchIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M21 21L16.65 16.65"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Hub: your personal center (goals, growth, day/week/month)
const HubIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M12 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0" stroke={color} strokeWidth={2} fill={color} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TAB_ICONS: { [key: string]: React.FC<{ color: string; size?: number }> } = {
  Home: HomeIcon,
  Library: BookIcon,
  Hub: HubIcon,
  Calendar: CalendarIcon,
  Search: SearchIcon,
  Tehillim: BookIcon,
};

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

interface LiquidGlassTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function orbCenterXForIndex(index: number, tabWidth: number, orbSize: number) {
  const tabCenterX = TABS_PADDING_H + index * tabWidth + tabWidth / 2;
  return tabCenterX - orbSize / 2;
}

export const LiquidGlassTabBar: React.FC<LiquidGlassTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const { theme } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const currentRoute = state.routes[state.index];
  const currentOptions = currentRoute ? descriptors[currentRoute.key]?.options : undefined;
  const tabBarHidden = currentOptions?.tabBarStyle?.display === 'none';
  const useNativeLiquidGlass = useMemo(() => canUseNativeLiquidGlass(), []);
  // Shared boolean for gesture worklets (avoid capturing React state incorrectly)
  const nativeLiquidGlassSV = useSharedValue(useNativeLiquidGlass ? 1 : 0);

  const { width: windowWidth } = useWindowDimensions();
  const tabCount = state.routes.length;
  const tabLabelsList = state.routes.map((route: any) => {
    const { options } = descriptors[route.key] ?? {};
    return String(options?.tabBarLabel ?? route.name);
  });
  const measuredWidths = useRef<number[]>(Array(tabCount).fill(0));
  const [maxLabelWidth, setMaxLabelWidth] = useState(0);

  const onLabelMeasure = useCallback(
    (index: number, width: number) => {
      const next = Math.ceil(width);
      if (measuredWidths.current[index] === next) return;
      if (measuredWidths.current.length !== tabCount) {
        measuredWidths.current = Array(tabCount).fill(0);
      }
      measuredWidths.current[index] = next;
      if (measuredWidths.current.every((w) => w > 0)) {
        const max = Math.max(...measuredWidths.current);
        setMaxLabelWidth((prev) => (prev === max ? prev : max));
      }
    },
    [tabCount]
  );

  const labelWidth = maxLabelWidth || FALLBACK_LABEL_WIDTH;
  const desiredTabWidth = Math.max(MIN_TAB_WIDTH, ICON_SIZE + TAB_PAD_H * 2, labelWidth + TAB_PAD_H * 2);
  const maxBarWidth = Math.max(0, windowWidth - FLOATING_MARGIN_H * 2);
  const desiredBarWidth = TABS_PADDING_H * 2 + desiredTabWidth * tabCount;
  const barWidth = Math.min(desiredBarWidth, maxBarWidth);
  const tabWidth = tabCount > 0 ? (barWidth - TABS_PADDING_H * 2) / tabCount : 0;
  const orbSize = Math.max(40, Math.min(tabWidth - 4, BAR_HEIGHT - 8));
  const minOrbX = 0;
  const maxOrbX = Math.max(0, barWidth - orbSize);

  const orbX = useSharedValue(orbCenterXForIndex(state.index, tabWidth, orbSize));
  const orbScale = useSharedValue(1);
  const dragStretchX = useSharedValue(0);
  const dragGlassOpacity = useSharedValue(1);
  const isDraggingOrb = useRef(false);

  const goToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < tabCount) {
        navigation.emit({ type: 'tabPress', target: state.routes[index].key, canPreventDefault: true });
        navigation.navigate(state.routes[index].name);
      }
    },
    [navigation, state.routes, tabCount]
  );

  const snapToIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(tabCount - 1, index));
      goToIndex(clamped);
      // useEffect will animate orb to new position when state.index updates
    },
    [goToIndex, tabCount]
  );

  const handleBarTap = useCallback(
    (x: number) => {
      const index = Math.floor((x - TABS_PADDING_H) / tabWidth);
      const clamped = Math.max(0, Math.min(tabCount - 1, index));
      goToIndex(clamped);
      orbX.value = withSpring(orbCenterXForIndex(clamped, tabWidth, orbSize), springConfig);
    },
    [goToIndex, tabCount, tabWidth, orbSize, orbX]
  );

  const barTapGesture = Gesture.Tap()
    .onEnd((e) => {
      runOnJS(handleBarTap)(e.x);
    });

  const dragStartX = useSharedValue(0);

  const bubblePanGesture = Gesture.Pan()
    .onStart(() => {
      isDraggingOrb.current = true;
      dragStartX.value = orbX.value;
      orbScale.value = withSpring(1.08, { damping: 22, stiffness: 280 });
      // Real GlassView breaks with parent opacity < 1 — only fade faux glass
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
      const currentCenter = orbX.value + orbSize / 2;
      const targetIndex = Math.round((currentCenter - TABS_PADDING_H - tabWidth / 2) / tabWidth);
      runOnJS(snapToIndex)(targetIndex);
    });

  useEffect(() => {
    if (!isDraggingOrb.current) {
      orbX.value = withSpring(orbCenterXForIndex(state.index, tabWidth, orbSize), springConfig);
    }
  }, [state.index, tabWidth, orbSize]);

  const bubbleAnimatedStyle = useAnimatedStyle(() => {
    const stretch = interpolate(
      dragStretchX.value,
      [-100, -50, 0, 50, 100],
      [-0.04, -0.02, 0, 0.02, 0.04],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: orbX.value },
        { scaleX: orbScale.value + stretch },
        { scaleY: orbScale.value - Math.abs(stretch) * 0.4 },
      ],
    };
  });

  const bubbleGlassOverlayStyle = useAnimatedStyle(() => ({
    opacity: dragGlassOpacity.value,
  }));

  const bottomPadding = Math.max(insets.bottom, 8) + FLOATING_MARGIN_BOTTOM;
  const glassColorScheme = (theme.isDark ? 'dark' : 'light') as 'dark' | 'light';
  const barTint = colorWithAlpha(theme.colors.primary.light, theme.isDark ? 0.22 : 0.35);
  const orbTint = colorWithAlpha(theme.colors.primary.main, theme.isDark ? 0.28 : 0.4);

  if (tabBarHidden) {
    return null;
  }

  const orbNode = (
    <GestureDetector gesture={bubblePanGesture}>
      <Animated.View
        style={[
          styles.orbOuter,
          {
            width: orbSize,
            height: orbSize,
            borderRadius: orbSize / 2,
            top: (BAR_HEIGHT - orbSize) / 2,
          },
          bubbleAnimatedStyle,
        ]}
      >
        {useNativeLiquidGlass ? (
          <GlassView
            style={[StyleSheet.absoluteFillObject, { borderRadius: orbSize / 2 }]}
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
                { borderRadius: orbSize / 2 },
                bubbleGlassOverlayStyle,
              ]}
            />
            <View style={[styles.orbBorder, { borderRadius: orbSize / 2 }]} />
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
                { borderRadius: orbSize / 2 },
                bubbleGlassOverlayStyle,
              ]}
            />
            <View style={[styles.orbBorder, { borderRadius: orbSize / 2 }]} />
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );

  const tabLabels = state.routes.map((route: any, index: number) => {
    const { options } = descriptors[route.key];
    const label = options.tabBarLabel ?? route.name;
    const isFocused = state.index === index;
    const IconComponent = TAB_ICONS[route.name] || HomeIcon;

    return (
      <View key={route.key} style={[styles.tab, { width: tabWidth }]} pointerEvents="none">
        <IconComponent
          color={isFocused ? theme.colors.primary.main : theme.colors.text.tertiary}
          size={ICON_SIZE}
        />
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
          {label}
        </Text>
      </View>
    );
  });

  const tabsLayer = (
    <View style={[styles.tabsWrapper, { width: barWidth }]}>
      {orbNode}
      {tabLabels}
    </View>
  );

  return (
    <View style={[styles.outer, { paddingBottom: bottomPadding }]} pointerEvents="box-none">
      <View style={styles.measure} pointerEvents="none">
        {tabLabelsList.map((label: string, index: number) => (
          <Text
            key={`measure-${state.routes[index].key}`}
            style={styles.measureLabel}
            onLayout={(e) => onLabelMeasure(index, e.nativeEvent.layout.width)}
          >
            {label}
          </Text>
        ))}
      </View>
      <GestureDetector gesture={barTapGesture}>
        <View
          style={[
            styles.islandWrapper,
            { width: barWidth },
            useNativeLiquidGlass && styles.islandWrapperNative,
          ]}
        >
          {useNativeLiquidGlass ? (
            <GlassContainer spacing={8} style={[styles.nativeGlassRoot, { width: barWidth }]}>
              <GlassView
                style={[styles.nativeBarGlass, { borderRadius: PILL_RADIUS }]}
                glassEffectStyle="regular"
                colorScheme={glassColorScheme}
                tintColor={barTint}
              />
              {tabsLayer}
            </GlassContainer>
          ) : (
            <>
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
              {tabsLayer}
            </>
          )}
        </View>
      </GestureDetector>
    </View>
  );
};

function createTabBarStyles(theme: AppTheme) {
  return {
    outer: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: FLOATING_MARGIN_H,
      paddingTop: 10,
    },
    islandWrapper: {
      alignSelf: 'center' as const,
      height: BAR_HEIGHT,
      borderRadius: PILL_RADIUS,
      overflow: 'hidden' as const,
      shadowColor: theme.isDark ? '#000' : '#2C2C2C',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: theme.isDark ? 0.45 : 0.12,
      shadowRadius: theme.isDark ? 30 : 24,
      elevation: 12,
      backgroundColor: 'transparent',
    },
    // Real liquid glass needs soft edges / lensing not clipped hard
    islandWrapperNative: {
      overflow: 'visible' as const,
      shadowOpacity: theme.isDark ? 0.35 : 0.08,
      shadowRadius: theme.isDark ? 22 : 18,
    },
    nativeGlassRoot: {
      height: BAR_HEIGHT,
      borderRadius: PILL_RADIUS,
      overflow: 'visible' as const,
    },
    measure: {
      position: 'absolute' as const,
      opacity: 0,
      left: 0,
      top: 0,
    },
    measureLabel: {
      fontFamily: fonts.body.semibold,
      fontSize: 11,
      letterSpacing: 0.2,
    },
    nativeBarGlass: {
      ...StyleSheet.absoluteFillObject,
    },
    glassBorder: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: PILL_RADIUS,
      borderWidth: 1.5,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.28)' : 'rgba(255, 255, 255, 0.75)',
    },
    tabsWrapper: {
      height: BAR_HEIGHT,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: TABS_PADDING_H,
    },
    orbOuter: {
      position: 'absolute' as const,
      left: 0,
      overflow: 'hidden' as const,
      shadowColor: theme.isDark ? '#000' : '#000',
      shadowOffset: { width: 0, height: theme.isDark ? 6 : 2 },
      shadowOpacity: theme.isDark ? 0.4 : 0.12,
      shadowRadius: theme.isDark ? 14 : 8,
      elevation: 6,
      backgroundColor: 'transparent',
      zIndex: 1,
    },
    orbGlassOverlay: {
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.55)',
    },
    orbBorder: {
      ...StyleSheet.absoluteFillObject,
      borderWidth: 1.5,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.45)' : 'rgba(255, 255, 255, 0.9)',
    },
    tab: {
      height: BAR_HEIGHT,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      zIndex: 2,
    },
    label: {
      fontFamily: fonts.body.medium,
      fontSize: 11,
      lineHeight: 13,
      marginTop: 3,
      letterSpacing: 0.2,
      includeFontPadding: false,
      textAlign: 'center' as const,
    },
  };
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(() => {
    try {
      return StyleSheet.create(createTabBarStyles(theme));
    } catch (e) {
      console.warn('LiquidGlassTabBar styles error:', e);
      return StyleSheet.create({
        outer: {},
        islandWrapper: {},
        islandWrapperNative: {},
        nativeGlassRoot: {},
        nativeBarGlass: {},
        measure: {},
        measureLabel: {},
        glassBorder: {},
        tabsWrapper: {},
        orbOuter: {},
        orbGlassOverlay: {},
        orbBorder: {},
        tab: {},
        label: {},
      });
    }
  }, [theme]);
}
