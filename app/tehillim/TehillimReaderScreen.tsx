import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles, fonts } from '../../src/design/typography';
import { TehillimService } from '../../src/content/tehillim/TehillimService';
import { TehillimChapter, TehillimVerse } from '../../src/content/tehillim/types';
import { DailyTehillimTracker } from '../../src/storage/DailyTehillimTracker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Strip HTML entities that may appear in Sefaria text (e.g. &thinsp;) so they don't show as literal text. */
function cleanVerseText(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/&thinsp;/g, ' ')
    .replace(/&#x2009;/g, ' ')
    .replace(/\u2009/g, ' ');
}

export const TehillimReaderScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const psalm = (route.params as any)?.psalm || 1;
  
  const [chapter, setChapter] = useState<TehillimChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [isMarkedComplete, setIsMarkedComplete] = useState(false);
  const [isDailyChapter, setIsDailyChapter] = useState(false);
  const [isWheneverMode, setIsWheneverMode] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const hasReachedEnd = useRef(false);
  const readingStartTime = useRef<number | null>(null);

  useEffect(() => {
    hasReachedEnd.current = false;
    readingStartTime.current = Date.now();
    loadChapter(psalm);
    checkIfDailyChapter(psalm);
  }, [psalm]);

  const checkIfDailyChapter = async (chapterNum: number) => {
    const progress = await DailyTehillimTracker.getTodaysProgress();
    const whenever = progress.goalType === 'whenever';
    setIsWheneverMode(whenever);
    setIsDailyChapter(whenever || progress.totalChapters.includes(chapterNum));
    setIsMarkedComplete(progress.chaptersCompleted?.includes(chapterNum) ?? false);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
    if (isCloseToBottom && !hasReachedEnd.current) {
      hasReachedEnd.current = true;
      markChapterComplete();
    }
  };

  const getWordCount = (): number => {
    if (!chapter?.verses) return 0;
    return chapter.verses.reduce(
      (sum, v) => sum + (v.hebrew?.trim().split(/\s+/).filter(Boolean).length ?? 0),
      0
    );
  };

  const markChapterComplete = async () => {
    const progress = await DailyTehillimTracker.getTodaysProgress();
    const inSchedule = progress.goalType === 'whenever' || progress.totalChapters.includes(psalm);
    const alreadyComplete = progress.chaptersCompleted?.includes(psalm) ?? false;
    if (inSchedule && !alreadyComplete) {
      const start = readingStartTime.current ?? Date.now();
      const durationMs = Math.max(1000, Date.now() - start);
      const durationMinutes = durationMs / 60000;
      const wordCount = getWordCount() || 120;
      await DailyTehillimTracker.markChapterComplete(psalm, {
        durationMinutes,
        wordCount,
      });
      setIsMarkedComplete(true);
      setIsDailyChapter(true);
    }
  };

  const loadChapter = async (num: number) => {
    setLoading(true);
    try {
      const chapterData = await TehillimService.getChapter(num);
      setChapter(chapterData);
      
      navigation.setOptions({
        title: `תהלים ${chapterData?.hebrewNumber || num}`,
      });
    } catch (e) {
      console.error('Error loading chapter:', e);
    } finally {
      setLoading(false);
    }
  };

  const getHebrewFontSize = () => {
    switch (fontSize) {
      case 'small': return 18;
      case 'large': return 28;
      default: return 22;
    }
  };

  const renderVerse = (verse: TehillimVerse, index: number) => {
    const size = getHebrewFontSize();
    return (
      <FadeIn key={verse.number} delay={30 * index}>
        <View style={styles.verseContainer}>
          <View style={styles.verseNumberContainer}>
            <Text style={styles.verseNumber}>{verse.number}</Text>
          </View>
          <View style={styles.verseTextContainer}>
            <Text style={[styles.hebrewText, { fontSize: size, lineHeight: size * 1.6 }]}>
              {cleanVerseText(verse.hebrew)}
            </Text>
          </View>
        </View>
      </FadeIn>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading Tehillim...</Text>
        </View>
      </View>
    );
  }

  if (!chapter) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chapter not found</Text>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={true}
        nestedScrollEnabled={true}
      >
        {/* Daily / Whenever Tehillim Badge — show "Complete perek" in whenever mode on every perek */}
        {isDailyChapter && (
          <FadeIn delay={0}>
            <View style={[styles.dailyBadge, isMarkedComplete && styles.dailyBadgeComplete]}>
              <Text style={styles.dailyBadgeText}>
                {isMarkedComplete
                  ? (isWheneverMode ? '✓ Perek complete' : '✓ Completed Today')
                  : isWheneverMode
                    ? 'Say this perek whenever you can'
                    : 'Today\'s Tehillim'}
              </Text>
              {!isMarkedComplete && (
                <TouchableOpacity
                  style={styles.markCompleteButton}
                  onPress={markChapterComplete}
                  activeOpacity={0.7}
                >
                  <Text style={styles.markCompleteButtonText}>
                    {isWheneverMode ? 'Complete perek' : 'Mark complete'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </FadeIn>
        )}

        {/* Header */}
        <FadeIn delay={0}>
          <View style={styles.headerSection}>
            <Text style={styles.chapterNumber}>{chapter.hebrewNumber}</Text>
            <Text style={styles.chapterNumberEnglish}>Psalm {chapter.number}</Text>
            {chapter.title && (
              <Text style={styles.chapterTitle}>{chapter.title}</Text>
            )}
            {chapter.themes && chapter.themes.length > 0 && (
              <View style={styles.themesContainer}>
                {chapter.themes.slice(0, 3).map((theme, i) => (
                  <View key={i} style={styles.themeTag}>
                    <Text style={styles.themeText}>{theme}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </FadeIn>

        {/* Controls */}
        <FadeIn delay={50}>
          <View style={styles.controlsContainer}>
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Text Size</Text>
              <View style={styles.sizeButtons}>
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.sizeButton,
                      fontSize === size && styles.sizeButtonActive,
                    ]}
                    onPress={() => setFontSize(size)}
                  >
                    <Text style={[
                      styles.sizeButtonText,
                      fontSize === size && styles.sizeButtonTextActive,
                    ]}>
                      {size === 'small' ? 'A' : size === 'medium' ? 'A' : 'A'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </FadeIn>

        {/* Verses */}
        <GlassPanel padding="lg" borderRadius="2xl" style={styles.versesPanel}>
          {chapter.verses.map((verse, index) => renderVerse(verse, index))}
        </GlassPanel>

        {/* Attribution */}
        <View style={styles.attributionContainer}>
          <Text style={styles.attributionText}>
            Texts provided by{' '}
            <Text style={styles.attributionLink}>Sefaria.org</Text>
          </Text>
        </View>

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          {psalm > 1 && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                navigation.setParams({ psalm: psalm - 1 } as any);
                loadChapter(psalm - 1);
              }}
            >
              <Text style={styles.navButtonText}>← Previous</Text>
            </TouchableOpacity>
          )}
          <View style={styles.navSpacer} />
          {psalm < 150 && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                navigation.setParams({ psalm: psalm + 1 } as any);
                loadChapter(psalm + 1);
              }}
            >
              <Text style={styles.navButtonText}>Next →</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.lg + spacing.safeTopInset,
    paddingBottom: 160,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  chapterNumber: {
    fontFamily: fonts.heading.bold,
    fontSize: 56,
    color: colors.primary.main,
    marginBottom: spacing.sm,
    letterSpacing: -1,
    textShadowColor: colors.shadow.light,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  chapterNumberEnglish: {
    fontFamily: fonts.body.medium,
    fontSize: 15,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  chapterTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 20,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 28,
  },
  themesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  themeTag: {
    backgroundColor: 'rgba(212, 165, 184, 0.3)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  themeText: {
    ...textStyles.caption,
    color: colors.primary.dark,
    textTransform: 'capitalize',
  },
  controlsContainer: {
    backgroundColor: colors.glass.light,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    padding: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  controlLabel: {
    fontFamily: fonts.body.medium,
    fontSize: 15,
    color: colors.text.primary,
    letterSpacing: 0.2,
  },
  sizeButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sizeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeButtonActive: {
    backgroundColor: colors.primary.main,
  },
  sizeButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.secondary,
  },
  sizeButtonTextActive: {
    color: '#fff',
  },
  versesPanel: {
    marginBottom: spacing.lg,
  },
  verseContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  verseNumberContainer: {
    width: 36,
    alignItems: 'center',
    paddingTop: 6,
  },
  verseNumber: {
    fontFamily: fonts.body.bold,
    fontSize: 15,
    color: colors.primary.main,
    opacity: 0.7,
  },
  verseTextContainer: {
    flex: 1,
    paddingLeft: spacing.sm,
  },
  hebrewText: {
    fontFamily: fonts.heading.regular,
    textAlign: 'right',
    color: colors.text.primary,
    marginBottom: spacing.md,
    letterSpacing: 0.3,
  },
  englishText: {
    fontFamily: fonts.body.regular,
    color: colors.text.secondary,
    opacity: 0.9,
    letterSpacing: 0.2,
  },
  attributionContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },
  attributionText: {
    ...textStyles.caption,
    color: colors.text.tertiary,
  },
  attributionLink: {
    color: colors.primary.main,
    textDecorationLine: 'underline',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  navButton: {
    backgroundColor: colors.glass.medium,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  navButtonText: {
    fontFamily: fonts.body.bold,
    fontSize: 15,
    color: colors.primary.dark,
    letterSpacing: 0.3,
  },
  navSpacer: {
    flex: 1,
  },
  dailyBadge: {
    backgroundColor: 'rgba(212, 165, 184, 0.35)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    alignSelf: 'stretch',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 184, 0.5)',
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dailyBadgeComplete: {
    backgroundColor: 'rgba(165, 212, 184, 0.35)',
    borderColor: 'rgba(165, 212, 184, 0.6)',
    shadowColor: colors.semantic.success,
  },
  dailyBadgeText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.primary,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  markCompleteButton: {
    backgroundColor: 'rgba(165, 212, 184, 0.6)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(165, 212, 184, 0.8)',
    alignSelf: 'center',
  },
  markCompleteButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 12,
    color: colors.text.primary,
  },
});
