/**
 * Add Gratitude – enter what you're grateful for. Date defaults to today.
 */

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Screen, GlassButton } from '../../components/ui';
import { PracticeHeader, PracticeField, InlineError } from '../../components/hub/PracticeKit';
import { useTheme } from '../../src/design/theme';
import { GratitudeTracker } from '../../src/storage/GratitudeTracker';

export const AddGratitudeScreen: React.FC = () => {
  const { theme } = useTheme();
  const { spacing } = theme.tokens;
  const navigation = useNavigation();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!text.trim()) {
      setError("Write something you're grateful for.");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await GratitudeTracker.addEntry(text.trim());
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      (navigation as any).goBack();
    } catch (e) {
      setError('Could not save. Try again.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      header={
        <PracticeHeader
          title="Add gratitude"
          subtitle="What are you thankful for today?"
          onBack={() => navigation.goBack()}
        />
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
          keyboardShouldPersistTaps={Platform.OS === 'ios' ? 'never' : 'handled'}
          showsVerticalScrollIndicator={false}
        >
          <PracticeField
            label="Note"
            value={text}
            onChangeText={setText}
            placeholder="e.g. My family, health, a beautiful morning"
            multiline
            numberOfLines={4}
            inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
          />
          {error ? <InlineError message={error} /> : null}
          <GlassButton title="Save" onPress={handleSave} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};
