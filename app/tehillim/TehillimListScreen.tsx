import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/core';
import { LinearGradient } from 'expo-linear-gradient';
import { ScalePress } from '../../components/animations/ScalePress';
import { FadeIn } from '../../components/animations/FadeIn';
import { BackButton } from '../../components/ui/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { DailyTehillimTracker } from '../../src/storage/DailyTehillimTracker';
import { getAnonymousId } from '../../src/analytics/IdentityService';
import {
  listMyTehillimCampaigns,
  leaveTehillimCampaign,
  deleteTehillimCampaign,
  type TehillimCampaign,
} from '../../src/api/tehillimApi';

// Hebrew letters for Tehillim numbering
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

const TEHILLIM_COUNT = 150;
const GRID_PADDING = spacing.lg * 2;
const GRID_GAP = spacing.md;
const COLS = 3;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING - GRID_GAP * (COLS - 1)) / COLS;

interface TehillimItem {
  number: number;
  hebrew: string;
}

interface DailyProgress {
  dayName: string;
  totalChapters: number[];
  chaptersCompleted: number[];
  chaptersRemaining: number[];
  percentComplete: number;
  goalType: 'weekly' | 'monthly' | 'custom' | 'whenever';
}

interface OverallProgress {
  completed: number;
  total: number;
  label: string;
  percentComplete: number;
}

