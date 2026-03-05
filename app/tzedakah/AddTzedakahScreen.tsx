/**
 * Add Tzedakah – enter amount and organization.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '../../components/ui/BackButton';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { colors } from '../../src/design/colors';
import { TzedakahTracker } from '../../src/storage/TzedakahTracker';

export const AddTzedakahScreen: React.FC = () => {
  const navigation = useNavigation();
  const [amount, setAmount] = useState('');
  const [organization, setOrganization] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const amt = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await TzedakahTracker.addEntry(amt, organization || 'Other');
      (navigation as any).goBack();
    } catch (e) {
      setError('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps={Platform.OS === 'ios' ? 'never' : 'handled'}
          showsVerticalScrollIndicator={false}
        >
          <BackButton onPress={() => navigation.goBack()} style={styles.backRow} />
          <Text style={styles.title}>Add Tzedakah</Text>
          <Text style={styles.subtitle}>Record your donation</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="decimal-pad"
              inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Organization</Text>
            <TextInput
              style={styles.input}
              value={organization}
              onChangeText={setOrganization}
              placeholder="e.g. Chabad, local food bank"
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="words"
              inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
            />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  scroll: {
    padding: spacing.lg,
    paddingTop: spacing.xl + spacing.safeTopInset,
    paddingBottom: 120,
  },
  backRow: { marginBottom: spacing.md },
  backText: { fontFamily: fonts.body.medium, fontSize: 16, color: colors.text.secondary },
  title: { fontFamily: fonts.heading.bold, fontSize: 28, color: colors.text.primary, marginBottom: 4 },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.text.secondary, marginBottom: spacing.xl },
  field: { marginBottom: spacing.lg },
  label: { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.text.primary, marginBottom: spacing.xs },
  input: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text.primary,
  },
  errorText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.semantic?.error || '#c00', marginBottom: spacing.sm },
  saveButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontFamily: fonts.body.semibold, fontSize: 16, color: '#fff' },
});
