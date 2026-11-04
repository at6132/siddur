/**
 * Small presentation helpers shared by the Hub / practice screens.
 * Token-only styling; no gradients, no shadows, no emoji.
 */

import React, { type ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BackButton } from '../ui/BackButton';
import { useTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';

const MIN_TARGET = 44;

export interface PracticeHeaderProps {
  title?: string;
  subtitle?: string;
  /** When set, shows the global back button. */
  onBack?: () => void;
  backLabel?: string;
  /** Optional trailing action (for example a small GlassButton). */
  action?: ReactNode;
}

/** Back row + title block for the `header` slot of `Screen`. */
export function PracticeHeader({ title, subtitle, onBack, backLabel, action }: PracticeHeaderProps) {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;

  return (
    <View style={{ paddingBottom: spacing.md }}>
      {onBack || action ? (
        <View style={[styles.topRow, { minHeight: MIN_TARGET }]}>
          {onBack ? <BackButton onPress={onBack} label={backLabel} /> : <View />}
          {action}
        </View>
      ) : null}
      {title ? (
        <Text
          accessibilityRole="header"
          style={[
            type.textStyles.h2,
            { color: theme.colors.text.primary, marginTop: onBack || action ? spacing.xs : 0 },
          ]}
        >
          {title}
        </Text>
      ) : null}
      {subtitle ? (
        <Text
          style={[
            type.textStyles.body,
            { color: theme.colors.text.secondary, marginTop: spacing.xs },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/** Uppercase caption that matches `Section` titles, for groups that are not rows (chips, fields). */
export function GroupLabel({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  return (
    <View style={[{ marginBottom: spacing.sm, marginHorizontal: spacing.sm }, style]}>
      <Text
        style={[
          type.textStyles.caption,
          {
            color: theme.colors.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: type.letterSpacing.wider,
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

export interface PracticeFieldProps extends TextInputProps {
  label: string;
}

/** Labeled text input using theme tokens. */
export function PracticeField({ label, style, multiline, ...inputProps }: PracticeFieldProps) {
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <GroupLabel>{label}</GroupLabel>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.text.tertiary}
        multiline={multiline}
        style={[
          {
            backgroundColor: theme.colors.background.primary,
            borderColor: theme.colors.neutral[300],
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: radii.lg,
            color: theme.colors.text.primary,
            fontFamily: type.fonts.body.regular,
            fontSize: type.fontSize.base,
            minHeight: MIN_TARGET,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + spacing['2xs'],
          },
          multiline
            ? { minHeight: spacing['3xl'] * 2, textAlignVertical: 'top' as const }
            : null,
          style,
        ]}
        {...inputProps}
      />
    </View>
  );
}

/** Soft inline error (brand semantic error tint, primary text for contrast). */
export function InlineError({ message }: { message: string }) {
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: colorWithAlpha(theme.colors.semantic.error, 0.22),
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginBottom: spacing.md,
      }}
    >
      <Text style={[type.textStyles.bodySmall, { color: theme.colors.text.primary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
