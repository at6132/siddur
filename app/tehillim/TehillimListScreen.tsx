import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Platform,
  Animated,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { ScalePress } from '../../components/animations/ScalePress';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts, textStyles } from '../../src/design/typography';
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
}

export const TehillimListScreen: React.FC = () => {
  const navigation = useNavigation();
  const [dailyProgress, setDailyProgress] = useState<DailyProgress | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [])
  );

  const loadProgress = async () => {
    const progress = await DailyTehillimTracker.getTodaysProgress();
    setDailyProgress({
      dayName: progress.dayName,
      totalChapters: progress.totalChapters,
      chaptersCompleted: progress.chaptersCompleted,
      chaptersRemaining: progress.chaptersRemaining,
      percentComplete: progress.percentComplete,
    });
  };

  const tehillimList: TehillimItem[] = Array.from(
    { length: TEHILLIM_COUNT },
    (_, i) => ({
      number: i + 1,
      hebrew: HEBREW_LETTERS[i] || String(i + 1),
    })
  );

  const isToday = (chapterNum: number) => 
    dailyProgress?.totalChapters.includes(chapterNum) || false;

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

    const { dayName, totalChapters, percentComplete, chaptersRemaining } = dailyProgress;
    const startChapter = totalChapters[0];
    const endChapter = totalChapters[totalChapters.length - 1];

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
              <Text style={styles.dailyCardTitle}>{dayName}'s Tehillim</Text>
              <Text style={styles.dailyCardSubtitle}>
                Chapters {startChapter}–{endChapter} • {totalChapters.length} total
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
              <View style={[styles.progressBarFill, { width: `${percentComplete}%` }]} />
            </View>
            <Text style={styles.progressText}>{percentComplete}% complete</Text>
          </View>

          {/* Continue Button */}
          {chaptersRemaining.length > 0 ? (
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
      <FlatList
        data={tehillimList}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.number)}
        numColumns={3}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderDailyCard}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: 140,
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

  // Grid - Enhanced with subtle glass
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  itemContainer: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  item: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.light,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
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
    position: 'relative',
  },
  hebrewNumber: {
    fontFamily: fonts.heading.bold,
    fontSize: 24,
    color: colors.text.primary,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  hebrewNumberToday: {
    color: colors.primary.dark,
  },
  hebrewNumberCompleted: {
    color: colors.semantic.success,
  },
  englishNumber: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.text.secondary,
    letterSpacing: 0.2,
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
