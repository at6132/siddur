import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/core';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { ScalePress } from '../../components/animations/ScalePress';
import { FadeIn } from '../../components/animations/FadeIn';
import { BackButton } from '../../components/ui/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { DailyTehillimTracker } from '../../src/storage/DailyTehillimTracker';

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
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [])
  );

  const loadProgress = async () => {
    const [progress, overall] = await Promise.all([
      DailyTehillimTracker.getTodaysProgress(),
      DailyTehillimTracker.getOverallTehillimProgress(),
    ]);
    setDailyProgress({
      dayName: progress.dayName,
      totalChapters: progress.totalChapters,
      chaptersCompleted: progress.chaptersCompleted,
      chaptersRemaining: progress.chaptersRemaining,
      percentComplete: progress.percentComplete,
      goalType: progress.goalType,
    });
    setOverallProgress(overall);
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
        <View style={styles.dailyCardContainer}>
          {Platform.OS !== 'web' ? (
            <BlurView intensity={60} style={styles.dailyCardBlur}>
              <LinearGradient
                colors={['rgba(212, 165, 184, 0.2)', 'rgba(165, 196, 212, 0.2)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dailyCardGradient}
              >
                {renderDailyCardContent()}
              </LinearGradient>
            </BlurView>
          ) : (
            <LinearGradient
              colors={['rgba(212, 165, 184, 0.3)', 'rgba(165, 196, 212, 0.3)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dailyCardGradient}
            >
              {renderDailyCardContent()}
            </LinearGradient>
          )}
        </View>
      </FadeIn>
    );

    function renderDailyCardContent() {
      return (
        <View style={styles.dailyCardInner}>
          <View style={styles.dailyCardHeader}>
            <View>
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
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('TehillimSettings' as never)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
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
            <Text style={styles.progressText}>
              {overallProgress
                ? `${overallProgress.completed} of ${overallProgress.total} (${overallProgress.percentComplete}%)`
                : `${percentComplete}% complete`}
            </Text>
          </View>

          {isWhenever ? (
            <View style={styles.wheneverCta}>
              <Text style={styles.wheneverCtaText}>
                {chaptersRemaining.length === 0
                  ? '✓ All 150 perakim complete!'
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
                ✓ {dayName}'s Tehillim Complete!
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
        ListHeaderComponent={renderDailyCard}
        keyboardShouldPersistTaps="handled"
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

  // Daily Card - Enhanced with liquid glass
  dailyCardContainer: {
    marginBottom: spacing.xl,
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  dailyCardBlur: {
    overflow: 'hidden',
  },
  dailyCardGradient: {
    overflow: 'hidden',
  },
  dailyCardInner: {
    padding: spacing.xl,
  },
  dailyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  dailyCardTitle: {
    fontFamily: fonts.heading.bold,
    fontSize: 24,
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  dailyCardSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 15,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  editButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  editButtonText: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.secondary.dark,
    textDecorationLine: 'underline',
  },
  progressContainer: {
    marginBottom: spacing.md,
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
    fontSize: 12,
    color: colors.text.secondary,
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
    backgroundColor: 'rgba(165, 212, 184, 0.3)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  completeMessageText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: colors.text.primary,
  },
  wheneverCta: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  wheneverCtaText: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
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
    fontFamily: fonts.heading.bold,
    fontSize: 24,
    color: colors.text.primary,
    letterSpacing: -0.5,
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
