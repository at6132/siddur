import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '../../components/ui/BackButton';
import { spacing } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';

export const ComingSoonScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const styles = useStyles();
  const title = (route.params as { featureTitle?: string } | undefined)?.featureTitle;

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.backgroundGradient} style={StyleSheet.absoluteFill} />
      <View style={styles.inner}>
        <BackButton onPress={() => navigation.goBack()} style={styles.back} />
        <View style={styles.card}>
          <Text style={styles.headline}>Coming soon</Text>
          {title ? <Text style={styles.sub}>{title}</Text> : null}
          <Text style={styles.hint}>This part of the app is not available yet.</Text>
        </View>
      </View>
    </View>
  );
};

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    inner: {
      flex: 1,
      paddingTop: spacing.safeTopInset,
      paddingHorizontal: spacing.lg,
    },
    back: {
      marginBottom: spacing.md,
    },
    card: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: spacing['2xl'],
      opacity: 0.85,
    },
    headline: {
      fontFamily: fonts.heading.bold,
      fontSize: 26,
      color: theme.colors.text.primary,
      marginBottom: spacing.sm,
    },
    sub: {
      fontFamily: fonts.body.medium,
      fontSize: 16,
      color: theme.colors.text.secondary,
      marginBottom: spacing.md,
    },
    hint: {
      fontFamily: fonts.body.regular,
      fontSize: 15,
      color: theme.colors.text.tertiary,
      textAlign: 'center',
      maxWidth: 280,
      lineHeight: 22,
    },
  });
}

function useStyles() {
  const { theme } = useTheme();
  return React.useMemo(() => createStyles(theme), [theme]);
}
