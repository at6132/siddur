import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BackButton } from '../../components/ui/BackButton';
import { Screen } from '../../components/ui/Screen';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTheme } from '../../src/design/theme';

export const ComingSoonScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  const title = (route.params as { featureTitle?: string } | undefined)?.featureTitle;

  return (
    <Screen
      header={
        <View style={{ marginBottom: spacing.md }}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
      }
      bottomExtra={spacing['2xl']}
    >
      <EmptyState
        title="Coming soon"
        message={
          title
            ? `${title} is not available yet.`
            : 'This part of the app is not available yet.'
        }
        action={
          title ? (
            <Text
              style={[
                type.textStyles.caption,
                { color: theme.colors.text.tertiary, textAlign: 'center', marginTop: spacing.sm },
              ]}
            >
              Check back after the next update.
            </Text>
          ) : null
        }
      />
    </Screen>
  );
};
