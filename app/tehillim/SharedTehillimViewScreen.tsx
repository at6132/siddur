/**
 * View a shared Tehillim campaign: header (title, reason, deadline) + grid of 150 perakim.
 * Split: grey = claimed, green = completed; tap unclaimed to claim range.
 * Shared: tap to open reader; mark complete from reader or from here.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  Platform,
  Share,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '../../components/ui/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { getAnonymousId } from '../../src/analytics/IdentityService';
import {
  getTehillimCampaign,
  claimTehillimRange,
  joinTehillimCampaign,
  CampaignDetailResponse,
} from '../../src/api/tehillimApi';

const HEBREW_LETTERS = [
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
  'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ',
  'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל',
  'לא', 'לב', 'לג', 'לד', 'לה', 'לו', 'לז', 'לח', 'לט', 'מ',
  'מא', 'מב', 'מג', 'מד', 'מה', 'מו', 'מז', 'מח', 'מט', 'נ',
  'נא', 'נב', 'נג', 'נד', 'נה', 'נו', 'נז', 'נח', 'נט', 'ס',
  'סא', 'סב', 'סג', 'סד', 'סה', 'סו', 'סז', 'סח', 'סט', 'ע',
  'עא', 'עב', 'עג', 'עד', 'עה', 'עו', 'עז', 'עח', 'עט', 'פ',
  'פא', 'פב', 'פג', 'פד', 'פה', 'פו', 'פז', 'פח', 'פט', 'צ',
  'צא', 'צב', 'צג', 'צד', 'צה', 'צו', 'צז', 'צח', 'צט', 'ק',
  'קא', 'קב', 'קג', 'קד', 'קה', 'קו', 'קז', 'קח', 'קט', 'קי',
  'קיא', 'קיב', 'קיג', 'קיד', 'קטו', 'קטז', 'קיז', 'קיח', 'קיט', 'קכ',
  'קכא', 'קכב', 'קכג', 'קכד', 'קכה', 'קכו', 'קכז', 'קכח', 'קכט', 'קל',
  'קלא', 'קלב', 'קלג', 'קלד', 'קלה', 'קלו', 'קלז', 'קלח', 'קלט', 'קמ',
  'קמא', 'קמב', 'קמג', 'קמד', 'קמה', 'קמו', 'קמז', 'קמח', 'קמט', 'קנ',
];

const COLS = 3;
const GRID_PADDING = spacing.lg * 2;
const GRID_GAP = spacing.md;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING - GRID_GAP * (COLS - 1)) / COLS;
const CELL_MIN_HEIGHT = 90;
const MODAL_COLS = 5;
const MODAL_PAD = spacing.lg;
const MODAL_ITEM_SIZE = (SCREEN_WIDTH - MODAL_PAD * 2 - spacing.sm * (MODAL_COLS - 1)) / MODAL_COLS;

export const SharedTehillimViewScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const campaignId = (route.params as any)?.campaignId as string | undefined;
  const [data, setData] = useState<CampaignDetailResponse | null>(null);
  const [participantId, setParticipantId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedPereks, setSelectedPereks] = useState<Set<number>>(new Set());
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const didAutoOpenClaimRef = useRef(false);

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

  const getPerekState = useCallback((n: number) => {
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
      Alert.alert('Invalid range', 'Enter perakim 1–150, start ≤ end');
      return;
    }
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
      Alert.alert('Select perakim', 'Tap perakim or add a range to claim.');
      return;
    }
    setSubmitting(true);
    try {
      for (const [start, end] of ranges) {
        await claimTehillimRange(campaignId!, start, end, participantId);
      }
      setClaimModalOpen(false);
      setSelectedPereks(new Set());
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not claim');
    } finally {
      setSubmitting(false);
    }
  };

  const openClaimModal = (preselectPerek?: number) => {
    setSelectedPereks(preselectPerek != null && getPerekState(preselectPerek) === 'unclaimed' ? new Set([preselectPerek]) : new Set());
    setRangeStart('');
    setRangeEnd('');
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
    navigation.navigate('TehillimReader' as never, { psalm: n, campaignId } as never);
  };

  if (!campaignId) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FAF9F7', '#F5E6E8']} style={StyleSheet.absoluteFill} />
        <View style={styles.center}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.errorText}>Missing campaign ID</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FAF9F7', '#F5E6E8']} style={StyleSheet.absoluteFill} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FAF9F7', '#F5E6E8']} style={StyleSheet.absoluteFill} />
        <View style={styles.center}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.errorText}>{error || 'Not found'}</Text>
        </View>
      </View>
    );
  }

  const deadlineStr = campaign.deadline
    ? new Date(campaign.deadline).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : null;

  const shareLink = `https://siddur24seven.com/tehillim/${campaignId}`;
  const handleShare = () => {
    Share.share({
      message: shareLink,
      title: campaign.title ? `Shared Tehillim: ${campaign.title}` : 'Shared Tehillim link',
    }).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <BackButton onPress={() => navigation.goBack()} style={styles.backBtn} />
            <TouchableOpacity onPress={handleShare} style={styles.shareBtn} hitSlop={8}>
              <Ionicons name="share-outline" size={24} color={colors.primary.main} />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>{campaign.title || 'Shared Tehillim'}</Text>
          {campaign.reason ? <Text style={styles.reason}>{campaign.reason}</Text> : null}
          {deadlineStr ? <Text style={styles.deadline}>By {deadlineStr}</Text> : null}
          <Text style={styles.modeLabel}>{isSplit ? 'Split & claim' : 'Shared completion'}</Text>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${percentComplete}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {completedCount} of 150 complete ({percentComplete}%)
          </Text>
        </View>

        {isSplit && (
          <TouchableOpacity style={styles.claimMoreBtn} onPress={() => openClaimModal()} activeOpacity={0.8}>
            <Text style={styles.claimMoreBtnText}>Claim more</Text>
          </TouchableOpacity>
        )}

        <View style={styles.grid}>
          {Array.from({ length: 150 }, (_, i) => i + 1).map((n) => {
            const state = getPerekState(n);
            const hebrew = HEBREW_LETTERS[n - 1] ?? String(n);
            const isUnclaimed = state === 'unclaimed';
            const isCompleted = state === 'completed';
            const isClaimedOther = state === 'claimed_other';
            const bg =
              isCompleted
                ? colors.primary.main
                : isClaimedOther
                  ? colors.text.tertiary
                  : isUnclaimed
                    ? 'rgba(255,255,255,0.9)'
                    : 'rgba(212, 165, 184, 0.4)';
            const textColor = isCompleted || isClaimedOther ? colors.text.inverse : colors.text.primary;
            const disabled = isClaimedOther || submitting;
            const onPressCell =
              isSplit && isUnclaimed
                ? () => onPerekPress(n)
                : isSplit && state === 'claimed_mine'
                  ? () => navigation.navigate('TehillimReader' as never, { psalm: n, campaignId } as never)
                  : !isSplit && !isCompleted
                    ? () => onPerekPress(n)
                    : undefined;
            return (
              <TouchableOpacity
                key={n}
                style={[styles.cell, { backgroundColor: bg }]}
                onPress={onPressCell}
                disabled={disabled}
              >
                <Text style={[styles.cellHebrew, { color: textColor }]}>{hebrew}</Text>
                <Text style={[styles.cellNum, { color: textColor }]}>{n}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {!isSplit && (
          <Text style={styles.hint}>Tap a perek to open it; mark complete in the reader.</Text>
        )}
        {isSplit && (
          <Text style={styles.hint}>Tap an unclaimed perek to claim a range. Grey = claimed by someone else, green = completed.</Text>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <Modal visible={claimModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.claimModalBox}>
            <View style={styles.claimModalHeader}>
              <Text style={styles.claimModalTitle}>Claim perakim</Text>
              <TouchableOpacity onPress={() => setClaimModalOpen(false)} hitSlop={12}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.claimModalHint}>Tap to select • Grey = already claimed or completed</Text>
            <View style={styles.claimModalRangeRow}>
              <Text style={styles.modalLabel}>Range</Text>
              <TextInput
                style={styles.claimModalInput}
                value={rangeStart}
                onChangeText={setRangeStart}
                placeholder="From"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="number-pad"
                maxLength={3}
                inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
              />
              <Text style={styles.claimModalRangeDash}>–</Text>
              <TextInput
                style={styles.claimModalInput}
                value={rangeEnd}
                onChangeText={setRangeEnd}
                placeholder="To"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="number-pad"
                maxLength={3}
                inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
              />
              <TouchableOpacity style={styles.claimModalAddBtn} onPress={addRangeToSelection}>
                <Text style={styles.claimModalAddBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.claimModalSelectedRow}>
              <Text style={styles.claimModalSelected}>
                Selected: {selectedPereks.size} perakim
              </Text>
              {selectedPereks.size > 0 && (
                <TouchableOpacity onPress={() => setSelectedPereks(new Set())}>
                  <Text style={styles.claimModalClear}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView
              style={styles.claimModalGridScroll}
              contentContainerStyle={styles.claimModalGridWrap}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps={Platform.OS === 'ios' ? 'never' : 'handled'}
            >
              {Array.from({ length: 150 }, (_, i) => i + 1).map((n) => {
                const state = getPerekState(n);
                const hebrew = HEBREW_LETTERS[n - 1] ?? String(n);
                const isUnclaimed = state === 'unclaimed';
                const isClaimedOther = state === 'claimed_other';
                const isSelected = selectedPereks.has(n);
                const disabled = isClaimedOther || state === 'claimed_mine' || state === 'completed';
                const isGrey = isClaimedOther || state === 'claimed_mine' || state === 'completed';
                const bg = isGrey
                  ? colors.text.tertiary
                  : isSelected
                    ? colors.primary.main
                    : 'rgba(255,255,255,0.9)';
                const textColor = isGrey || isSelected ? colors.text.inverse : colors.text.primary;
                return (
                  <TouchableOpacity
                    key={n}
                    style={[styles.claimModalCell, { backgroundColor: bg }]}
                    onPress={() => !disabled && togglePerekSelection(n)}
                    disabled={disabled}
                  >
                    <Text style={[styles.claimModalCellHebrew, { color: textColor }]}>{hebrew}</Text>
                    <Text style={[styles.claimModalCellNum, { color: textColor }]}>{n}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.claimModalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setClaimModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalOk, selectedPereks.size === 0 && styles.modalOkDisabled]}
                onPress={handleClaimSubmit}
                disabled={submitting || selectedPereks.size === 0}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.modalOkText}>Claim {selectedPereks.size || ''}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  scroll: { flex: 1 },
  scrollContent: { padding: GRID_PADDING / 2, paddingTop: spacing.xl + spacing.safeTopInset },
  header: { marginBottom: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  backBtn: { marginBottom: 0 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  shareBtnText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: colors.primary.main,
    marginLeft: 6,
  },
  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 24,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  reason: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.text.secondary, marginBottom: spacing.xs },
  deadline: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.text.tertiary, marginBottom: spacing.xs },
  modeLabel: { fontFamily: fonts.body.semiBold, fontSize: 12, color: colors.primary.main },
  progressSection: {
    marginBottom: spacing.lg,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: 4,
  },
  progressText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.text.secondary,
  },
  claimMoreBtn: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 184, 0.5)',
  },
  claimMoreBtnText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: colors.primary.main,
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  cell: {
    width: ITEM_WIDTH,
    minHeight: CELL_MIN_HEIGHT,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  cellHebrew: { fontFamily: fonts.heading.semiBold, fontSize: 16 },
  cellNum: { fontFamily: fonts.body.regular, fontSize: 10, color: colors.text.tertiary, marginTop: 2 },
  hint: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  errorText: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.text.secondary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  claimModalBox: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    paddingHorizontal: MODAL_PAD,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl * 2,
    maxHeight: '90%',
  },
  claimModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  claimModalTitle: { fontFamily: fonts.heading.semiBold, fontSize: 20, color: colors.text.primary },
  claimModalHint: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  claimModalRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  claimModalInput: {
    width: 56,
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
  claimModalRangeDash: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.text.tertiary },
  claimModalAddBtn: {
    backgroundColor: colors.primary.light,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  claimModalAddBtnText: { fontFamily: fonts.body.semiBold, fontSize: 14, color: colors.primary.dark },
  claimModalSelected: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.text.secondary,
  },
  claimModalSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  claimModalClear: { color: colors.primary.main, fontFamily: fonts.body.semiBold },
  claimModalGridScroll: { maxHeight: 280 },
  claimModalGridWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  claimModalCell: {
    width: MODAL_ITEM_SIZE,
    height: MODAL_ITEM_SIZE,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  claimModalCellHebrew: { fontFamily: fonts.heading.semiBold, fontSize: 14 },
  claimModalCellNum: { fontFamily: fonts.body.regular, fontSize: 9, color: colors.text.tertiary, marginTop: 1 },
  claimModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  modalOkDisabled: { opacity: 0.5 },
  modalBox: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: { fontFamily: fonts.heading.semiBold, fontSize: 18, color: colors.text.primary, marginBottom: spacing.lg },
  modalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  modalLabel: { fontFamily: fonts.body.medium, width: 40, fontSize: 14, color: colors.text.secondary },
  modalInput: {
    flex: 1,
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },
  modalCancel: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  modalCancelText: { fontFamily: fonts.body.semiBold, fontSize: 15, color: colors.text.secondary },
  modalOk: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  modalOkText: { fontFamily: fonts.heading.semiBold, fontSize: 15, color: colors.text.inverse },
});
