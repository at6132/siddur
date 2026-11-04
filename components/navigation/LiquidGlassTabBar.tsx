import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  GlassView,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { fonts } from '../../src/design/typography';
import { colorWithAlpha } from '../../src/design/colorAlpha';

/**
 * Standard iOS-style floating Liquid Glass tab bar.
 * Keeps the app's original stroke SVG icons; only the bar chrome is Liquid Glass.
 */

const SPRING = { damping: 26, stiffness: 320, mass: 0.85 };

const FLOATING_MARGIN_H = 16;
const FLOATING_MARGIN_BOTTOM = 12;
const BAR_HEIGHT = 78;
const PILL_RADIUS = BAR_HEIGHT / 2;
const TAB_PAD_H = 4;
const ICON_SIZE = 26;
const SELECTION_INSET_V = 8;
const SELECTION_INSET_H = 4;

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

const HubIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0"
      stroke={color}
      strokeWidth={2}
      fill={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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

function selectionLeft(index: number, tabWidth: number) {
  'worklet';
  return TAB_PAD_H + index * tabWidth + SELECTION_INSET_H;
}

interface LiquidGlassTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export const LiquidGlassTabBar: React.FC<LiquidGlassTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const { theme } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const useNativeLiquidGlass = useMemo(() => canUseNativeLiquidGlass(), []);

  const currentRoute = state.routes[state.index];
  const currentOptions = currentRoute ? descriptors[currentRoute.key]?.options : undefined;
  const tabBarHidden = currentOptions?.tabBarStyle?.display === 'none';

  const tabCount = state.routes.length;
  const barWidth = Math.min(windowWidth - FLOATING_MARGIN_H * 2, 420);
  const innerWidth = barWidth - TAB_PAD_H * 2;
  const tabWidth = tabCount > 0 ? innerWidth / tabCount : 0;
  const selectionWidth = Math.max(0, tabWidth - SELECTION_INSET_H * 2);
  const selectionHeight = BAR_HEIGHT - SELECTION_INSET_V * 2;
  const selectionRadius = selectionHeight / 2;

  const selectionX = useSharedValue(selectionLeft(state.index, tabWidth));

  React.useEffect(() => {
    selectionX.value = withSpring(selectionLeft(state.index, tabWidth), SPRING);
  }, [state.index, tabWidth, selectionX]);

  const selectionStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: selectionX.value }],
  }));

  const goToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= tabCount) return;
      const route = state.routes[index];
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!event.defaultPrevented) {
        void Haptics.selectionAsync();
        navigation.navigate(route.name);
      }
    },
    [navigation, state.routes, tabCount]
  );

  if (tabBarHidden) {
    return null;
  }

  const glassColorScheme = (theme.isDark ? 'dark' : 'light') as 'dark' | 'light';
  // Tint only — never put opacity < 1 on GlassView / its parents (Apple / Expo docs).
  const barTint = theme.isDark
    ? colorWithAlpha(theme.colors.primary.main, 0.22)
    : colorWithAlpha(theme.colors.primary.light, 0.42);
  const selectionFill = theme.isDark
    ? colorWithAlpha(theme.colors.primary.main, 0.28)
    : colorWithAlpha(theme.colors.background.primary, 0.55);
  const bottomPadding = Math.max(insets.bottom, 8) + FLOATING_MARGIN_BOTTOM;

  const tabsContent = (
    <View style={styles.tabsRow}>
      <Animated.View
        style={[
          styles.selection,
          {
            width: selectionWidth,
            height: selectionHeight,
            borderRadius: selectionRadius,
            top: SELECTION_INSET_V,
            backgroundColor: selectionFill,
            borderColor: theme.isDark
              ? colorWithAlpha(theme.colors.text.inverse, 0.22)
              : colorWithAlpha(theme.colors.background.primary, 0.8),
          },
          selectionStyle,
        ]}
        pointerEvents="none"
      />

      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = String(options?.tabBarLabel ?? route.name);
        const focused = state.index === index;
        const color = focused ? theme.colors.primary.dark : theme.colors.text.secondary;
        const IconComponent = TAB_ICONS[route.name] || HomeIcon;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={label}
            onPress={() => goToIndex(index)}
            style={[styles.tab, { width: tabWidth }]}
          >
            <IconComponent color={color} size={ICON_SIZE} />
            <Text
              style={[
                styles.label,
                {
                  color,
                  fontFamily: focused ? fonts.body.semibold : fonts.body.medium,
                },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  // Expo Go / SDK 58: GlassView is in Expo Go, but real Liquid Glass only on iOS 26+.
  // Put tabs INSIDE GlassView (docs / MiniPlayer pattern). Do not clip GlassView with overflow:hidden.
  const chrome = useNativeLiquidGlass ? (
    <GlassView
      style={[styles.chrome, { width: barWidth, borderRadius: PILL_RADIUS }]}
      glassEffectStyle="regular"
      colorScheme={glassColorScheme}
      tintColor={barTint}
      isInteractive
    >
      {tabsContent}
    </GlassView>
  ) : Platform.OS !== 'web' ? (
    <BlurView
      intensity={theme.isDark ? 55 : 48}
      tint={theme.isDark ? 'dark' : 'extraLight'}
      style={[
        styles.chrome,
        {
          width: barWidth,
          borderRadius: PILL_RADIUS,
          overflow: 'hidden',
          backgroundColor: theme.isDark
            ? colorWithAlpha(theme.colors.primary.main, 0.18)
            : colorWithAlpha(theme.colors.primary.light, 0.45),
        },
      ]}
    >
      {tabsContent}
    </BlurView>
  ) : (
    <View
      style={[
        styles.chrome,
        {
          width: barWidth,
          borderRadius: PILL_RADIUS,
          backgroundColor: theme.isDark
            ? colorWithAlpha(theme.colors.background.secondary, 0.92)
            : colorWithAlpha(theme.colors.primary.light, 0.92),
        },
      ]}
    >
      {tabsContent}
    </View>
  );

  return (
    <View style={[styles.outer, { paddingBottom: bottomPadding }]} pointerEvents="box-none">
      <View style={[styles.barShadow, { width: barWidth, borderRadius: PILL_RADIUS }]}>
        {chrome}
      </View>
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
      alignItems: 'center' as const,
      paddingHorizontal: FLOATING_MARGIN_H,
    },
    // Shadow lives outside GlassView — clipping / opacity on GlassView parents kills liquid glass.
    barShadow: {
      shadowColor: theme.colors.shadow.dark,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: theme.isDark ? 0.4 : 0.14,
      shadowRadius: 24,
      elevation: 14,
      backgroundColor: 'transparent',
    },
    chrome: {
      height: BAR_HEIGHT,
      justifyContent: 'center' as const,
    },
    tabsRow: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: TAB_PAD_H,
    },
    selection: {
      position: 'absolute' as const,
      left: 0,
      borderWidth: StyleSheet.hairlineWidth,
    },
    tab: {
      height: BAR_HEIGHT,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 3,
      zIndex: 2,
    },
    label: {
      fontSize: 12,
      lineHeight: 14,
      letterSpacing: 0.1,
      includeFontPadding: false,
      textAlign: 'center' as const,
    },
  };
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(() => StyleSheet.create(createTabBarStyles(theme)), [theme]);
}
