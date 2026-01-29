import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Switch } from 'react-native';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const TehillimReaderScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const psalm = (route.params as any)?.psalm || 1;
  
  const [chapter, setChapter] = useState<TehillimChapter | null>(null);
  const [showEnglish, setShowEnglish] = useState(true);
  const [showTransliteration, setShowTransliteration] = useState(false);

  useEffect(() => {
    const chapterData = TehillimService.getChapter(psalm);
    setChapter(chapterData);
    
    navigation.setOptions({
      title: `תהלים ${chapterData?.hebrewNumber || psalm}`,
    });
  }, [psalm, navigation]);

  const renderVerse = (verse: TehillimVerse, index: number) => (
    <FadeIn key={verse.number} delay={50 * index}>
      <View style={styles.verseContainer}>
        <View style={styles.verseNumberContainer}>
          <Text style={styles.verseNumber}>{verse.number}</Text>
        </View>
        <View style={styles.verseTextContainer}>
          <Text style={styles.hebrewText}>{verse.hebrew}</Text>
          {showTransliteration && verse.transliteration && (
            <Text style={styles.transliterationText}>{verse.transliteration}</Text>
          )}
          {showEnglish && verse.english && (
            <Text style={styles.englishText}>{verse.english}</Text>
          )}
        </View>
      </View>
    </FadeIn>
  );

  if (!chapter) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
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
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
              <Text style={styles.controlLabel}>Transliteration</Text>
              <Switch
                value={showTransliteration}
                onValueChange={setShowTransliteration}
                trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                thumbColor={showTransliteration ? colors.primary.main : colors.neutral[400]}
              />
            </View>
          </View>
        </FadeIn>

        {/* Verses */}
        <GlassPanel padding="lg" borderRadius="2xl" style={styles.versesPanel}>
          {chapter.verses.map((verse, index) => renderVerse(verse, index))}
        </GlassPanel>

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          {psalm > 1 && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigation.setParams({ psalm: psalm - 1 } as any)}
            >
              <Text style={styles.navButtonText}>← Previous</Text>
            </TouchableOpacity>
          )}
          <View style={styles.navSpacer} />
          {psalm < 150 && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigation.setParams({ psalm: psalm + 1 } as any)}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 22,
    lineHeight: 36,
    textAlign: 'right',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  transliterationText: {
    fontFamily: fonts.body.italic,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  englishText: {
    ...textStyles.body,
    color: colors.text.secondary,
    lineHeight: 24,
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
});
