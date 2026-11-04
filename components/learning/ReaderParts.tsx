/**
 * Shared presentation for Sefaria-backed text readers (Gemara, Nach, Mishna,
 * Rambam, Chumash). Presentation only: callers own fetching and pagination.
 */

import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';

const MIN_TARGET = 44;

/** Style set shared by every learning reader. Hebrew body size comes from the user's text-size preference. */
export function createReaderStyles(theme: AppTheme) {
  const { spacing, radii, type, hebrew } = theme.tokens;
  return StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    content: {
      paddingHorizontal: spacing.gutter,
    },
    /** Text body. Flat on the screen gradient, no card chrome. */
    card: {
      marginBottom: spacing.lg,
    },
    hebrewBlock: {
      fontFamily: hebrew.fonts.regular,
      fontSize: type.fontSize.xl,
      lineHeight: type.fontSize.xl * type.lineHeight.loose,
      letterSpacing: 0,
      color: theme.colors.text.primary,
      marginBottom: spacing.md,
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    englishBlock: {
      fontFamily: type.fonts.body.regular,
      fontSize: type.fontSize.base,
      lineHeight: type.fontSize.base * type.lineHeight.relaxed,
      color: theme.colors.text.secondary,
      marginBottom: spacing.sm,
      textAlign: 'left',
    },
    attribution: {
      ...type.textStyles.caption,
      color: theme.colors.text.tertiary,
      marginTop: spacing.lg,
      textAlign: 'left',
    },
    amudSectionHeader: {
      fontFamily: hebrew.fonts.semibold,
      fontSize: type.fontSize.lg,
      letterSpacing: 0,
      color: theme.colors.text.primary,
      marginBottom: spacing.md,
      textAlign: 'center',
      writingDirection: 'rtl',
    },
    sectionDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.neutral[300],
      marginVertical: spacing.lg,
    },
    smBlock: {
      marginBottom: spacing.md,
    },
    smProgressBar: {
      height: spacing.xs,
      backgroundColor: colorWithAlpha(theme.colors.text.primary, theme.isDark ? 0.2 : 0.08),
      borderRadius: radii.full,
      overflow: 'hidden',
      marginTop: spacing.sm,
    },
    smProgressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary.main,
      borderRadius: radii.full,
    },
    smProgressLabel: {
      ...type.textStyles.caption,
      color: theme.colors.text.tertiary,
      marginTop: spacing['2xs'],
    },
  });
}

interface NavRowProps {
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Prev / Next row. Next sits on the left, Prev on the right to follow Hebrew page order. */
export function ReaderNavRow({ onNext, onPrev, hasNext, hasPrev }: NavRowProps) {
  const { theme } = useTheme();
  const { spacing } = theme.tokens;
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        direction: 'ltr',
        marginBottom: spacing.md,
      }}
    >
      <NavButton label="Next" icon="chevron-back" iconFirst onPress={onNext} disabled={!hasNext} />
      <NavButton label="Prev" icon="chevron-forward" onPress={onPrev} disabled={!hasPrev} />
    </View>
  );
}

function NavButton({
  label,
  icon,
  iconFirst = false,
  onPress,
  disabled,
}: {
  label: string;
  icon: 'chevron-back' | 'chevron-forward';
  iconFirst?: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;
  const color = theme.colors.primary.main;
  const glyph = <Ionicons name={icon} size={type.fontSize.base} color={color} />;

  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: MIN_TARGET,
        paddingHorizontal: spacing.md,
        borderRadius: radii.full,
        opacity: disabled ? 0.4 : 1,
        backgroundColor: colorWithAlpha(color, pressed ? 0.2 : 0.1),
      })}
    >
      {iconFirst ? glyph : null}
      <Text
        style={[
          type.textStyles.label,
          { color, marginHorizontal: spacing.xs },
        ]}
      >
        {label}
      </Text>
      {iconFirst ? null : glyph}
    </Pressable>
  );
}

export function ReaderLoading({ label }: { label: string }) {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  return (
    <View style={{ padding: spacing.xl, alignItems: 'center' }}>
      <ActivityIndicator size="large" color={theme.colors.primary.main} />
      <Text
        style={[
          type.textStyles.bodySmall,
          { color: theme.colors.text.tertiary, marginTop: spacing.md },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function ReaderMessage({ message, children }: { message: string; children?: React.ReactNode }) {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  return (
    <View style={{ padding: spacing.xl, alignItems: 'center' }}>
      <Ionicons
        name="alert-circle-outline"
        size={type.fontSize['3xl']}
        color={theme.colors.text.tertiary}
      />
      <Text
        style={[
          type.textStyles.body,
          { color: theme.colors.text.secondary, marginTop: spacing.sm, textAlign: 'center' },
        ]}
      >
        {message}
      </Text>
      {children}
    </View>
  );
}

interface ActionProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'link';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Light impact haptic for meaningful confirms (mark complete). */
  confirm?: boolean;
}

export function ReaderAction({ label, onPress, variant = 'primary', icon, confirm = false }: ActionProps) {
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;
  const main = theme.colors.primary.main;
  const textColor = variant === 'primary' ? theme.colors.text.inverse : main;

  return (
    <Pressable
      onPress={() => {
        if (confirm) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: MIN_TARGET,
        marginTop: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.lg,
        borderWidth: variant === 'outline' ? StyleSheet.hairlineWidth * 2 : 0,
        borderColor: main,
        backgroundColor: variant === 'primary' ? main : 'transparent',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={type.fontSize.lg}
          color={textColor}
          style={{ marginRight: spacing.sm }}
        />
      ) : null}
      <Text style={[type.textStyles.bodyBold, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

/** Inline confirmation that an action already happened. */
export function ReaderDoneBadge({ label }: { label: string }) {
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: MIN_TARGET,
        marginTop: spacing.lg,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.lg,
        backgroundColor: colorWithAlpha(theme.colors.semantic.success, theme.isDark ? 0.3 : 0.4),
      }}
    >
      <Ionicons
        name="checkmark-circle"
        size={type.fontSize.lg}
        color={theme.colors.text.primary}
        style={{ marginRight: spacing.sm }}
      />
      <Text style={[type.textStyles.bodyBold, { color: theme.colors.text.primary }]}>{label}</Text>
    </View>
  );
}
