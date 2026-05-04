/**
 * Global back button: "← Back" in app primary (pink) color.
 * Use everywhere a back button is needed for consistent UX.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../src/design/theme';
import { spacing } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';

export interface BackButtonProps {
  onPress: () => void;
  /** Label after the arrow, e.g. "Back" or "Back to Hub". Default: "Back" */
  label?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  label = 'Back',
  style,
  textStyle,
}) => {
  const { theme } = useTheme();
  const color = theme.colors.primary.main;

  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, style]} activeOpacity={0.7}>
      <Text style={[styles.text, { color }, textStyle]}>{`← ${label}`}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: fonts.body.medium,
    fontSize: 16,
  },
});
