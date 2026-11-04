/**
 * Create a shared Tehillim campaign: choose type (split vs shared), title, reason, optional deadline.
 * On success shows shareable link with copy button.
 */
import React, { useState } from 'react';
import { View, Text, Platform, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen, Section, ListRow, GlassButton } from '../../components/ui';
import { PracticeHeader, PracticeField, InlineError } from '../../components/hub/PracticeKit';
import { CheckRow, SheetModal, TextAction } from '../../components/settings/SettingsKit';
import { useTheme } from '../../src/design/theme';
import { createTehillimCampaign, parseCampaignIdFromLink } from '../../src/api/tehillimApi';
import { getAnonymousId } from '../../src/analytics/IdentityService';

type CampaignType = 'split' | 'shared';

export const CreateSharedTehillimScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  const [campaignType, setCampaignType] = useState<CampaignType>('shared');
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinLinkInput, setJoinLinkInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const iosDone = Platform.OS === 'ios' ? 'globalDone' : undefined;

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const createdBy = await getAnonymousId();
      const res = await createTehillimCampaign({
        type: campaignType,
        title: title.trim() || 'Shared Tehillim',
        reason: reason.trim() || '',
        deadline: deadline.trim() ? new Date(deadline.trim()).toISOString() : null,
        created_by: createdBy,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreatedLink(res.campaign.link || null);
    } catch (e: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e?.message || 'Could not create campaign. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!createdLink) return;
    setError(null);
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(createdLink);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        await Share.share({ message: createdLink, title: 'Shared Tehillim link' });
      }
    } catch (_) {
      setError('Could not copy the link.');
    }
  };

  const handleJoinWithLink = () => {
    const id = parseCampaignIdFromLink(joinLinkInput);
    if (!id) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setJoinError('Paste the full link you received, for example https://siddur24seven.com/tehillim/abc12xyz');
      return;
    }
    setJoinModalVisible(false);
    setJoinLinkInput('');
    setJoinError(null);
    (navigation as any).navigate('SharedTehillimView' as never, { campaignId: id } as never);
  };

  const closeJoin = () => {
    setJoinModalVisible(false);
    setJoinError(null);
  };

  if (createdLink) {
    return (
      <Screen
        scroll
        header={
          <PracticeHeader
            title="Share your Tehillim page"
            subtitle="Anyone with this link can join"
            onBack={() => navigation.goBack()}
          />
        }
      >
        <Section title="Link">
          <View style={{ padding: spacing.md }}>
            <Text selectable style={[type.textStyles.body, { color: theme.colors.text.primary }]}>
              {createdLink}
            </Text>
          </View>
        </Section>
        {error ? <InlineError message={error} /> : null}
        <GlassButton title={copied ? 'Copied' : 'Copy or share'} onPress={handleCopy} />
        <TextAction label="Done" tone="muted" align="center" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      bottomExtra={spacing['2xl']}
      header={
        <PracticeHeader
          title="Make your Tehillim page"
          subtitle="Create a shared page others can join"
          onBack={() => navigation.goBack()}
        />
      }
    >
      <Section>
        <ListRow
          title="I have a link"
          subtitle="Join a shared page"
          leading={<Ionicons name="link" size={type.fontSize.xl} color={theme.colors.primary.dark} />}
          showChevron
          onPress={() => setJoinModalVisible(true)}
        />
      </Section>

      <Section title="Type">
        <CheckRow
          title="Split and claim"
          subtitle="Participants claim sections (e.g. perakim 1 to 10). Each perek is claimed by one person."
          selected={campaignType === 'split'}
          onPress={() => setCampaignType('split')}
        />
        <CheckRow
          title="Shared completion"
          subtitle="Everyone completes perakim in any order. No claiming. Mark complete when done."
          selected={campaignType === 'shared'}
          onPress={() => setCampaignType('shared')}
        />
      </Section>

      <PracticeField
        label="Name (optional)"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Refuah for Sarah"
        inputAccessoryViewID={iosDone}
      />
      <PracticeField
        label="Reason (optional)"
        value={reason}
        onChangeText={setReason}
        placeholder="e.g. Refuah sheleima"
        multiline
        inputAccessoryViewID={iosDone}
      />
      <PracticeField
        label="Deadline (optional)"
        value={deadline}
        onChangeText={setDeadline}
        placeholder="e.g. 2025-03-15 or leave blank"
        inputAccessoryViewID={iosDone}
      />

      {error ? <InlineError message={error} /> : null}

      <GlassButton title="Create and get link" onPress={handleCreate} loading={loading} disabled={loading} />

      <SheetModal
        visible={joinModalVisible}
        title="Join with link"
        onClose={closeJoin}
        actionLabel="Open"
        onAction={handleJoinWithLink}
      >
        <Text style={[type.textStyles.bodySmall, { color: theme.colors.text.secondary, marginBottom: spacing.md }]}>
          Paste the link you received.
        </Text>
        {joinError ? <InlineError message={joinError} /> : null}
        <PracticeField
          label="Link"
          value={joinLinkInput}
          onChangeText={setJoinLinkInput}
          placeholder="https://siddur24seven.com/tehillim/..."
          autoCapitalize="none"
          autoCorrect={false}
          inputAccessoryViewID={iosDone}
        />
      </SheetModal>
    </Screen>
  );
};
