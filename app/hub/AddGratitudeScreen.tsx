/**
 * Add Gratitude – enter what you're grateful for. Date defaults to today.
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
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '../../components/ui/BackButton';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { colors } from '../../src/design/colors';
import { DEFAULT_SCREEN_BACKGROUND } from '../../src/design/screenGradient';
import { GratitudeTracker } from '../../src/storage/GratitudeTracker';

export const AddGratitudeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!text.trim()) {
      setError("Write something you're grateful for.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await GratitudeTracker.addEntry(text.trim());
      (navigation as any).goBack();
    } catch (e) {
      setError('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[...DEFAULT_SCREEN_BACKGROUND]} style={StyleSheet.absoluteFill} />
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
          <Text style={styles.title}>Add gratitude</Text>
          <Text style={styles.subtitle}>What are you thankful for today?</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Note</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={text}
              onChangeText={setText}
              placeholder="e.g. My family, health, a beautiful morning…"
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={4}
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
  },
  backRow: { marginBottom: spacing.md },
  backText: { fontFamily: fonts.body.medium, fontSize: 16, color: colors.text.secondary },
  title: { fontFamily: fonts.heading.bold, fontSize: 28, color: colors.text.primary, marginBottom: 4 },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.text.secondary, marginBottom: spacing.lg },
  field: { marginBottom: spacing.lg },
  label: { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.text.secondary, marginBottom: spacing.sm },
  input: {
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  inputMultiline: { minHeight: 120, textAlignVertical: 'top' },
  errorText: { fontFamily: fonts.body.regular, fontSize: 14, color: '#c62828', marginBottom: spacing.md },
  saveButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontFamily: fonts.body.semibold, fontSize: 16, color: '#fff' },
});
