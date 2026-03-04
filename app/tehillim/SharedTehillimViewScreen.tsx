/**
 * View a shared Tehillim campaign: header (title, reason, deadline) + grid of 150 perakim.
 * Split: grey = claimed, green = completed; tap unclaimed to claim range.
 * Shared: tap to open reader; mark complete from reader or from here.
 */
import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '../../components/ui/BackButton';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { getAnonymousId } from '../../src/analytics/IdentityService';
import {
  getTehillimCampaign,
  claimTehillimRange,
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

const COLS = 5;
const GRID_GAP = spacing.sm;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING = spacing.lg;
const ITEM_SIZE = (SCREEN_WIDTH - PADDING * 2 - GRID_GAP * (COLS - 1)) / COLS;

export const SharedTehillimViewScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const campaignId = (route.params as any)?.campaignId as string | undefined;
  const [data, setData] = useState<CampaignDetailResponse | null>(null);
  const [participantId, setParticipantId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimModal, setClaimModal] = useState<{ perek: number } | null>(null);
  const [claimStart, setClaimStart] = useState('');
  const [claimEnd, setClaimEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const getPerekState = (n: number) => {
    if (isSplit) {
      const c = commitmentMap.get(n);
      if (!c) return 'unclaimed';
      if (c.completed_at) return 'completed';
      return c.participant_id === participantId ? 'claimed_mine' : 'claimed_other';
    }
    const mine = byPerek[n];
    if (mine?.completed_at) return 'completed';
    return 'unclaimed';
  };

  const onPerekPress = async (n: number) => {
    const state = getPerekState(n);
    if (isSplit) {
      if (state === 'unclaimed') {
        setClaimModal({ perek: n });
        setClaimStart(String(n));
        setClaimEnd(String(n));
      }
      return;
    }
    if (state === 'completed') return;
    navigation.navigate('TehillimReader' as never, { psalm: n, campaignId } as never);
  };

  const handleClaimSubmit = async () => {
    const start = parseInt(claimStart, 10);
    const end = parseInt(claimEnd, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end > 150 || start > end) {
      Alert.alert('Invalid range', 'Enter perakim 1–150, start ≤ end');
      return;
    }
    setSubmitting(true);
    try {
      await claimTehillimRange(campaignId!, start, end, participantId);
      setClaimModal(null);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not claim');
    } finally {
      setSubmitting(false);
    }
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
          <BackButton onPress={() => navigation.goBack()} style={styles.backBtn} />
          <Text style={styles.title}>{campaign.title || 'Shared Tehillim'}</Text>
          {campaign.reason ? <Text style={styles.reason}>{campaign.reason}</Text> : null}
          {deadlineStr ? <Text style={styles.deadline}>By {deadlineStr}</Text> : null}
          <Text style={styles.modeLabel}>{isSplit ? 'Split & claim' : 'Shared completion'}</Text>
        </View>

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

      <Modal visible={!!claimModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setClaimModal(null)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.modalBox}>
            <Text style={styles.modalTitle}>Claim perakim</Text>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>From</Text>
              <TextInput
                style={styles.modalInput}
                value={claimStart}
                onChangeText={setClaimStart}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>To</Text>
              <TextInput
                style={styles.modalInput}
                value={claimEnd}
                onChangeText={setClaimEnd}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setClaimModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalOk}
                onPress={handleClaimSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.modalOkText}>Claim</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  scroll: { flex: 1 },
  scrollContent: { padding: PADDING, paddingTop: spacing.xl + spacing.safeTopInset },
  header: { marginBottom: spacing.xl },
  backBtn: { marginBottom: spacing.sm },
  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 24,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  reason: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.text.secondary, marginBottom: spacing.xs },
  deadline: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.text.tertiary, marginBottom: spacing.xs },
  modeLabel: { fontFamily: fonts.body.semiBold, fontSize: 12, color: colors.primary.main },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  cell: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
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
