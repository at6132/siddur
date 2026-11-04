import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Screen, GlassButton } from '../../components/ui';
import { useTheme } from '../../src/design/theme';

interface WelcomeScreenProps {
  onStart: () => void;
}

const HEART_SIZE = 64;

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;

  return (
    <Screen>
      <View style={styles.center}>
        <Animated.View entering={ZoomIn.springify().damping(14)}>
          <Ionicons name="heart" size={HEART_SIZE} color={theme.colors.primary.main} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify().damping(18)}>
          <Text
            style={[
              type.textStyles.h1,
              {
                color: theme.colors.text.primary,
                textAlign: 'center',
                marginTop: spacing.lg,
                marginBottom: spacing.md,
              },
            ]}
          >
            You're all set
          </Text>
          <Text
            style={[
              type.textStyles.bodyLarge,
              { color: theme.colors.text.secondary, textAlign: 'center' },
            ]}
          >
            {"We'll take care of the timing.\nYou just show up."}
          </Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(240).springify().damping(18)}>
        <GlassButton title="Let's Begin" size="lg" onPress={onStart} />
      </Animated.View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
