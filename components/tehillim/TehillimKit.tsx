/**
 * Presentation helpers shared by the Tehillim screens.
 * Token-only styling, spring press feedback, no shadows, no emoji.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';
import { PressableScale } from '../settings/SettingsKit';

export const HEBREW_LETTERS = [
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
  'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ',
  'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל',
  'לא', 'לב', 'לג', 'לד', 'לה', 'לו', 'לז', 'לח', 'לט', 'מ',
  'מא', 'מב', 'מג', 'מד', 'מה', 'מו', 'מז', 'מח', 'מט', 'נ',
  'נא', 'נב', 'נג', 'נד', 'נה', 'נו', 'נז', 'נח', 'נט', 'ס',
  'סא', 'סב', 'סג', 'סד', 'סה', 'סו', 'סז', 'סח', 'סט', 'ע',
  'עא', 'עב', 'עג', 'עד', 'עה', 'עו', 'עז', 'עח', 'עט', 'פ',
  'פא', 'פב', 'פג', 'פד', 'פה', 'פו', 'פז', 'פח', 'פט', 'צ',
  'צא', 'צב', 'צג', 'צד', 'צה', 'צו', 'צז', 'צח', 'צט', 'ק',
  'קא', 'קב', 'קג', 'קד', 'קה', 'קו', 'קז', 'קח', 'קט', 'קי',
  'קיא', 'קיב', 'קיג', 'קיד', 'קטו', 'קטז', 'קיז', 'קיח', 'קיט', 'קכ',
  'קכא', 'קכב', 'קכג', 'קכד', 'קכה', 'קכו', 'קכז', 'קכח', 'קכט', 'קל',
  'קלא', 'קלב', 'קלג', 'קלד', 'קלה', 'קלו', 'קלז', 'קלח', 'קלט', 'קמ',
  'קמא', 'קמב', 'קמג', 'קמד', 'קמה', 'קמו', 'קמז', 'קמח', 'קמט', 'קנ',
];

export const TEHILLIM_COUNT = 150;

export function hebrewNumeral(n: number): string {
  return HEBREW_LETTERS[n - 1] ?? String(n);
}

/* -------------------------------------------------------------------------- */
/* ProgressBar                                                                */
/* -------------------------------------------------------------------------- */

export function ProgressBar({ percent, style }: { percent: number; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  const { radii, spacing } = theme.tokens;
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, percent));
  const progress = useSharedValue(clamped);

  useEffect(() => {
    progress.value = reduceMotion ? clamped : withSpring(clamped, { damping: 20, stiffness: 160 });
  }, [clamped, reduceMotion, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={[
        {
          height: spacing.xs + spacing['2xs'],
          borderRadius: radii.full,
          backgroundColor: theme.colors.neutral[200],
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[{ height: '100%', borderRadius: radii.full, backgroundColor: theme.colors.primary.main }, fillStyle]}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Skeleton                                                                   */
/* -------------------------------------------------------------------------- */

export function Skeleton({ height, width = '100%', style }: { height: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(
      withSequence(withTiming(0.5, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
      false,
    );
  }, [reduceMotion, opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        { height, width, borderRadius: theme.tokens.radii.md, backgroundColor: theme.colors.neutral[200] },
        animated,
        style,
      ]}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* PerekCell                                                                  */
/* -------------------------------------------------------------------------- */

export type PerekCellState =
  | 'default'
  | 'today'
  | 'done'
  | 'claimedMine'
  | 'claimedOther'
  | 'selected';

const STATE_LABEL: Record<PerekCellState, string> = {
  default: '',
  today: ', in today\'s goal',
  done: ', completed',
  claimedMine: ', claimed by you',
  claimedOther: ', claimed by someone else',
  selected: ', selected',
};

export interface PerekCellProps {
  number: number;
  state?: PerekCellState;
  onPress?: () => void;
  disabled?: boolean;
  width: number;
  /** Compact cells (claim sheet) use a square shape and smaller type. */
  compact?: boolean;
}

export const PerekCell = React.memo(function PerekCell({
  number,
  state = 'default',
  onPress,
  disabled,
  width,
  compact = false,
}: PerekCellProps) {
  const { theme } = useTheme();
  const { radii, spacing, type, hebrew } = theme.tokens;
  const c = theme.colors;

  let backgroundColor: string = c.background.primary;
  let borderColor: string = c.neutral[300];
  let numeralColor: string = c.text.primary;
  let metaColor: string = c.text.tertiary;
  let borderWidth = StyleSheet.hairlineWidth;

  switch (state) {
    case 'today':
      backgroundColor = colorWithAlpha(c.primary.main, 0.18);
      borderColor = c.primary.main;
      borderWidth = StyleSheet.hairlineWidth * 4;
      break;
    case 'done':
      backgroundColor = colorWithAlpha(c.semantic.success, 0.28);
      borderColor = colorWithAlpha(c.semantic.success, 0.6);
      break;
    case 'claimedMine':
      backgroundColor = colorWithAlpha(c.primary.main, 0.22);
      borderColor = colorWithAlpha(c.primary.main, 0.6);
      break;
    case 'claimedOther':
      backgroundColor = c.neutral[200];
      numeralColor = c.text.tertiary;
      break;
    case 'selected':
      backgroundColor = c.primary.main;
      borderColor = c.primary.main;
      numeralColor = c.text.inverse;
      metaColor = c.text.inverse;
      break;
  }

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || !onPress}
      pressedScale={0.95}
      accessibilityLabel={`Perek ${number}${STATE_LABEL[state]}`}
      accessibilityState={{ disabled: disabled || !onPress, selected: state === 'selected' }}
      style={{
        width,
        height: compact ? width : width * 0.95,
        borderRadius: compact ? radii.md : radii.lg,
        backgroundColor,
        borderColor,
        borderWidth,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: hebrew.fonts.semibold,
          fontSize: compact ? type.fontSize.sm : type.fontSize['2xl'],
          color: numeralColor,
          writingDirection: 'rtl',
          textAlign: 'center',
        }}
      >
        {hebrewNumeral(number)}
      </Text>
      <Text
        style={[
          type.textStyles.caption,
          { color: metaColor, marginTop: spacing['2xs'], fontSize: compact ? type.fontSize.xs - 3 : type.fontSize.xs },
        ]}
      >
        {number}
      </Text>
      {state === 'done' && !compact ? (
        <View style={{ position: 'absolute', top: spacing.xs, left: spacing.xs }}>
          <Ionicons name="checkmark-circle" size={type.fontSize.base} color={c.semantic.success} />
        </View>
      ) : null}
    </PressableScale>
  );
});
