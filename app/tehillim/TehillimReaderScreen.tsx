import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Platform, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ReaderChrome, READER_CHROME_HEADER_HEIGHT_APPROX } from '../../components/reader/ReaderChrome';
import { ReaderToolbar, HEBREW_FONT_SIZES, HEBREW_LINE_HEIGHTS } from '../../components/reader/ReaderToolbar';
import { ReaderAutoscrollBar } from '../../components/reader/ReaderAutoscrollBar';
import { useAutoscroll } from '../../components/reader/useAutoscroll';
import { Screen, GlassButton } from '../../components/ui';
import { PracticeHeader } from '../../components/hub/PracticeKit';
import { PressableScale } from '../../components/settings/SettingsKit';
import { useTheme } from '../../src/design/theme';
import { TehillimService } from '../../src/content/tehillim/TehillimService';
import { TehillimChapter, TehillimVerse, TehillimGoalType } from '../../src/content/tehillim/types';
import { SefariaService } from '../../src/services/SefariaService';
import { DailyTehillimTracker } from '../../src/storage/DailyTehillimTracker';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import type { DisplayPreferences } from '../../src/types/preferences';
import { getAnonymousId } from '../../src/analytics/IdentityService';
import { completeTehillimPereks, sendPrivatePerekCompleted } from '../../src/api/tehillimApi';
import { analytics } from '../../src/analytics';
import { TEHILLIM_EVENTS } from '../../src/analytics/types';

