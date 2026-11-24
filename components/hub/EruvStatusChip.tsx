/**
 * Compact status pill for eruv rows and detail. Token colors only.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';
import type { EruvStatus } from '../../src/api/eruvApi';

const STATUS_LABEL: Record<EruvStatus, string> = {
  up: 'Up',
  down: 'Down',
  unknown: 'Unknown',
  awaiting: 'Awaiting',
};

export function eruvStatusLabel(status: EruvStatus): string {
  return STATUS_LABEL[status];
}

/** Map / chip tone from theme semantic tokens. */
export function eruvStatusTone(
  status: EruvStatus,
  colors: {
    semantic: { success: string; error: string; warning: string };
    neutral: Record<number | string, string>;
  },
): string {
  if (status === 'up') return colors.semantic.success;
  if (status === 'down') return colors.semantic.error;
  if (status === 'awaiting') return colors.semantic.warning;
  return colors.neutral[400];
}

export function EruvStatusChip({ status }: { status: EruvStatus }) {
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;

  const tone = eruvStatusTone(status, theme.colors);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Status ${STATUS_LABEL[status]}`}
      style={[
        styles.chip,
        {
          backgroundColor: colorWithAlpha(tone, 0.28),
          borderRadius: radii.full,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing['2xs'],
          minHeight: 28,
        },
      ]}
    >
      <Text
        style={[
          type.textStyles.caption,
          {
            color: theme.colors.text.primary,
            fontFamily: type.fonts.body.semibold,
          },
        ]}
      >
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});
