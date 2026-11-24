/**
 * Eruv detail – status, area, and links to official sources.
 * One primary action: open the official status source when available.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, Linking } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Screen, Section, ListRow, GlassButton } from '../../components/ui';
import { PracticeHeader } from '../../components/hub/PracticeKit';
import { EruvStatusChip } from '../../components/hub/EruvStatusChip';
import { useTheme } from '../../src/design/theme';
import { fetchEruvById, type EruvListing } from '../../src/api/eruvApi';

type EruvDetailParams = {
  EruvDetail: { eruvId: string };
};

function formatUpdatedAt(raw: string | null): string {
  if (!raw) return '————';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.trim();
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function openUrl(url: string) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Linking.openURL(url);
  } catch (e) {
    console.warn('Eruv link open error:', e);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

export const EruvDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  const navigation = useNavigation();
  const route = useRoute<RouteProp<EruvDetailParams, 'EruvDetail'>>();
  const eruvId = route.params?.eruvId ?? '';

  const [eruv, setEruv] = useState<EruvListing | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const load = useCallback(async () => {
    if (!eruvId) {
      setEruv(null);
      setLoadState('empty');
      return;
    }
    setLoadState('loading');
    try {
      const next = await fetchEruvById(eruvId);
      setEruv(next);
      setErrorMessage(undefined);
      setLoadState(next ? 'ready' : 'empty');
    } catch (e) {
      console.warn('Eruv detail load error:', e);
      setErrorMessage('Could not load this eruv. Try again.');
      setLoadState('error');
    }
  }, [eruvId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openStatusSource = () => {
    if (!eruv?.statusSourceUrl) return;
    void openUrl(eruv.statusSourceUrl);
  };

  const callHotline = () => {
    if (!eruv?.statusHotline) return;
    const digits = eruv.statusHotline.replace(/[^\d+]/g, '');
    if (!digits) return;
    void openUrl(`tel:${digits}`);
  };

  const openMap = () => {
    if (!eruv?.mapUrl) return;
    void openUrl(eruv.mapUrl);
  };

  return (
    <Screen
      scroll
      state={loadState}
      emptyTitle="Eruv not found"
      emptyMessage="This listing may have been removed or is not available yet."
      errorMessage={errorMessage}
      onRetry={() => {
        void load();
      }}
      bottomExtra={spacing['3xl'] + spacing.lg}
      header={
        <PracticeHeader
          title={eruv?.name ?? 'Eruv'}
          subtitle={
            eruv ? `${eruv.city}, ${eruv.state}` : 'Area status and sources'
          }
          onBack={() => navigation.goBack()}
          backLabel="Back to list"
        />
      }
    >
      {eruv ? (
        <>
          <Section title="Status">
            <ListRow
              title="Current status"
              trailing={<EruvStatusChip status={eruv.status} />}
            />
            <ListRow
              title="Last updated"
              subtitle={formatUpdatedAt(eruv.statusUpdatedAt)}
            />
            <ListRow title="Covered area" subtitle={eruv.areaLabel} />
          </Section>

          <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
            {eruv.statusSourceUrl ? (
              <GlassButton
                title="Open official status"
                variant="primary"
                onPress={openStatusSource}
              />
            ) : null}
            {eruv.statusHotline ? (
              <GlassButton
                title={`Call hotline (${eruv.statusHotline})`}
                variant="secondary"
                onPress={callHotline}
              />
            ) : null}
            {eruv.mapUrl ? (
              <GlassButton title="Open map" variant="secondary" onPress={openMap} />
            ) : null}
            {!eruv.statusSourceUrl && !eruv.statusHotline && !eruv.mapUrl ? (
              <Text
                style={[
                  type.textStyles.body,
                  { color: theme.colors.text.secondary },
                ]}
              >
                No official links are listed for this eruv yet.
              </Text>
            ) : null}
          </View>

          <Section title="Important" footer="Speak to your local rabbi first.">
            <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.md }}>
              <Text style={[type.textStyles.body, { color: theme.colors.text.primary }]}>
                Speak to your local rabbi first. Status in this app is informational only.
                Confirm with the official eruv source before carrying on Shabbos. Boundaries
                and conditions can change.
              </Text>
            </View>
          </Section>
        </>
      ) : null}
    </Screen>
  );
};