/** Strip HTML entities and Sefaria end markers (e.g. {פ}) so they don't show as literal text. */
function cleanVerseText(text: string | undefined): string {
  if (!text) return '';
  return SefariaService.stripSefariaEndMarkers(
    text
      .replace(/&thinsp;/g, ' ')
      .replace(/&#x2009;/g, ' ')
      .replace(/\u2009/g, ' ')
  );
}

export const TehillimReaderScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { spacing, type, hebrew } = theme.tokens;
  const psalm = (route.params as any)?.psalm || 1;
  const campaignId = (route.params as any)?.campaignId as string | undefined;

  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const [chapter, setChapter] = useState<TehillimChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [textSize, setTextSize] = useState<DisplayPreferences['textSize']>('medium');
  const [showEnglish, setShowEnglish] = useState(false);
  const [isMarkedComplete, setIsMarkedComplete] = useState(false);
  const [isDailyChapter, setIsDailyChapter] = useState(false);
  const [isWheneverMode, setIsWheneverMode] = useState(false);
  const [goalType, setGoalType] = useState<TehillimGoalType>('weekly');
  const [autoscrollPlaying, setAutoscrollPlaying] = useState(false);
  const [autoscrollSpeed, setAutoscrollSpeed] = useState(1);
  const [campaignMarking, setCampaignMarking] = useState(false);
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
    const currentBookCompleted = await DailyTehillimTracker.getCurrentBookCompleted();
    setGoalType(progress.goalType);
    const whenever = progress.goalType === 'whenever';
    setIsWheneverMode(whenever);
    setIsDailyChapter(whenever || progress.totalChapters.includes(chapterNum));
    setIsMarkedComplete(currentBookCompleted.includes(chapterNum));
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
    const currentBookCompleted = await DailyTehillimTracker.getCurrentBookCompleted();
    const canCompleteOutsideSchedule =
      progress.goalType === 'weekly' || progress.goalType === 'monthly';
    const inSchedule =
      progress.goalType === 'whenever' ||
      progress.totalChapters.includes(psalm) ||
      canCompleteOutsideSchedule;
    const alreadyComplete = currentBookCompleted.includes(psalm);
    if (inSchedule && !alreadyComplete) {
      const start = readingStartTime.current ?? Date.now();
      const durationMs = Math.max(1000, Date.now() - start);
      const durationMinutes = durationMs / 60000;
      const wordCount = getWordCount() || 120;
      await DailyTehillimTracker.markChapterComplete(psalm, {
        durationMinutes,
        wordCount,
      });
      const anonymousId = await getAnonymousId();
      await sendPrivatePerekCompleted(psalm, anonymousId);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsMarkedComplete(true);
      if (progress.goalType === 'whenever' || progress.totalChapters.includes(psalm)) {
        setIsDailyChapter(true);
      }
    }
  };

  const markCampaignComplete = async () => {
    if (!campaignId) return;
    setCampaignMarking(true);
    try {
      const participantId = await getAnonymousId();
      await completeTehillimPereks(campaignId, [psalm], participantId);
      analytics.track(TEHILLIM_EVENTS.PEREK_COMPLETED, { perek_number: psalm, source: 'shared', campaign_id: campaignId });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (e) {
      console.warn('Campaign complete failed:', e);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setCampaignMarking(false);
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

  const goToPsalm = (next: number) => {
    navigation.setParams({ psalm: next } as any);
    loadChapter(next);
  };

  const renderVerse = (verse: TehillimVerse, index: number) => {
    const size = HEBREW_FONT_SIZES[textSize];
    const lineHeight = HEBREW_LINE_HEIGHTS[textSize] * 1.15; // slightly more breathable
    const isLast = index === chapter!.verses.length - 1;
    return (
      <View
        key={verse.number}
        style={{
          paddingVertical: spacing.md,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.neutral[300],
        }}
      >
        <Text
          style={{
            fontFamily: hebrew.fonts.regular,
            fontSize: size,
            lineHeight,
            color: theme.colors.text.primary,
            textAlign: 'right',
            writingDirection: 'rtl',
          }}
          selectable
        >
          {cleanVerseText(verse.hebrew)}
        </Text>
        {showEnglish && verse.english ? (
          <Text
            style={[
              type.textStyles.body,
              {
                fontSize: size * 0.88,
                lineHeight: lineHeight * 0.9,
                color: theme.colors.text.secondary,
                marginTop: spacing.sm,
              },
            ]}
            selectable
          >
            {cleanVerseText(verse.english)}
          </Text>
        ) : null}
        <Text
          style={[
            type.textStyles.caption,
            { color: theme.colors.text.tertiary, textAlign: 'right', marginTop: spacing.xs },
          ]}
        >
          {verse.number}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <Screen
        state="loading"
        header={<PracticeHeader onBack={() => navigation.goBack()} />}
      />
    );
  }

  if (!chapter) {
    return (
      <Screen
        state="error"
        errorMessage="Chapter not found"
        onRetry={() => loadChapter(psalm)}
        header={<PracticeHeader onBack={() => navigation.goBack()} />}
      />
    );
  }

  const showFlexibleCompletion = goalType === 'weekly' || goalType === 'monthly';
  const showPersonalCompletion = isDailyChapter || isMarkedComplete || showFlexibleCompletion;

  const completionStatus = isMarkedComplete
    ? (isWheneverMode ? 'Perek complete' : 'Completed today')
    : isWheneverMode
      ? 'Say this perek whenever you can'
      : isDailyChapter
        ? "Today's Tehillim"
        : "Outside today's cycle";

  return (
    <Screen
      contentStyle={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
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
          style={[{ flex: 1 }, Platform.OS === 'web' ? ({ overflow: 'auto', minHeight: 0 } as any) : null]}
          contentContainerStyle={{
            paddingHorizontal: spacing.gutter,
            paddingTop: insets.top + READER_CHROME_HEADER_HEIGHT_APPROX + spacing.lg,
            paddingBottom: insets.bottom + spacing['4xl'] * 2,
            flexGrow: 1,
            maxWidth: spacing['4xl'] * 7,
            alignSelf: 'center',
            width: '100%',
          }}
          showsVerticalScrollIndicator
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          onContentSizeChange={(_, h) => { contentHeightRef.current = h; }}
          scrollEventThrottle={16}
          bounces
          nestedScrollEnabled
        >
          {/* Chapter heading */}
          <View
            style={{
              paddingBottom: spacing.md,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.colors.neutral[300],
            }}
          >
            <Text style={[type.textStyles.h3, { color: theme.colors.text.primary }]}>
              Psalm {chapter.number}
            </Text>
            {chapter.title ? (
              <Text
                style={[type.textStyles.bodySmall, { color: theme.colors.text.secondary, marginTop: spacing.xs }]}
                numberOfLines={2}
              >
                {chapter.title}
              </Text>
            ) : null}
          </View>

          {chapter.verses.map((verse, index) => renderVerse(verse, index))}

          <Text
            style={[
              type.textStyles.caption,
              { color: theme.colors.text.tertiary, textAlign: 'center', marginVertical: spacing.lg },
            ]}
          >
            Texts provided by Sefaria.org
          </Text>

          {/* Completion: only for the context you opened from (shared page or personal daily) */}
          {campaignId ? (
            <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
              <Text style={[type.textStyles.bodyBold, { color: theme.colors.text.primary }]}>
                Shared Tehillim page
              </Text>
              <GlassButton
                title="Mark complete and return"
                onPress={markCampaignComplete}
                loading={campaignMarking}
                disabled={campaignMarking}
              />
            </View>
          ) : showPersonalCompletion ? (
            <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                {isMarkedComplete ? (
                  <Ionicons name="checkmark-circle" size={type.fontSize.xl} color={theme.colors.semantic.success} />
                ) : null}
                <Text
                  style={[
                    type.textStyles.bodyBold,
                    { color: isMarkedComplete ? theme.colors.text.secondary : theme.colors.text.primary },
                  ]}
                >
                  {completionStatus}
                </Text>
              </View>
              {!isMarkedComplete ? (
                <GlassButton
                  title={isWheneverMode ? 'Complete perek' : 'Mark complete'}
                  onPress={markChapterComplete}
                />
              ) : null}
            </View>
          ) : null}

          {/* Previous / next */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
            {psalm > 1 ? (
              <PressableScale
                onPress={() => goToPsalm(psalm - 1)}
                accessibilityLabel="Previous psalm"
                style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: spacing.xs }}
              >
                <Ionicons name="chevron-back" size={type.fontSize.lg} color={theme.colors.primary.dark} />
                <Text style={[type.textStyles.label, { color: theme.colors.primary.dark, fontSize: type.fontSize.base }]}>
                  Previous
                </Text>
              </PressableScale>
            ) : <View />}
            {psalm < 150 ? (
              <PressableScale
                onPress={() => goToPsalm(psalm + 1)}
                accessibilityLabel="Next psalm"
                style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: spacing.xs }}
              >
                <Text style={[type.textStyles.label, { color: theme.colors.primary.dark, fontSize: type.fontSize.base }]}>
                  Next
                </Text>
                <Ionicons name="chevron-forward" size={type.fontSize.lg} color={theme.colors.primary.dark} />
              </PressableScale>
            ) : <View />}
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
    </Screen>
  );
};
