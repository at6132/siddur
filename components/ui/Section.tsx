import React, { type ReactNode, Children, isValidElement, Fragment } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../src/design/theme';

export interface SectionProps {
  title?: string;
  /** Trailing control on the title row (for example a small plus). */
  titleRight?: ReactNode;
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** When false, skip hairline separators between rows (default true). */
  separators?: boolean;
}

/**
 * Grouped inset section — title + rows with hairlines.
 * Prefer this over stacked white shadowed cards.
 */
export function Section({ title, titleRight, footer, children, style, separators = true }: SectionProps) {
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;
  const items = Children.toArray(children).filter(Boolean);

  return (
    <View style={[{ marginBottom: spacing.lg }, style]}>
      {title || titleRight ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.sm,
            marginHorizontal: spacing.sm,
            minHeight: titleRight ? 44 : undefined,
          }}
        >
          {title ? (
            <Text
              style={[
                type.textStyles.caption,
                {
                  color: theme.colors.text.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: type.letterSpacing.wider,
                  flex: 1,
                  flexShrink: 1,
                },
              ]}
            >
              {title}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {titleRight}
        </View>
      ) : null}

      <View
        style={{
          backgroundColor: theme.colors.background.primary,
          borderRadius: radii.lg,
          overflow: 'hidden',
        }}
      >
        {items.map((child, index) => (
          <Fragment key={index}>
            {child}
            {separators && index < items.length - 1 ? (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.colors.neutral[300],
                  marginLeft: spacing.md,
                }}
              />
            ) : null}
          </Fragment>
        ))}
      </View>

      {footer ? (
        <Text
          style={[
            type.textStyles.caption,
            {
              color: theme.colors.text.tertiary,
              marginTop: spacing.sm,
              marginHorizontal: spacing.sm,
            },
          ]}
        >
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

/** Helper: skip invalid children without runtime cost in callers. */
export function isSectionChild(node: ReactNode): boolean {
  return isValidElement(node);
}