export const TehillimListScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [dailyProgress, setDailyProgress] = useState<DailyProgress | null>(null);
  const [overallProgress, setOverallProgress] = useState<OverallProgress | null>(null);
  const [fullBookCompletionsCount, setFullBookCompletionsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [myCampaigns, setMyCampaigns] = useState<TehillimCampaign[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [])
  );

  const loadProgress = async () => {
    const [progress, overall, fullBookCount] = await Promise.all([
      DailyTehillimTracker.getTodaysProgress(),
      DailyTehillimTracker.getOverallTehillimProgress(),
      DailyTehillimTracker.getFullTehillimCompletionsCount(),
    ]);
    setFullBookCompletionsCount(fullBookCount);
    setDailyProgress({
      dayName: progress.dayName,
      totalChapters: progress.totalChapters,
      chaptersCompleted: progress.chaptersCompleted,
      chaptersRemaining: progress.chaptersRemaining,
      percentComplete: progress.percentComplete,
      goalType: progress.goalType,
    });
    setOverallProgress(overall);
    try {
      const pid = await getAnonymousId();
      const { campaigns } = await listMyTehillimCampaigns(pid);
      setMyCampaigns(campaigns || []);
    } catch {
      setMyCampaigns([]);
    }
  };

  const allTehillim: TehillimItem[] = useMemo(
    () =>
      Array.from({ length: TEHILLIM_COUNT }, (_, i) => ({
        number: i + 1,
        hebrew: HEBREW_LETTERS[i] || String(i + 1),
      })),
    []
  );

  const tehillimList = useMemo(() => {
    if (!searchQuery.trim()) return allTehillim;
    const q = searchQuery.trim().toLowerCase();
    return allTehillim.filter((item) => {
      const numStr = String(item.number);
      const hebrewMatch = item.hebrew.includes(q) || item.hebrew === q;
      const numMatch = numStr.includes(q) || numStr.startsWith(q);
      return hebrewMatch || numMatch;
    });
  }, [allTehillim, searchQuery]);

  const isToday = (chapterNum: number) =>
    dailyProgress?.goalType !== 'whenever' &&
    (dailyProgress?.totalChapters.includes(chapterNum) ?? false);

  const isCompleted = (chapterNum: number) =>
    dailyProgress?.chaptersCompleted.includes(chapterNum) || false;

  const handleContinueDaily = async () => {
    const nextChapter = await DailyTehillimTracker.getNextChapter();
    if (nextChapter) {
      navigation.navigate('TehillimReader' as never, { psalm: nextChapter } as never);
    }
  };

  const handleResetCurrentBook = () => {
    Alert.alert(
      'Reset Sefer Tehillim progress?',
      'This clears checkmarks for your current run (this week, month, or all 150 perakim, depending on your goal). Your count of siyumei Sefer Tehillim does not change.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await DailyTehillimTracker.resetCurrentBookProgress();
            await loadProgress();
          },
        },
      ]
    );
  };

  const handleLeaveCampaign = async (c: TehillimCampaign) => {
    Alert.alert(
      'Leave Tehillim page?',
      `Leave "${c.title || 'Shared Tehillim'}"? You can rejoin with the link.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const pid = await getAnonymousId();
              await leaveTehillimCampaign(c.id, pid);
              await loadProgress();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Could not leave');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCampaign = async (c: TehillimCampaign) => {
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
              await loadProgress();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Could not delete');
            }
          },
        },
      ]
    );
  };

  const renderMyTehillimPagesSection = () => {
    if (!myCampaigns.length) return null;
    return (
      <View style={styles.myPagesSection}>
        <Text style={styles.myPagesSectionTitle}>Your Tehillim pages</Text>
        <Text style={styles.myPagesSectionSubtitle}>Separate from your personal Tehillim above</Text>
        {myCampaigns.map((c) => {
          const deadlineStr = c.deadline ? new Date(c.deadline).toLocaleDateString(undefined, { dateStyle: 'short' }) : null;
          return (
            <View key={c.id} style={styles.myPagesCard}>
              <View style={styles.myPagesCardContent}>
                <Text style={styles.myPagesCardTitle}>{c.title || 'Shared Tehillim'}</Text>
                {(c.reason || deadlineStr) && (
                  <Text style={styles.myPagesCardSubtitle} numberOfLines={2}>
                    {[c.reason, deadlineStr ? `By ${deadlineStr}` : null].filter(Boolean).join(' · ')}
                  </Text>
                )}
                <Text style={styles.myPagesCardType}>{c.type === 'split' ? 'Split & claim' : 'Shared completion'}</Text>
              </View>
              <View style={styles.myPagesCardActions}>
                <TouchableOpacity
                  style={styles.myPagesOpenBtn}
                  onPress={() => navigation.navigate('SharedTehillimView' as never, { campaignId: c.id } as never)}
                >
                  <Text style={styles.myPagesOpenBtnText}>Open</Text>
                </TouchableOpacity>
                {c.is_creator ? (
                  <TouchableOpacity style={styles.myPagesLeaveBtn} onPress={() => handleDeleteCampaign(c)}>
                    <Ionicons name="trash-outline" size={16} color={colors.semantic.error} />
                    <Text style={styles.myPagesLeaveBtnText}>Delete</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.myPagesLeaveBtn} onPress={() => handleLeaveCampaign(c)}>
                    <Text style={styles.myPagesLeaveBtnText}>Leave</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderDailyCard = () => {
    if (!dailyProgress) return null;

    const { dayName, percentComplete, goalType } = dailyProgress;
    const totalChapters = dailyProgress.totalChapters ?? [];
    const chaptersRemaining = dailyProgress.chaptersRemaining ?? [];
    const isWhenever = goalType === 'whenever';
    const startChapter = totalChapters[0];
    const endChapter = totalChapters[totalChapters.length - 1];
    const completedCount = totalChapters.length - chaptersRemaining.length;

    return (
      <FadeIn delay={0}>
        <View style={styles.dailyCardSurface}>{renderDailyCardContent()}</View>
      </FadeIn>
    );

    function renderDailyCardContent() {
      return (
        <View style={styles.dailyCardInner}>
          <Text style={styles.dailyCardTitle}>
            {isWhenever ? 'Tehillim whenever you can' : `${dayName}'s Tehillim`}
          </Text>
          <Text style={styles.dailyCardSubtitle}>
            {isWhenever
              ? `${completedCount} of 150 perakim • Open any perek`
              : overallProgress
                ? `${completedCount} of ${totalChapters.length} today • ${overallProgress.completed} of ${overallProgress.total} ${overallProgress.label}`
                : `Chapters ${startChapter}–${endChapter} • ${totalChapters.length} total`}
          </Text>

          <View style={styles.progressRow}>
            <View style={styles.progressBarWrap}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${overallProgress ? overallProgress.percentComplete : percentComplete}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressMetaRow}>
                <Text style={styles.progressText} numberOfLines={2}>
                  {overallProgress
                    ? `${overallProgress.completed} of ${overallProgress.total} (${overallProgress.percentComplete}%)`
                    : `${percentComplete}% complete`}
                </Text>
                <TouchableOpacity
                  style={styles.progressEditHit}
                  onPress={() => navigation.navigate('TehillimSettings' as never)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.65}
                >
                  <Ionicons name="create-outline" size={14} color={colors.secondary.dark} />
                  <Text style={styles.progressEditText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.progressPercentPill}>
              <Text style={styles.progressPercentPillText}>
                {overallProgress ? overallProgress.percentComplete : percentComplete}%
              </Text>
            </View>
          </View>

          <View style={styles.fullBookPanel}>
            <View style={styles.fullBookPanelHeader}>
              <Text style={styles.fullBookCountText}>
                Siyumei Sefer Tehillim: {fullBookCompletionsCount}
              </Text>
            </View>
            <Text style={styles.fullBookHintText}>
              Each siyum is completing all 150 perakim; then the count goes up and you begin again. Reset clears only this run.
            </Text>
            <TouchableOpacity
              style={styles.resetBookButton}
              onPress={handleResetCurrentBook}
              activeOpacity={0.7}
            >
              <Text style={styles.resetBookButtonText}>Reset this sefer's progress</Text>
            </TouchableOpacity>
          </View>

          {isWhenever ? (
            <View style={styles.wheneverCta}>
              <Text style={styles.wheneverCtaText}>
                {chaptersRemaining.length === 0
                  ? 'All 150 perakim complete'
                  : 'Open any perek below and tap "Complete perek" when done'}
              </Text>
            </View>
          ) : chaptersRemaining.length > 0 ? (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinueDaily}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>
                Continue with Chapter {chaptersRemaining[0]}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.completeMessage}>
              <Text style={styles.completeMessageText}>
                {dayName}'s Tehillim complete
              </Text>
            </View>
          )}
        </View>
      );
    }
  };

  const renderItem = ({ item, index }: { item: TehillimItem; index: number }) => {
    const today = isToday(item.number);
    const completed = isCompleted(item.number);

    return (
      <FadeIn delay={Math.min(index * 5, 200)}>
        <ScalePress
          onPress={() => {
            navigation.navigate('TehillimReader' as never, { psalm: item.number } as never);
          }}
          style={styles.itemContainer}
        >
          <View style={[
            styles.item,
            today && styles.itemToday,
            completed && styles.itemCompleted,
          ]}>
            <View style={styles.itemContent}>
              <Text style={[
                styles.hebrewNumber,
                today && styles.hebrewNumberToday,
                completed && styles.hebrewNumberCompleted,
              ]}>
                {item.hebrew}
              </Text>
              <Text style={[
                styles.englishNumber,
                today && styles.englishNumberToday,
              ]}>
                {item.number}
              </Text>
              {completed && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>✓</Text>
                </View>
              )}
            </View>
          </View>
        </ScalePress>
      </FadeIn>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerRow}>
          <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
          <Text style={styles.headerTitle}>Tehillim</Text>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search perek (e.g. 90 or צ)"
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
          />
        </View>
      </View>
      <FlatList
        data={tehillimList}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.number)}
        numColumns={3}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <TouchableOpacity
              style={styles.sharedTehillimBanner}
              onPress={() => navigation.navigate('CreateSharedTehillim' as never)}
              activeOpacity={0.8}
            >
              <Ionicons name="people-outline" size={22} color={colors.primary.main} />
              <Text style={styles.sharedTehillimBannerText}>Make your Tehillim page</Text>
              <Text style={styles.sharedTehillimBannerSubtext}>Share a link • others join & complete</Text>
            </TouchableOpacity>
            {renderDailyCard()}
            {renderMyTehillimPagesSection()}
          </View>
        }
        keyboardShouldPersistTaps={Platform.OS === 'ios' ? 'never' : 'handled'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  backText: {
    fontFamily: fonts.body.medium,
    fontSize: 16,
    color: colors.primary.main,
  },
  headerTitle: {
    fontFamily: fonts.heading.bold,
    fontSize: 22,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: 140,
  },
  sharedTehillimBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 184, 0.4)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sharedTehillimBannerText: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 15,
    color: colors.primary.dark,
  },
  sharedTehillimBannerSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
    width: '100%',
    marginLeft: 30,
  },
  myPagesSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  myPagesSectionTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  myPagesSectionSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  myPagesCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  myPagesCardContent: { marginBottom: spacing.sm },
  myPagesCardTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 16,
    color: colors.text.primary,
  },
  myPagesCardSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  myPagesCardType: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.primary.main,
    marginTop: 4,
  },
  myPagesCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  myPagesOpenBtn: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  myPagesOpenBtnText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.inverse,
  },
  myPagesLeaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  myPagesLeaveBtnText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.semantic.error,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginLeft: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    fontFamily: fonts.body.regular,
    color: colors.text.primary,
  },

  // Daily progress card — light surface (matches home widget tone)
  dailyCardSurface: {
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 184, 0.22)',
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  dailyCardInner: {
    padding: spacing.lg,
  },
  dailyCardTitle: {
    fontFamily: fonts.heading.bold,
    fontSize: 20,
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  dailyCardSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  progressBarWrap: {
    flex: 1,
    minWidth: 0,
  },
  progressMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  progressEditHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
    paddingVertical: 2,
    paddingLeft: spacing.xs,
  },
  progressEditText: {
    fontFamily: fonts.body.medium,
    fontSize: 11,
    color: colors.secondary.dark,
    textDecorationLine: 'underline',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.045)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: 3,
  },
  progressText: {
    flex: 1,
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.text.tertiary,
    minWidth: 0,
  },
  progressPercentPill: {
    backgroundColor: 'rgba(212, 165, 184, 0.14)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercentPillText: {
    fontFamily: fonts.body.bold,
    fontSize: 13,
    color: colors.primary.dark,
  },
  fullBookPanel: {
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 184, 0.12)',
  },
  fullBookPanelHeader: {
    marginBottom: spacing.xs,
  },
  fullBookCountText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.primary.dark,
  },
  fullBookHintText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  resetBookButton: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  resetBookButtonText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.semantic.error,
    textDecorationLine: 'underline',
  },
  continueButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  continueButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: '#fff',
  },
  completeMessage: {
    backgroundColor: 'rgba(165, 212, 184, 0.2)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(165, 212, 184, 0.35)',
  },
  completeMessageText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.secondary,
  },
  wheneverCta: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  wheneverCtaText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 17,
  },

  // Grid - 3 per row, RTL so perek א is on the right (Hebrew reading order)
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: GRID_GAP,
    marginBottom: spacing.md,
    width: SCREEN_WIDTH - GRID_PADDING,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    minWidth: ITEM_WIDTH,
  },
  item: {
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  itemToday: {
    backgroundColor: 'rgba(212, 165, 184, 0.3)',
    borderColor: colors.primary.main,
    borderWidth: 2,
    shadowColor: colors.primary.main,
    shadowOpacity: 0.15,
  },
  itemCompleted: {
    backgroundColor: 'rgba(165, 212, 184, 0.3)',
    borderColor: colors.semantic.success,
  },
  itemContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  hebrewNumber: {
    fontFamily: fonts.hebrew.bold,
    fontSize: 24,
    color: colors.text.primary,
    letterSpacing: 0,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  hebrewNumberToday: {
    color: colors.primary.dark,
  },
  hebrewNumberCompleted: {
    color: colors.semantic.success,
  },
  englishNumber: {
    fontFamily: fonts.body.regular,
    fontSize: 10,
    color: colors.text.tertiary,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  englishNumberToday: {
    color: colors.primary.main,
    fontFamily: fonts.body.semiBold,
  },
  completedBadge: {
    position: 'absolute',
    top: -8,
    right: -20,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.semantic.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
});
