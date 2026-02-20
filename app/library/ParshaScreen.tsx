/**
 * Parsha Screen – Daily parsha page (placeholder for now).
 * Will show parsha content; coming soon.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableOpacity } from 'react-native';
import { useTheme } from '../../src/design/theme';
import { BackButton } from '../../components/ui/BackButton';
import { spacing } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';

export const ParshaScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={theme.backgroundGradient} style={StyleSheet.absoluteFill} />
      <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
      <View style={styles.content}>
        <Text style={styles.title}>Parsha</Text>
        <Text style={styles.placeholder}>Coming soon</Text>
      </View>
    </View>
  );
};

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    backButton: { padding: spacing.md },
    backText: {
      fontFamily: fonts.body.medium,
      fontSize: 16,
      color: theme.colors.text.secondary,
    },
    content: {
      flex: 1,
      padding: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: fonts.heading.bold,
      fontSize: 24,
      color: theme.colors.text.primary,
      marginBottom: spacing.md,
    },
    placeholder: {
      fontFamily: fonts.body.regular,
      fontSize: 16,
      color: theme.colors.text.tertiary,
    },
  });
}
