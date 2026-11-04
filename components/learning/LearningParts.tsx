/**
 * Shared presentation for the gated learning screens (Gemara, Nach, Mishna,
 * Rambam, Chumash, Pirkei Avos). Presentation only: callers own navigation and data.
 */

import React, { type ReactNode } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../ui/Screen';
import { BackButton } from '../ui/BackButton';
import { EmptyState } from '../ui/EmptyState';
import { useTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const MIN_TARGET = 44;

/** Which brand accent tints the "Yomi" action. Resolved from theme tokens only. */
export type YomiTint = 'lavender' | 'sage' | 'primary' | 'gold' | 'secondary';

export interface YomiAction {
  title: string;
  subtitle: string;
  icon: IconName;
  tint: YomiTint;
  onPress: () => void;
}

interface HeaderProps {
  title: string;
  /** Secondary Hebrew title shown under an English title. */
  titleHebrew?: string;
  /** When true, the title itself is Hebrew (right aligned, Hebrew face). */
  titleIsHebrew?: boolean;
  subtitle?: string;
  subtitleIsHebrew?: boolean;
}

export function LearningHeader({
  title,
  titleHebrew,
  titleIsHebrew = false,
  subtitle,
  subtitleIsHebrew = false,
}: HeaderProps) {
  const { theme } = useTheme();
  const { spacing, type, hebrew } = theme.tokens;

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text
        style={[
          titleIsHebrew
            ? {
                fontFamily: hebrew.fonts.bold,
                fontSize: type.fontSize['3xl'],
                lineHeight: type.fontSize['3xl'] * type.lineHeight.snug,
                ...hebrew.layout,
                letterSpacing: 0,
              }
            : type.textStyles.h2,
          { color: theme.colors.text.primary },
        ]}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {titleHebrew ? (
        <Text
          style={[
            {
              fontFamily: hebrew.fonts.regular,
              fontSize: type.fontSize.lg,
              marginTop: spacing.xs,
              letterSpacing: 0,
              color: theme.colors.text.tertiary,
            },
          ]}
        >
          {titleHebrew}
        </Text>
      ) : null}
      {subtitle ? (
        <Text
          style={[
            subtitleIsHebrew
              ? { fontFamily: hebrew.fonts.regular, fontSize: type.fontSize.sm, ...hebrew.layout, letterSpacing: 0 }
              : type.textStyles.bodySmall,
            { color: theme.colors.text.secondary, marginTop: spacing.xs },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function tintColor(theme: ReturnType<typeof useTheme>['theme'], tint: YomiTint): string {
  switch (tint) {
    case 'lavender':
      return theme.colors.accent.lavender;
    case 'sage':
      return theme.colors.accent.sage;
    case 'gold':
      return theme.colors.accent.gold;
    case 'secondary':
      return theme.colors.secondary.main;
    case 'primary':
    default:
      return theme.colors.primary.main;
  }
}

/** Single featured action ("Open today's daf"). One per screen. */
export function YomiActionRow({ title, subtitle, icon, tint, onPress }: YomiAction) {
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const base = tintColor(theme, tint);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 18, stiffness: 280 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 280 });
      }}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={[
        animatedStyle,
        {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: MIN_TARGET + spacing.lg,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          borderRadius: radii.lg,
          backgroundColor: colorWithAlpha(base, theme.isDark ? 0.22 : 0.32),
          marginTop: spacing.sm,
          marginBottom: spacing.lg,
        },
      ]}
    >
      <Ionicons name={icon} size={type.fontSize['2xl']} color={theme.colors.text.primary} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={[type.textStyles.h4, { color: theme.colors.text.primary }]}>{title}</Text>
        <Text style={[type.textStyles.bodySmall, { color: theme.colors.text.secondary }]}>
          {subtitle}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={type.fontSize.lg}
        color={theme.colors.text.secondary}
      />
    </AnimatedPressable>
  );
}

interface IndexRowProps {
  hebrew: string;
  detail?: string;
  /** Hebrew detail (e.g. "12 פרקים") or Latin detail. */
  detailIsHebrew?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

/** Full-bleed list row: Hebrew name on the start edge (right), detail + chevron on the end. */
export function HebrewIndexRow({
  hebrew,
  detail,
  detailIsHebrew = false,
  onPress,
  accessibilityLabel,
}: IndexRowProps) {
  const { theme } = useTheme();
  const { spacing, type, hebrew: heb } = theme.tokens;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (detail ? `${hebrew}, ${detail}` : hebrew)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: MIN_TARGET + spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        backgroundColor: pressed ? colorWithAlpha(theme.colors.primary.main, 0.12) : 'transparent',
      })}
    >
      <Ionicons name="chevron-back" size={type.fontSize.base} color={theme.colors.text.tertiary} />
      {detail ? (
        <Text
          style={[
            detailIsHebrew
              ? { fontFamily: heb.fonts.regular, fontSize: type.fontSize.sm, letterSpacing: 0 }
              : type.textStyles.bodySmall,
            { color: theme.colors.text.secondary, marginLeft: spacing.sm },
          ]}
        >
          {detail}
        </Text>
      ) : null}
      <Text
        style={{
          flex: 1,
          marginLeft: spacing.md,
          fontFamily: heb.fonts.medium,
          fontSize: type.fontSize.lg,
          lineHeight: type.fontSize.lg * type.lineHeight.snug,
          letterSpacing: 0,
          color: theme.colors.text.primary,
          ...heb.layout,
        }}
        numberOfLines={1}
      >
        {hebrew}
      </Text>
    </Pressable>
  );
}

