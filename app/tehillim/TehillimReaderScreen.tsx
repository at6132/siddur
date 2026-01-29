import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors } from '../../src/design/colors';
import { spacing } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Placeholder Tehillim text - in production, this would come from a proper source
const getTehillimText = (psalm: number): string => {
  return `Tehillim ${psalm}\n\n[Hebrew text would go here]\n\n[English translation would go here]`;
};

export const TehillimReaderScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const psalm = (route.params as any)?.psalm || 1;
  const [text, setText] = useState(getTehillimText(psalm));

  useEffect(() => {
    navigation.setOptions({
      title: `Tehillim ${psalm}`,
    });
  }, [psalm, navigation]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={100}>
          <GlassPanel padding="xl" borderRadius="2xl" style={styles.panel}>
            <Text style={[textStyles.h2, styles.title]}>
              {psalm}
            </Text>
            <Text style={[textStyles.bodyLarge, styles.text]}>
              {text}
            </Text>
          </GlassPanel>
        </FadeIn>
      </ScrollView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  panel: {
    minHeight: SCREEN_WIDTH * 0.8,
  },
  title: {
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  text: {
    color: colors.text.primary,
    lineHeight: 28,
    textAlign: 'left',
  },
});
