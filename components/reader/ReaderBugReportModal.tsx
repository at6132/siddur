/**
 * Sheet for flagging hard-to-read / incorrect / missing prayer text.
 * Shows the attached area screenshot and an optional note.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/design/theme';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { Chip } from '../ui/Chip';
import { SheetModal } from '../settings/SettingsKit';
import {
  submitContentBug,
  type ContentBugCategory,
} from '../../src/api/contentBugApi';
import type { ReaderBugReportMeta } from './useReaderBugReport';
import type { AppTheme } from '../../src/design/theme';

const CATEGORIES: { id: ContentBugCategory; label: string }[] = [
  { id: 'hard_to_read', label: 'Hard to read' },
  { id: 'incorrect', label: 'Incorrect' },
  { id: 'missing', label: 'Missing' },
  { id: 'other', label: 'Other' },
];

export interface ReaderBugReportModalProps {
  visible: boolean;
  onClose: () => void;
  meta: ReaderBugReportMeta;
  /** file:// or data URI preview, or null if capture failed */
  screenshotUri: string | null;
  /** raw base64 (no data: prefix) for upload */
  screenshotBase64: string | null;
  capturing: boolean;
}

export function ReaderBugReportModal({
  visible,
  onClose,
  meta,
  screenshotUri,
  screenshotBase64,
  capturing,
}: ReaderBugReportModalProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [category, setCategory] = useState<ContentBugCategory>('hard_to_read');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCategory('hard_to_read');
      setNote('');
      setError(null);
      setDone(false);
      setSubmitting(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (submitting || capturing || done) return;
    setSubmitting(true);
    setError(null);
    try {
      let appVersion: string | null = null;
      try {
        const { default: Constants } = await import('expo-constants');
        appVersion = Constants.expoConfig?.version ?? null;
      } catch {}
      await submitContentBug({
        source: meta.source,
        title: meta.title,
        context: meta.context,
        category,
        note: note.trim(),
        screenshot_base64: screenshotBase64,
        screenshot_mime: screenshotBase64 ? 'image/jpeg' : null,
        app_version: appVersion,
        platform: Platform.OS,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
      setTimeout(onClose, 900);
    } catch (e: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e?.message || 'Could not send the report.');
      setSubmitting(false);
    }
  };

  return (
    <SheetModal
      visible={visible}
      title="Report a problem"
      onClose={onClose}
      actionLabel={done ? 'Sent' : submitting ? 'Sending…' : 'Send'}
      onAction={handleSubmit}
      actionDisabled={submitting || capturing || done}
      variant="page"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
      >
        {done ? (
          <Text style={styles.doneText}>Thanks. We will review this area of the text.</Text>
        ) : (
          <>
            <Text style={styles.metaLine} numberOfLines={2}>
              {meta.title}
              {meta.context ? ` · ${meta.context}` : ''}
            </Text>

            <Text style={styles.label}>What is wrong?</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.id}
                  label={c.label}
                  selected={category === c.id}
                  onPress={() => setCategory(c.id)}
                />
              ))}
            </View>

            <Text style={styles.label}>Screenshot of this area</Text>
            <View style={styles.shotBox}>
              {capturing ? (
                <ActivityIndicator color={theme.colors.primary.main} />
              ) : screenshotUri ? (
                <Image source={{ uri: screenshotUri }} style={styles.shot} resizeMode="contain" />
              ) : (
                <Text style={styles.shotFallback}>
                  Screenshot unavailable. You can still send a note.
                </Text>
              )}
            </View>

            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="Describe the issue…"
              placeholderTextColor={theme.colors.text.tertiary}
              multiline
              textAlignVertical="top"
              maxLength={2000}
              editable={!submitting}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        )}
      </ScrollView>
    </SheetModal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    body: {
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    metaLine: {
      fontFamily: fonts.body.regular,
      fontSize: 13,
      color: theme.colors.text.secondary,
      marginBottom: spacing.sm,
    },
    label: {
      fontFamily: fonts.body.semibold,
      fontSize: 14,
      color: theme.colors.text.primary,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    shotBox: {
      minHeight: 160,
      maxHeight: 280,
      borderRadius: borderRadius.md,
      backgroundColor: theme.colors.background.primary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.neutral[300],
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      padding: spacing.sm,
    },
    shot: {
      width: '100%',
      height: 240,
    },
    shotFallback: {
      fontFamily: fonts.body.regular,
      fontSize: 14,
      color: theme.colors.text.tertiary,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
    },
    input: {
      minHeight: 96,
      borderRadius: borderRadius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.neutral[300],
      backgroundColor: theme.colors.background.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontFamily: fonts.body.regular,
      fontSize: 16,
      color: theme.colors.text.primary,
    },
    error: {
      fontFamily: fonts.body.regular,
      fontSize: 14,
      color: theme.colors.semantic.error,
      marginTop: spacing.sm,
    },
    doneText: {
      fontFamily: fonts.body.semibold,
      fontSize: 16,
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginTop: spacing.xl,
    },
  });
}
