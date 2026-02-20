import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { FadeIn } from '../../components/animations/FadeIn';
import { ReaderChrome, READER_CHROME_HEADER_HEIGHT_APPROX } from '../../components/reader/ReaderChrome';
import { ReaderToolbar, HEBREW_FONT_SIZES, HEBREW_LINE_HEIGHTS } from '../../components/reader/ReaderToolbar';
import { ReaderAutoscrollBar } from '../../components/reader/ReaderAutoscrollBar';
import { useAutoscroll } from '../../components/reader/useAutoscroll';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles, fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import { TehillimService } from '../../src/content/tehillim/TehillimService';
import { TehillimChapter, TehillimVerse } from '../../src/content/tehillim/types';
import { DailyTehillimTracker } from '../../src/storage/DailyTehillimTracker';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import type { DisplayPreferences } from '../../src/types/preferences';

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
  const { theme } = useTheme();
  const psalm = (route.params as any)?.psalm || 1;
  
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const [chapter, setChapter] = useState<TehillimChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [textSize, setTextSize] = useState<DisplayPreferences['textSize']>('medium');
  const [showEnglish, setShowEnglish] = useState(false);
  const [isMarkedComplete, setIsMarkedComplete] = useState(false);
  const [isDailyChapter, setIsDailyChapter] = useState(false);
  const [isWheneverMode, setIsWheneverMode] = useState(false);
  const [autoscrollPlaying, setAutoscrollPlaying] = useState(false);
  const [autoscrollSpeed, setAutoscrollSpeed] = useState(1);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const readingStartTime = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const prefs = await UserPreferencesService.getPreferences();
      if (prefs?.display?.textSize) setTextSize(prefs.display.textSize);
      // English feature disabled – always default to false
      // setShowEnglish(prefs?.display?.showTransliteration ?? false);
      if (prefs?.autoscrollSpeed != null) setAutoscrollSpeed(Math.max(0.5, Math.min(2, prefs.autoscrollSpeed)));
    })();
  }, []);

  useAutoscroll(scrollRef, scrollYRef, contentHeightRef, viewportHeight, autoscrollPlaying, autoscrollSpeed);

  useEffect(() => {
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

  const renderVerse = (verse: TehillimVerse, index: number) => {
    const size = HEBREW_FONT_SIZES[textSize];
    const lineHeight = HEBREW_LINE_HEIGHTS[textSize] * 1.15; // slightly more breathable
    const isLast = index === chapter!.verses.length - 1;
    return (
      <View key={verse.number} style={[styles.verseBlock, !isLast && styles.verseBlockBorder]}>
        <Text style={[styles.hebrewVerse, { fontSize: size, lineHeight }]} selectable>
          {cleanVerseText(verse.hebrew)}
        </Text>
        {showEnglish && verse.english && (
          <Text style={[styles.englishVerse, { fontSize: size * 0.88, lineHeight: lineHeight * 0.9 }]} selectable>
            {verse.english}
          </Text>
        )}
        <View style={styles.verseLabelRow}>
          <Text style={styles.verseLabel}>{verse.number}</Text>
        </View>
      </View>
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
      <ReaderChrome
        title={chapter ? `Psalm ${chapter.number}` : `Psalm ${psalm}`}
        onBack={() => navigation.goBack()}
        topInset={insets.top}
      >
        <ReaderToolbar
          textSize={textSize}
          onTextSizeChange={setTextSize}
          showEnglish={showEnglish}
          onShowEnglishChange={setShowEnglish}
          showEnglishToggle={true}
        />
      </ReaderChrome>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + READER_CHROME_HEADER_HEIGHT_APPROX + spacing.lg, paddingBottom: 160 + 88 }]}
        showsVerticalScrollIndicator={true}
        onScroll={(e) => {
          scrollYRef.current = e.nativeEvent.contentOffset.y;
        }}
        onContentSizeChange={(_, h) => { contentHeightRef.current = h; }}
        scrollEventThrottle={16}
        bounces={true}
        nestedScrollEnabled={true}
      >
        {/* Verses */}
        <View style={styles.readingCard}>
          <View style={styles.readingCardHeader}>
            <Text style={styles.readingCardTitle}>Psalm {chapter.number}</Text>
            {chapter.title && (
              <Text style={styles.readingCardSubtitle} numberOfLines={2}>{chapter.title}</Text>
            )}
          </View>
          {chapter.verses.map((verse, index) => renderVerse(verse, index))}
        </View>

        {/* Attribution */}
        <View style={styles.attributionContainer}>
          <Text style={styles.attributionText}>
            Texts provided by{' '}
            <Text style={styles.attributionLink}>Sefaria.org</Text>
          </Text>
        </View>

        {/* Completion badge & button — at bottom of all text */}
        {isDailyChapter && (
          <FadeIn delay={0}>
            <View style={[styles.dailyBadge, isMarkedComplete && styles.dailyBadgeComplete]}>
              <Text style={[styles.dailyBadgeText, isMarkedComplete && styles.dailyBadgeCompleteText]}>
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
      <ReaderAutoscrollBar
        playing={autoscrollPlaying}
        onPlayingChange={setAutoscrollPlaying}
        speed={autoscrollSpeed}
        onSpeedChange={setAutoscrollSpeed}
        bottomInset={insets.bottom}
      />
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 160,
    flexGrow: 1,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
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
  readingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  readingCardHeader: {
    paddingBottom: spacing.lg,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  readingCardTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 15,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  readingCardSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  verseBlock: {
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.sm,
  },
  verseBlockBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  hebrewVerse: {
    fontFamily: fonts.heading.regular,
    color: colors.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  englishVerse: {
    fontFamily: fonts.body.regular,
    color: colors.text.secondary,
    textAlign: 'left',
    marginTop: spacing.sm,
    lineHeight: 24,
    opacity: 0.92,
  },
  verseLabelRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  verseLabel: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.text.tertiary,
    opacity: 0.85,
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
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  navSpacer: {
    flex: 1,
  },
  dailyBadge: {
    backgroundColor: 'rgba(212, 165, 184, 0.22)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 184, 0.35)',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dailyBadgeComplete: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    opacity: 0.92,
  },
  dailyBadgeCompleteText: {
    color: colors.text.tertiary,
    fontFamily: fonts.body.medium,
  },
  dailyBadgeText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.text.secondary,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  markCompleteButton: {
    backgroundColor: 'rgba(80, 180, 120, 0.85)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(60, 160, 100, 0.5)',
  },
  markCompleteButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 13,
    color: '#fff',
  },
  navButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    minWidth: 120,
    alignItems: 'center',
  },
  navButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.primary.dark,
    letterSpacing: 0.2,
  },
});
