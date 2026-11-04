/**
 * Parsha Screen – Daily parsha page (placeholder for now).
 * Will show parsha content; coming soon.
 */

import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BackButton } from '../../components/ui/BackButton';
import { Screen } from '../../components/ui/Screen';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTheme } from '../../src/design/theme';

export const ParshaScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { spacing } = theme.tokens;

  return (
    <Screen
      header={
        <View style={{ marginBottom: spacing.md }}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
      }
    >
      <EmptyState title="Parsha" message="Coming soon" />
    </Screen>
  );
};
