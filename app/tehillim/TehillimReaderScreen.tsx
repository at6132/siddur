import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Switch, ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
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

export const TehillimReaderScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const psalm = (route.params as any)?.psalm || 1;
  
  const [chapter, setChapter] = useState<TehillimChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEnglish, setShowEnglish] = useState(true);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [isMarkedComplete, setIsMarkedComplete] = useState(false);
  const [isDailyChapter, setIsDailyChapter] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const hasReachedEnd = useRef(false);

  useEffect(() => {
    loadChapter(psalm);
    checkIfDailyChapter(psalm);
  }, [psalm]);

  const checkIfDailyChapter = async (chapterNum: number) => {
    const progress = await DailyTehillimTracker.getTodaysProgress();
    setIsDailyChapter(progress.totalChapters.includes(chapterNum));
    setIsMarkedComplete(progress.chaptersCompleted?.includes(chapterNum) || false);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
    
    if (isCloseToBottom && !hasReachedEnd.current && isDailyChapter && !isMarkedComplete) {
      hasReachedEnd.current = true;
      markChapterComplete();
    }
  };

  const markChapterComplete = async () => {
    if (!isMarkedComplete && isDailyChapter) {
      await DailyTehillimTracker.markChapterComplete(psalm);
      setIsMarkedComplete(true);
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

  const getFontSize = () => {
    switch (fontSize) {
      case 'small': return { hebrew: 18, english: 14 };
      case 'large': return { hebrew: 28, english: 18 };
      default: return { hebrew: 22, english: 16 };
    }
  };

  const renderVerse = (verse: TehillimVerse, index: number) => {
    const sizes = getFontSize();
    
    return (
      <FadeIn key={verse.number} delay={30 * index}>
        <View style={styles.verseContainer}>
          <View style={styles.verseNumberContainer}>
            <Text style={styles.verseNumber}>{verse.number}</Text>
          </View>
          <View style={styles.verseTextContainer}>
            <Text style={[styles.hebrewText, { fontSize: sizes.hebrew, lineHeight: sizes.hebrew * 1.6 }]}>
              {verse.hebrew}
            </Text>
            {showEnglish && verse.english && (
              <Text style={[styles.englishText, { fontSize: sizes.english, lineHeight: sizes.english * 1.5 }]}>
                {verse.english}
              </Text>
            )}
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
        {/* Daily Tehillim Badge */}
        {isDailyChapter && (
          <FadeIn delay={0}>
            <View style={[styles.dailyBadge, isMarkedComplete && styles.dailyBadgeComplete]}>
              <Text style={styles.dailyBadgeText}>
                {isMarkedComplete ? '✓ Completed Today' : 'Today\'s Tehillim'}
              </Text>
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
              <Text style={styles.controlLabel}>English Translation</Text>
              <Switch
                value={showEnglish}
                onValueChange={setShowEnglish}
                trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                thumbColor={showEnglish ? colors.primary.main : colors.neutral[400]}
              />
            </View>
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
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
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
    marginBottom: spacing.lg,
  },
  chapterNumber: {
    fontFamily: fonts.heading.bold,
    fontSize: 48,
    color: colors.primary.main,
    marginBottom: spacing.xs,
  },
  chapterNumberEnglish: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  chapterTitle: {
    ...textStyles.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
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
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  controlLabel: {
    ...textStyles.body,
    color: colors.text.primary,
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
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  verseNumberContainer: {
    width: 32,
    alignItems: 'center',
    paddingTop: 4,
  },
  verseNumber: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.primary.main,
  },
  verseTextContainer: {
    flex: 1,
  },
  hebrewText: {
    fontFamily: fonts.heading.regular,
    textAlign: 'right',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  englishText: {
    ...textStyles.body,
    color: colors.text.secondary,
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
    marginTop: spacing.md,
  },
  navButton: {
    backgroundColor: 'rgba(212, 165, 184, 0.3)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  navButtonText: {
    ...textStyles.bodyBold,
    color: colors.primary.dark,
  },
  navSpacer: {
    flex: 1,
  },
  dailyBadge: {
    backgroundColor: 'rgba(212, 165, 184, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  dailyBadgeComplete: {
    backgroundColor: 'rgba(107, 140, 74, 0.3)',
  },
  dailyBadgeText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 13,
    color: colors.text.primary,
  },
});
