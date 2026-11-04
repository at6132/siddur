/**
 * Add Tzedakah – enter amount and organization.
 */

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Screen, GlassButton } from '../../components/ui';
import { PracticeHeader, PracticeField, InlineError } from '../../components/hub/PracticeKit';
import { useTheme } from '../../src/design/theme';
import { TzedakahTracker } from '../../src/storage/TzedakahTracker';

export const AddTzedakahScreen: React.FC = () => {
  const { theme } = useTheme();
  const { spacing } = theme.tokens;
  const navigation = useNavigation();
  const [amount, setAmount] = useState('');
  const [organization, setOrganization] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const amt = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Please enter a valid amount.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await TzedakahTracker.addEntry(amt, organization || 'Other');
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
          title="Add tzedakah"
          subtitle="Record your donation"
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
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
          />
          <PracticeField
            label="Organization"
            value={organization}
            onChangeText={setOrganization}
            placeholder="e.g. Chabad, local food bank"
            autoCapitalize="words"
            inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
          />
          {error ? <InlineError message={error} /> : null}
          <GlassButton title="Save" onPress={handleSave} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};
