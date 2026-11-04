/**
 * Shared reader toolbar: text size (A− / A+) and English on/off.
 * Session-only controls — do not persist to app settings.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';
import type { DisplayPreferences } from '../../src/types/preferences';

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
  showEnglish: _showEnglish,
  onShowEnglishChange: _onShowEnglishChange,
  showEnglishToggle = true,
}: ReaderToolbarProps) {
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;

  const bumpSize = (dir: -1 | 1) => {
    const i = TEXT_SIZES.indexOf(textSize);
    const next = TEXT_SIZES[i + dir];
    if (!next) return;
    void Haptics.selectionAsync();
    onTextSizeChange(next);
  };

  return (
    <View style={styles.row}>
      <View style={[styles.textSizeRow, { gap: spacing['2xs'] }]}>
        <Pressable
          style={[
            styles.textSizeButton,
            {
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.sm,
              borderRadius: radii.md,
              backgroundColor: theme.isDark
                ? colorWithAlpha(theme.colors.text.inverse, 0.12)
                : colorWithAlpha(theme.colors.text.primary, 0.06),
              opacity: textSize === 'xsmall' ? 0.4 : 1,
              minWidth: 44,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
          onPress={() => bumpSize(-1)}
          disabled={textSize === 'xsmall'}
          accessibilityLabel="Decrease text size"
        >
          <Text
            style={[
              type.textStyles.label,
              { color: theme.colors.text.primary, fontSize: type.fontSize.base },
            ]}
          >
            A-
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.textSizeButton,
            {
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.sm,
              borderRadius: radii.md,
              backgroundColor: theme.isDark
                ? colorWithAlpha(theme.colors.text.inverse, 0.12)
                : colorWithAlpha(theme.colors.text.primary, 0.06),
              opacity: textSize === 'large' ? 0.4 : 1,
              minWidth: 44,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
          onPress={() => bumpSize(1)}
          disabled={textSize === 'large'}
          accessibilityLabel="Increase text size"
        >
          <Text
            style={[
              type.textStyles.label,
              { color: theme.colors.text.primary, fontSize: type.fontSize.base },
            ]}
          >
            A+
          </Text>
        </Pressable>
      </View>
      {showEnglishToggle && (
        <View style={[styles.englishRow, { gap: spacing.sm }]}>
          <Text
            style={[
              type.textStyles.label,
              { color: theme.colors.text.secondary, fontSize: type.fontSize.sm },
            ]}
          >
            English
          </Text>
          <Switch
            value={false}
            onValueChange={() => {
              void Haptics.selectionAsync();
              Alert.alert(
                'Coming Soon',
                'English translations will be available in a future update.',
              );
            }}
            trackColor={{
              false: theme.colors.neutral[300],
              true: theme.colors.primary.light,
            }}
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  textSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textSizeButton: {},
  englishRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
