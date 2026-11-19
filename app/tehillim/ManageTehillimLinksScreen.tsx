/**
 * Manage shared Tehillim links you created or joined: open, share, leave, or delete.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, Alert, Platform, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen, Section, ListRow, EmptyState } from '../../components/ui';
import { PracticeHeader, InlineError } from '../../components/hub/PracticeKit';
import { IconButton, TextAction } from '../../components/settings/SettingsKit';
import { useTheme } from '../../src/design/theme';
import { getAnonymousId } from '../../src/analytics/IdentityService';
import {
  listMyTehillimCampaigns,
  leaveTehillimCampaign,
  deleteTehillimCampaign,
  type TehillimCampaign,
} from '../../src/api/tehillimApi';
import { LEGAL } from '../../src/legal/links';

function campaignLink(id: string): string {
  return `${LEGAL.site}/tehillim/${id}`;
}

export const ManageTehillimLinksScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  const [campaigns, setCampaigns] = useState<TehillimCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const pid = await getAnonymousId();
      const { campaigns: list } = await listMyTehillimCampaigns(pid);
      setCampaigns(list || []);
    } catch (e: any) {
      setCampaigns([]);
      setError(e?.message || 'Could not load your links.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleShare = async (c: TehillimCampaign) => {
    const link = c.link || campaignLink(c.id);
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(link);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Copied', 'Link copied to clipboard.');
      } else {
        await Share.share({
          message: link,
          title: c.title ? `Shared Tehillim: ${c.title}` : 'Shared Tehillim link',
        });
      }
    } catch {
      Alert.alert('Error', 'Could not share the link.');
    }
  };

  const handleLeave = (c: TehillimCampaign) => {
    Alert.alert(
      'Remove from your list?',
      `Remove "${c.title || 'Shared Tehillim'}" from your shared pages? Your completed perakim stay on that page. You can rejoin with the link.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const pid = await getAnonymousId();
              await leaveTehillimCampaign(c.id, pid);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await load();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Could not remove from your list');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (c: TehillimCampaign) => {
    Alert.alert(
      'Delete Tehillim page?',
      `Permanently delete "${c.title || 'Shared Tehillim'}"? Everyone will lose access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const pid = await getAnonymousId();
              await deleteTehillimCampaign(c.id, pid);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await load();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Could not delete');
            }
          },
        },
      ]
    );
  };

  const visibleCampaigns = useMemo(
    () => campaigns.filter((c) => !c.is_hidden || c.is_creator),
    [campaigns],
  );
  const screenState = loading && campaigns.length === 0 ? 'loading' : error && campaigns.length === 0 ? 'error' : 'ready';

  return (
    <Screen
      scroll
      bottomExtra={spacing['2xl']}
      state={screenState}
      errorMessage={error ?? undefined}
      onRetry={() => {
        setLoading(true);
        void load();
      }}
      header={
        <PracticeHeader
          title="Manage my links"
          subtitle="Pages you created or joined"
          onBack={() => navigation.goBack()}
        />
      }
    >
      {error && visibleCampaigns.length > 0 ? <InlineError message={error} /> : null}

      {visibleCampaigns.length === 0 && !loading && !error ? (
        <EmptyState
          title="No shared links yet"
          message="Create a Tehillim page or join one with a link."
        />
      ) : visibleCampaigns.length > 0 ? (
        <Section
          title="Your links"
          footer="Remove keeps your completed perakim on the page. Delete permanently removes a page you created."
        >
          {visibleCampaigns.map((c) => {
            const deadlineStr = c.deadline
              ? new Date(c.deadline).toLocaleDateString(undefined, { dateStyle: 'short' })
              : null;
            const subtitle = [
              c.is_creator ? 'Created by you' : 'Joined',
              c.type === 'split' ? 'Split and claim' : 'Shared completion',
              c.reason,
              deadlineStr ? `By ${deadlineStr}` : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <ListRow
                key={c.id}
                title={c.title || 'Shared Tehillim'}
                subtitle={subtitle}
                onPress={() =>
                  (navigation as any).navigate('SharedTehillimView' as never, { campaignId: c.id } as never)
                }
                trailing={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <IconButton
                      name="share-outline"
                      label={`Share ${c.title || 'Shared Tehillim'}`}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        void handleShare(c);
                      }}
                    />
                    <IconButton
                      name={c.is_creator ? 'trash-outline' : 'exit-outline'}
                      label={
                        c.is_creator
                          ? `Delete ${c.title || 'Shared Tehillim'}`
                          : `Remove ${c.title || 'Shared Tehillim'} from your list`
                      }
                      tone="danger"
                      onPress={() => (c.is_creator ? handleDelete(c) : handleLeave(c))}
                    />
                  </View>
                }
              />
            );
          })}
        </Section>
      ) : null}

      <Section>
        <ListRow
          title="Make your Tehillim page"
          subtitle="Create a new shared link"
          leading={<Ionicons name="people-outline" size={type.fontSize.xl} color={theme.colors.primary.dark} />}
          showChevron
          onPress={() => (navigation as any).navigate('CreateSharedTehillim' as never)}
        />
      </Section>

      <TextAction
        label="Back to Tehillim"
        tone="muted"
        align="center"
        onPress={() => (navigation as any).navigate('TehillimList' as never)}
      />
    </Screen>
  );
};
