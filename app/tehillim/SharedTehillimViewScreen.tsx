/**
 * View a shared Tehillim campaign: header (title, reason, deadline) + grid of 150 perakim.
 * Split: grey = claimed, green = completed; tap unclaimed to claim range.
 * Shared: tap to open reader; mark complete from reader or from here.
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  TextInput,
  Platform,
  Share,
  Linking,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen, Section, ListRow, Chip, GlassButton } from '../../components/ui';
import { PracticeHeader, InlineError } from '../../components/hub/PracticeKit';
import { IconButton, SheetModal, TextAction } from '../../components/settings/SettingsKit';
import { PerekCell, ProgressBar, type PerekCellState } from '../../components/tehillim/TehillimKit';
import { useTheme } from '../../src/design/theme';
import { getAnonymousId } from '../../src/analytics/IdentityService';
import {
  getTehillimCampaign,
  claimTehillimRange,
  joinTehillimCampaign,
  CampaignDetailResponse,
} from '../../src/api/tehillimApi';
import { LEGAL } from '../../src/legal/links';

const COLS = 4;
const MODAL_COLS = 6;
const ALL_PEREKS = Array.from({ length: 150 }, (_, i) => i + 1);

type PerekState = 'unclaimed' | 'completed' | 'claimed_mine' | 'claimed_other';

const CELL_STATE: Record<PerekState, PerekCellState> = {
  unclaimed: 'default',
  completed: 'done',
  claimed_mine: 'claimedMine',
  claimed_other: 'claimedOther',
};

export const SharedTehillimViewScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;
  const { width: windowWidth } = useWindowDimensions();
  const campaignId = (route.params as any)?.campaignId as string | undefined;
  const [data, setData] = useState<CampaignDetailResponse | null>(null);
  const [participantId, setParticipantId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [selectedPereks, setSelectedPereks] = useState<Set<number>>(new Set());
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const didAutoOpenClaimRef = useRef(false);

  const gap = spacing.sm;
  const gridWidth = windowWidth - spacing.gutter * 2;
  const itemWidth = (gridWidth - gap * (COLS - 1)) / COLS;
  const modalItemWidth = (gridWidth - gap * (MODAL_COLS - 1)) / MODAL_COLS;

  const load = useCallback(async () => {
    if (!campaignId) {
      setError('No campaign ID');
      setLoading(false);
      return;
    }
    const pid = await getAnonymousId();
    setParticipantId(pid);
    try {
      const res = await getTehillimCampaign(campaignId, pid);
      setData(res);
      setError(null);
      try {
        await joinTehillimCampaign(campaignId, pid);
      } catch (_) {}
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const campaign = data?.campaign;
  const isSplit = campaign?.type === 'split';
  const commitments = data?.commitments ?? [];
  const byPerek = data?.byPerek ?? {};
  const commitmentMap = new Map(commitments.map((c) => [c.perek_number, c]));

  const getPerekState = useCallback((n: number): PerekState => {
    if (isSplit) {
      const c = commitmentMap.get(n);
      if (!c) return 'unclaimed';
      if (c.completed_at) return 'completed';
      return c.participant_id === participantId ? 'claimed_mine' : 'claimed_other';
    }
    const mine = byPerek[n];
    if (mine?.completed_at) return 'completed';
    return 'unclaimed';
  }, [isSplit, commitmentMap, participantId, byPerek]);

  const myCommitments = commitments.filter((c) => c.participant_id === participantId);
  const unclaimedCount = isSplit ? 150 - commitments.length : 0;
  const isFirstTimeNoClaims = isSplit && myCommitments.length === 0 && unclaimedCount > 0;

  useEffect(() => {
    if (!data || !isSplit || didAutoOpenClaimRef.current || !isFirstTimeNoClaims) return;
    didAutoOpenClaimRef.current = true;
    setClaimModalOpen(true);
  }, [data, isSplit, isFirstTimeNoClaims]);

  const togglePerekSelection = (n: number) => {
    if (getPerekState(n) !== 'unclaimed') return;
    setSelectedPereks((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const addRangeToSelection = () => {
    const start = parseInt(rangeStart, 10);
    const end = parseInt(rangeEnd, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end > 150 || start > end) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setClaimError('Enter perakim 1 to 150, with the start no higher than the end.');
      return;
    }
    setClaimError(null);
    setSelectedPereks((prev) => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) {
        if (getPerekState(i) === 'unclaimed') next.add(i);
      }
      return next;
    });
    setRangeStart('');
    setRangeEnd('');
  };

  function getContiguousRanges(set: Set<number>): [number, number][] {
    if (set.size === 0) return [];
    const sorted = Array.from(set).sort((a, b) => a - b);
    const ranges: [number, number][] = [];
    let runStart = sorted[0];
    let runEnd = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === runEnd + 1) runEnd = sorted[i];
      else {
        ranges.push([runStart, runEnd]);
        runStart = runEnd = sorted[i];
      }
    }
    ranges.push([runStart, runEnd]);
    return ranges;
  }

  const handleClaimSubmit = async () => {
    const ranges = getContiguousRanges(selectedPereks);
    if (ranges.length === 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setClaimError('Tap perakim or add a range to claim.');
      return;
    }
    setSubmitting(true);
    setClaimError(null);
    try {
      for (const [start, end] of ranges) {
        await claimTehillimRange(campaignId!, start, end, participantId);
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setClaimModalOpen(false);
      setSelectedPereks(new Set());
      await load();
    } catch (e: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setClaimError(e?.message || 'Could not claim');
    } finally {
      setSubmitting(false);
    }
  };

  const openClaimModal = (preselectPerek?: number) => {
    setSelectedPereks(preselectPerek != null && getPerekState(preselectPerek) === 'unclaimed' ? new Set([preselectPerek]) : new Set());
    setRangeStart('');
    setRangeEnd('');
    setClaimError(null);
    setClaimModalOpen(true);
  };

  const completedCount = isSplit
    ? commitments.filter((c) => c.completed_at).length
    : new Set((data?.completions ?? []).map((c) => c.perek_number)).size;
  const percentComplete = Math.round((completedCount / 150) * 100);

  const onPerekPress = (n: number) => {
    const state = getPerekState(n);
    if (isSplit) {
      if (state === 'unclaimed') openClaimModal(n);
      return;
    }
    if (state === 'completed') return;
    (navigation as any).navigate('TehillimReader' as never, { psalm: n, campaignId } as never);
  };

  const backHeader = <PracticeHeader onBack={() => navigation.goBack()} />;

  const gridData = useMemo(() => ALL_PEREKS, []);

  if (!campaignId) {
    return <Screen state="error" errorMessage="Missing campaign ID" header={backHeader} />;
  }

  if (loading) {
    return <Screen state="loading" header={backHeader} />;
  }

  if (error || !data || !campaign) {
    return (
      <Screen
        state="error"
        errorMessage={error || 'Not found'}
        onRetry={() => {
          setLoading(true);
          load();
        }}
        header={backHeader}
      />
    );
  }

  const deadlineStr = campaign.deadline
    ? new Date(campaign.deadline).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : null;

  const shareLink = `${LEGAL.site}/tehillim/${campaignId}`;
  const handleShare = () => {
    Share.share({
      message: shareLink,
      title: campaign.title ? `Shared Tehillim: ${campaign.title}` : 'Shared Tehillim link',
    }).catch(() => {});
  };
  const handleReport = () => {
    Alert.alert(
      'Report this campaign',
      `If this page is abusive or inappropriate, contact support.\n\n${LEGAL.supportUrl}\n${LEGAL.supportPhoneDisplay}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Linking.openURL(LEGAL.supportPhoneTel) },
        { text: 'Open Support', onPress: () => Linking.openURL(LEGAL.supportUrl) },
      ],
    );
  };

  const subtitle = [campaign.reason, deadlineStr ? `By ${deadlineStr}` : null].filter(Boolean).join(' · ');

  const renderCell = ({ item: n }: { item: number }) => {
    const state = getPerekState(n);
    const isUnclaimed = state === 'unclaimed';
    const isCompleted = state === 'completed';
    const isClaimedOther = state === 'claimed_other';
    const onPressCell =
      isSplit && isUnclaimed
        ? () => onPerekPress(n)
        : isSplit && state === 'claimed_mine'
          ? () => (navigation as any).navigate('TehillimReader' as never, { psalm: n, campaignId } as never)
          : !isSplit && !isCompleted
            ? () => onPerekPress(n)
            : undefined;
    return (
      <PerekCell
        number={n}
        width={itemWidth}
        state={CELL_STATE[state]}
        onPress={onPressCell}
        disabled={isClaimedOther || submitting}
      />
    );
  };

  const renderModalCell = ({ item: n }: { item: number }) => {
    const state = getPerekState(n);
    const locked = state !== 'unclaimed';
    return (
      <PerekCell
        compact
        number={n}
        width={modalItemWidth}
        state={locked ? CELL_STATE[state] : selectedPereks.has(n) ? 'selected' : 'default'}
        onPress={locked ? undefined : () => togglePerekSelection(n)}
        disabled={locked}
      />
    );
  };

  const rangeInputStyle = {
    width: spacing['3xl'],
    minHeight: 44,
    textAlign: 'center' as const,
    fontFamily: type.fonts.body.regular,
    fontSize: type.fontSize.base,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.primary,
    borderColor: theme.colors.neutral[300],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
  };
  const iosDone = Platform.OS === 'ios' ? 'globalDone' : undefined;

  return (
    <Screen
      header={
        <PracticeHeader
          title={campaign.title || 'Shared Tehillim'}
          subtitle={subtitle || undefined}
          onBack={() => navigation.goBack()}
          action={<IconButton name="share-outline" label="Share this page" tone="primary" onPress={handleShare} />}
        />
      }
    >
      <FlatList
        data={gridData}
        renderItem={renderCell}
        extraData={[data, participantId, submitting]}
        keyExtractor={(n) => String(n)}
        numColumns={COLS}
        columnWrapperStyle={{ flexDirection: 'row-reverse', gap, marginBottom: gap }}
        contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[type.textStyles.label, { color: theme.colors.primary.dark }]}>
              {isSplit ? 'Split and claim' : 'Shared completion'}
            </Text>
            <ProgressBar percent={percentComplete} style={{ marginTop: spacing.sm }} />
            <Text style={[type.textStyles.caption, { color: theme.colors.text.secondary, marginTop: spacing.xs }]}>
              {completedCount} of 150 complete ({percentComplete}%)
            </Text>
            {isSplit ? (
              <View style={{ marginTop: spacing.md }}>
                <GlassButton title="Claim more" onPress={() => openClaimModal()} />
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={
          <View style={{ marginTop: spacing.sm }}>
            <Text
              style={[
                type.textStyles.caption,
                { color: theme.colors.text.tertiary, textAlign: 'center', marginBottom: spacing.lg },
              ]}
            >
              {isSplit
                ? 'Tap an unclaimed perek to claim a range. Grey is claimed by someone else, green is completed.'
                : 'Tap a perek to open it. Mark it complete in the reader.'}
            </Text>
            <Section>
              <ListRow
                title="Report this page"
                leading={<Ionicons name="flag-outline" size={type.fontSize.lg} color={theme.colors.text.secondary} />}
                onPress={handleReport}
              />
            </Section>
          </View>
        }
      />

      <SheetModal
        visible={claimModalOpen}
        variant="page"
        title="Claim perakim"
        onClose={() => setClaimModalOpen(false)}
        actionLabel={submitting ? undefined : `Claim ${selectedPereks.size || ''}`.trim()}
        onAction={handleClaimSubmit}
        actionDisabled={submitting || selectedPereks.size === 0}
      >
        {submitting ? (
          <View style={{ position: 'absolute', top: spacing.sm, right: 0 }}>
            <ActivityIndicator color={theme.colors.primary.main} />
          </View>
        ) : null}
        <Text style={[type.textStyles.bodySmall, { color: theme.colors.text.secondary, marginBottom: spacing.md }]}>
          Tap to select. Grey perakim are already claimed or completed.
        </Text>
        {claimError ? <InlineError message={claimError} /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
          <TextInput
            accessibilityLabel="Range start"
            style={rangeInputStyle}
            value={rangeStart}
            onChangeText={setRangeStart}
            placeholder="From"
            placeholderTextColor={theme.colors.text.tertiary}
            keyboardType="number-pad"
            maxLength={3}
            inputAccessoryViewID={iosDone}
          />
          <Text style={[type.textStyles.body, { color: theme.colors.text.tertiary }]}>to</Text>
          <TextInput
            accessibilityLabel="Range end"
            style={rangeInputStyle}
            value={rangeEnd}
            onChangeText={setRangeEnd}
            placeholder="To"
            placeholderTextColor={theme.colors.text.tertiary}
            keyboardType="number-pad"
            maxLength={3}
            inputAccessoryViewID={iosDone}
          />
          <Chip label="Add range" onPress={addRangeToSelection} />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.sm,
          }}
        >
          <Text style={[type.textStyles.label, { color: theme.colors.text.secondary }]}>
            Selected: {selectedPereks.size} perakim
          </Text>
          {selectedPereks.size > 0 ? (
            <TextAction label="Clear" onPress={() => setSelectedPereks(new Set())} align="flex-end" />
          ) : null}
        </View>
        <FlatList
          style={{ flex: 1 }}
          data={gridData}
          renderItem={renderModalCell}
          extraData={selectedPereks}
          keyExtractor={(n) => String(n)}
          numColumns={MODAL_COLS}
          columnWrapperStyle={{ flexDirection: 'row-reverse', gap, marginBottom: gap }}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps={Platform.OS === 'ios' ? 'never' : 'handled'}
        />
      </SheetModal>
    </Screen>
  );
};
