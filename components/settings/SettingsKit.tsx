/**
 * Shared presentation helpers for Settings, reminder, and Tehillim forms.
 * Token-only styling. Springs for press feedback. Haptics on toggles and picks.
 */

import React, { type ReactNode } from 'react';
import {
  View,
  Text,
  Pressable,
  Switch,
  Modal,
  Platform,
  KeyboardAvoidingView,
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/design/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const MIN_TARGET = 44;
const SPRING = { damping: 18, stiffness: 280 };

/* -------------------------------------------------------------------------- */
/* PressableScale                                                             */
/* -------------------------------------------------------------------------- */

export interface PressableScaleProps {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  haptic?: 'selection' | 'light' | 'none';
  pressedScale?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'radio' | 'checkbox' | 'switch';
  accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean };
  hitSlop?: number;
}

/** Pressable with a spring scale and optional haptic. */
export function PressableScale({
  onPress,
  onLongPress,
  disabled = false,
  haptic = 'selection',
  pressedScale = 0.97,
  style,
  children,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  hitSlop,
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={() => {
        if (disabled || !onPress) return;
        if (haptic === 'selection') void Haptics.selectionAsync();
        else if (haptic === 'light') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onLongPress={onLongPress}
      onPressIn={() => {
        if (!disabled) scale.value = withSpring(pressedScale, SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING);
      }}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState ?? { disabled }}
      style={[animated, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

/* -------------------------------------------------------------------------- */
/* SettingSwitch                                                              */
/* -------------------------------------------------------------------------- */

export interface SettingSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function SettingSwitch({ value, onValueChange, disabled, accessibilityLabel }: SettingSwitchProps) {
  const { theme } = useTheme();
  return (
    <Switch
      value={value}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      onValueChange={(next) => {
        void Haptics.selectionAsync();
        onValueChange(next);
      }}
      trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.main }}
      thumbColor={theme.colors.background.primary}
      ios_backgroundColor={theme.colors.neutral[300]}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Hairline                                                                   */
/* -------------------------------------------------------------------------- */

export function Hairline({ inset = true }: { inset?: boolean }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.neutral[300],
        marginLeft: inset ? theme.tokens.spacing.md : 0,
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* ToggleRow                                                                  */
/* -------------------------------------------------------------------------- */

export interface ToggleRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Nested detail rows (shown under the toggle, separated by a hairline). */
  children?: ReactNode;
  /** Extra control rendered before the switch (e.g. time value). */
  trailingExtra?: ReactNode;
  /** Optional leading slot (icon, chevron). */
  leading?: ReactNode;
  onPressTitle?: () => void;
}

/** Row with a trailing switch. Meant to live as a direct child of `Section`. */
export function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
  children,
  trailingExtra,
  leading,
  onPressTitle,
}: ToggleRowProps) {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;

  const text = (
    <View style={styles.flexMin}>
      <Text style={[type.textStyles.body, { color: theme.colors.text.primary }]}>{title}</Text>
      {subtitle ? (
        <Text
          style={[
            type.textStyles.caption,
            { color: theme.colors.text.secondary, marginTop: spacing['2xs'] },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: MIN_TARGET + spacing.sm,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          gap: spacing.sm,
        }}
      >
        {leading}
        {onPressTitle ? (
          <PressableScale
            onPress={onPressTitle}
            pressedScale={0.99}
            style={styles.flexMin}
            accessibilityLabel={title}
          >
            {text}
          </PressableScale>
        ) : (
          text
        )}
        {trailingExtra}
        <SettingSwitch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          accessibilityLabel={title}
        />
      </View>
      {children ? (
        <View>
          <Hairline />
          {children}
        </View>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* ValueRow                                                                   */
/* -------------------------------------------------------------------------- */

export interface ValueRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  /** Indent as a nested row under a toggle. */
  nested?: boolean;
  /** Plain explanatory line (no press). */
  note?: boolean;
  trailing?: ReactNode;
}

/** Label on the left, current value on the right, chevron when it opens a picker. */
export function ValueRow({ label, value, onPress, nested = false, note = false, trailing }: ValueRowProps) {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;

  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: MIN_TARGET,
        paddingVertical: spacing.sm,
        paddingLeft: nested ? spacing.lg : spacing.md,
        paddingRight: spacing.md,
        gap: spacing.sm,
      }}
    >
      <Text
        style={[
          note ? type.textStyles.bodySmall : type.textStyles.body,
          { flex: 1, color: note ? theme.colors.text.secondary : theme.colors.text.primary },
        ]}
      >
        {label}
      </Text>
      {value ? (
        <Text style={[type.textStyles.body, { color: theme.colors.primary.dark }]}>{value}</Text>
      ) : null}
      {trailing}
      {onPress ? (
        <Ionicons name="chevron-forward" size={type.fontSize.base} color={theme.colors.text.tertiary} />
      ) : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <PressableScale onPress={onPress} pressedScale={0.99} accessibilityLabel={`${label} ${value ?? ''}`.trim()}>
      {body}
    </PressableScale>
  );
}

/* -------------------------------------------------------------------------- */
/* CheckRow                                                                   */
/* -------------------------------------------------------------------------- */

export interface CheckRowProps {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  titleStyle?: StyleProp<TextStyle>;
}

/** Single-choice row with a trailing checkmark (inset-grouped list pattern). */
export function CheckRow({ title, subtitle, selected, onPress, titleStyle }: CheckRowProps) {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.99}
      accessibilityRole="radio"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: MIN_TARGET + spacing.sm,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          gap: spacing.sm,
        }}
      >
        <View style={styles.flexMin}>
          <Text
            style={[
              type.textStyles.body,
              { color: theme.colors.text.primary },
              selected ? { fontFamily: type.fonts.body.semibold } : null,
              titleStyle,
            ]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                type.textStyles.caption,
                { color: theme.colors.text.secondary, marginTop: spacing['2xs'] },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={{ width: spacing.lg, alignItems: 'center' }}>
          {selected ? (
            <Ionicons name="checkmark" size={type.fontSize.xl} color={theme.colors.primary.dark} />
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

/* -------------------------------------------------------------------------- */
/* IconButton / TextAction / RoundToggle                                      */
/* -------------------------------------------------------------------------- */

export interface IconButtonProps {
  name: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  tone?: 'default' | 'primary' | 'danger' | 'muted';
  disabled?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ name, label, onPress, tone = 'default', disabled, size, style }: IconButtonProps) {
  const { theme } = useTheme();
  const color =
    tone === 'primary'
      ? theme.colors.primary.dark
      : tone === 'danger'
        ? theme.colors.semantic.error
        : tone === 'muted'
          ? theme.colors.text.tertiary
          : theme.colors.text.primary;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={[{ width: MIN_TARGET, height: MIN_TARGET, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Ionicons name={name} size={size ?? theme.tokens.type.fontSize.xl} color={color} />
    </PressableScale>
  );
}

export interface TextActionProps {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'danger' | 'muted';
  disabled?: boolean;
  align?: 'flex-start' | 'center' | 'flex-end';
  style?: StyleProp<ViewStyle>;
}

/** Quiet text button with a 44pt target. */
export function TextAction({ label, onPress, tone = 'primary', disabled, align = 'flex-start', style }: TextActionProps) {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  const color =
    tone === 'danger'
      ? theme.colors.semantic.error
      : tone === 'muted'
        ? theme.colors.text.secondary
        : theme.colors.primary.dark;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={[
        {
          minHeight: MIN_TARGET,
          justifyContent: 'center',
          alignSelf: align,
          paddingHorizontal: spacing.sm,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <Text style={[type.textStyles.label, { color, fontSize: type.fontSize.base }]}>{label}</Text>
    </PressableScale>
  );
}

export interface RoundToggleProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  size?: number;
}

/** Compact circular toggle (day-of-week). */
export function RoundToggle({ label, selected, onPress, size = MIN_TARGET }: RoundToggleProps) {
  const { theme } = useTheme();
  const { type } = theme.tokens;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? theme.colors.primary.main : theme.colors.background.primary,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: selected ? theme.colors.primary.main : theme.colors.neutral[300],
      }}
    >
      <Text
        style={[
          type.textStyles.caption,
          {
            fontFamily: type.fonts.body.medium,
            color: selected ? theme.colors.text.inverse : theme.colors.text.primary,
          },
        ]}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

/* -------------------------------------------------------------------------- */
/* SheetModal                                                                 */
/* -------------------------------------------------------------------------- */

export interface SheetModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Right-hand header action (for example Save). */
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  /** `page` is a native pageSheet on iOS and a tall sheet elsewhere. `compact` hugs its content. */
  variant?: 'page' | 'compact';
  children: ReactNode;
}

/**
 * Modal with an explicit Cancel on the left, title in the middle, optional action on the right.
 * Back button / swipe-down both call `onClose`.
 */
export function SheetModal({
  visible,
  title,
  onClose,
  actionLabel,
  onAction,
  actionDisabled,
  variant = 'compact',
  children,
}: SheetModalProps) {
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const isPageSheetIOS = Platform.OS === 'ios' && variant === 'page';

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: MIN_TARGET,
        marginBottom: spacing.sm,
      }}
    >
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        <TextAction label="Cancel" tone="muted" onPress={onClose} style={{ paddingHorizontal: 0 }} />
      </View>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={[type.textStyles.bodyBold, { color: theme.colors.text.primary, flex: 2, textAlign: 'center' }]}
      >
        {title}
      </Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        {actionLabel && onAction ? (
          <TextAction
            label={actionLabel}
            onPress={onAction}
            disabled={actionDisabled}
            align="flex-end"
            style={{ paddingHorizontal: 0 }}
          />
        ) : null}
      </View>
    </View>
  );

  if (isPageSheetIOS) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.background.secondary,
            paddingHorizontal: spacing.gutter,
            paddingTop: spacing.sm,
            paddingBottom: insets.bottom + spacing.md,
          }}
        >
          {header}
          {children}
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.shadow.dark }]}
          onPress={onClose}
          accessibilityLabel="Dismiss"
          accessibilityRole="button"
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              backgroundColor: theme.colors.background.secondary,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              paddingHorizontal: spacing.gutter,
              paddingTop: spacing.sm,
              paddingBottom: insets.bottom + spacing.md,
              maxHeight: height * (variant === 'page' ? 0.92 : 0.85),
              minHeight: variant === 'page' ? height * 0.7 : undefined,
            }}
          >
            {header}
            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flexMin: { flex: 1, minWidth: 0 },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
});
