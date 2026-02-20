/**
 * Shared reader toolbar: text size (A− / A+) and English on/off.
 * Session-only controls — do not persist to app settings.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { useTheme } from '../../src/design/theme';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import type { DisplayPreferences } from '../../src/types/preferences';
import type { AppTheme } from '../../src/design/theme';

const TEXT_SIZES: DisplayPreferences['textSize'][] = ['xsmall', 'small', 'medium', 'large'];

export interface ReaderToolbarProps {
  textSize: DisplayPreferences['textSize'];
  onTextSizeChange: (size: DisplayPreferences['textSize']) => void;
  showEnglish: boolean;
  onShowEnglishChange: (show: boolean) => void;
  /** Hide English toggle when content has no English (e.g. Hebrew-only source). */
  showEnglishToggle?: boolean;
}

export function ReaderToolbar({
  textSize,
  onTextSizeChange,
  showEnglish,
  onShowEnglishChange,
  showEnglishToggle = true,
}: ReaderToolbarProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.row}>
      <View style={styles.textSizeRow}>
        <TouchableOpacity
          style={[styles.textSizeButton, textSize === 'xsmall' && styles.textSizeButtonDisabled]}
          onPress={() => {
            const i = TEXT_SIZES.indexOf(textSize);
            if (i > 0) onTextSizeChange(TEXT_SIZES[i - 1]);
          }}
          disabled={textSize === 'xsmall'}
        >
          <Text style={styles.textSizeButtonLabel}>A−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.textSizeButton, textSize === 'large' && styles.textSizeButtonDisabled]}
          onPress={() => {
            const i = TEXT_SIZES.indexOf(textSize);
            if (i < TEXT_SIZES.length - 1) onTextSizeChange(TEXT_SIZES[i + 1]);
          }}
          disabled={textSize === 'large'}
        >
          <Text style={styles.textSizeButtonLabel}>A+</Text>
        </TouchableOpacity>
      </View>
      {showEnglishToggle && (
        <View style={styles.englishRow}>
          <Text style={styles.englishLabel}>English</Text>
          <Switch
            value={false}
            onValueChange={() => Alert.alert('Coming Soon', 'English translations will be available in a future update.')}
            trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary?.light ?? '#ccc' }}
            thumbColor={theme.colors.neutral[400]}
          />
        </View>
      )}
    </View>
  );
}

export const HEBREW_FONT_SIZES: Record<DisplayPreferences['textSize'], number> = {
  xsmall: 15,
  small: 18,
  medium: 22,
  large: 26,
};
export const HEBREW_LINE_HEIGHTS: Record<DisplayPreferences['textSize'], number> = {
  xsmall: 26,
  small: 32,
  medium: 40,
  large: 48,
};

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    textSizeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    textSizeButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: borderRadius.md,
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
    },
    textSizeButtonDisabled: {
      opacity: 0.4,
    },
    textSizeButtonLabel: {
      fontFamily: fonts.body.semiBold,
      fontSize: 16,
      color: theme.colors.text.primary,
    },
    englishRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    englishLabel: {
      fontFamily: fonts.body.medium,
      fontSize: 14,
      color: theme.colors.text.secondary,
    },
  });
}