export interface PickerItem {
  key: string;
  label: string;
  onPress: () => void;
}

/** Compact numbered cell for daf / perek / chapter pickers. */
export function PickerCell({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();
  const { spacing, radii, type, hebrew } = theme.tokens;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        minHeight: MIN_TARGET + spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xs,
        borderRadius: radii.md,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: theme.colors.neutral[300],
        backgroundColor: pressed
          ? colorWithAlpha(theme.colors.primary.main, 0.2)
          : colorWithAlpha(theme.colors.background.primary, theme.isDark ? 0.5 : 0.7),
      })}
    >
      <Text
        style={{
          fontFamily: hebrew.fonts.semibold,
          fontSize: type.fontSize.sm,
          letterSpacing: 0,
          color: theme.colors.text.primary,
          textAlign: 'center',
          writingDirection: 'rtl',
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Hairline() {
  const { theme } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.neutral[300],
        marginHorizontal: theme.tokens.spacing.xs,
      }}
    />
  );
}

function BackHeader({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: theme.tokens.spacing.sm }}>
      <BackButton onPress={onBack} />
    </View>
  );
}

interface IndexProps<T> extends HeaderProps {
  onBack: () => void;
  yomi?: YomiAction;
  /** Extra content between the header and the list (e.g. Shneyim Mikra progress). */
  topContent?: ReactNode;
  /** Hebrew section label above the list (e.g. "מסכתות"). */
  sectionLabel?: string;
  data: readonly T[];
  keyExtractor: (item: T) => string;
  getHebrew: (item: T) => string;
  getDetail?: (item: T) => string | undefined;
  detailIsHebrew?: boolean;
  onSelect: (item: T) => void;
}

/** Browse list screen: header, optional Yomi action, grouped hairline list. */
export function LearningIndex<T>({
  onBack,
  yomi,
  topContent,
  sectionLabel,
  data,
  keyExtractor,
  getHebrew,
  getDetail,
  detailIsHebrew = false,
  onSelect,
  ...headerProps
}: IndexProps<T>) {
  const { theme } = useTheme();
  const { spacing, type, hebrew } = theme.tokens;

  const listHeader = (
    <View>
      <LearningHeader {...headerProps} />
      {yomi ? <YomiActionRow {...yomi} /> : null}
      {topContent}
      {sectionLabel ? (
        <Text
          style={{
            fontFamily: hebrew.fonts.semibold,
            fontSize: type.fontSize.base,
            letterSpacing: 0,
            color: theme.colors.text.secondary,
            marginBottom: spacing.xs,
            marginHorizontal: spacing.xs,
            ...hebrew.layout,
          }}
        >
          {sectionLabel}
        </Text>
      ) : null}
      <Hairline />
    </View>
  );

  return (
    <Screen header={<BackHeader onBack={onBack} />}>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={Hairline}
        renderItem={({ item }) => (
          <HebrewIndexRow
            hebrew={getHebrew(item)}
            detail={getDetail?.(item)}
            detailIsHebrew={detailIsHebrew}
            onPress={() => onSelect(item)}
          />
        )}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

interface PickerProps extends HeaderProps {
  onBack: () => void;
  items: readonly PickerItem[];
  numColumns?: number;
}

/** Numbered picker (dapim, perakim, chapters) as a virtualized grid. */
export function LearningPicker({ onBack, items, numColumns = 4, ...headerProps }: PickerProps) {
  const { theme } = useTheme();
  const { spacing } = theme.tokens;
  const cellWidth = `${100 / numColumns}%` as const;

  return (
    <Screen header={<BackHeader onBack={onBack} />}>
      <FlatList
        data={items}
        key={`cols-${numColumns}`}
        numColumns={numColumns}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={<LearningHeader {...headerProps} />}
        renderItem={({ item }) => (
          <View style={{ width: cellWidth, padding: spacing.xs }}>
            <PickerCell label={item.label} onPress={item.onPress} />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        columnWrapperStyle={numColumns > 1 ? { marginHorizontal: -spacing.xs } : undefined}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

/** Route param did not resolve to known content. */
export function LearningNotFound({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <Screen header={<BackHeader onBack={onBack} />}>
      <EmptyState title={title} message="Go back and choose again." />
    </Screen>
  );
}
