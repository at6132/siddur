/**
 * Hub – Your personal center: Day / Week / Month view, goals, brachos, tehillim, tzedakah,
 * mark day complete, daily goals, gratitude. Seamless UX with subpages.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, withSpring, useSharedValue, runOnJS } from 'react-native-reanimated';
import { FadeIn } from '../../components/animations/FadeIn';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { colors } from '../../src/design/colors';
import {
  getBrachosCount,
  addBrachos,
  getBrachosTotalForRange,
  BRACHOS_PER_TEFILLA,
} from '../../src/storage/BrachosCounterService';
import { DailyTehillimTracker } from '../../src/storage/DailyTehillimTracker';
import { TzedakahTracker } from '../../src/storage/TzedakahTracker';
import { DailyGoalsService } from '../../src/storage/DailyGoalsService';
import { useTheme } from '../../src/design/theme';

export type TimeFrame = 'day' | 'week' | 'month';

const PILL_MARGIN_H = 20;
const PILL_RADIUS = 16;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SEGMENT_WIDTH = (SCREEN_WIDTH - PILL_MARGIN_H * 2 - spacing.md * 2) / 3;
const BUBBLE_RADIUS = 14;
const PILL_BUBBLE_HEIGHT = 28;
const springConfig = { damping: 18, stiffness: 180 };

function getRangeForTimeFrame(tf: TimeFrame): { start: Date; end: Date; days: number; label: string } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (tf === 'day') return { start, end, days: 1, label: 'Today' };
  if (tf === 'week') {
    start.setDate(start.getDate() - 6);
    return { start, end, days: 7, label: 'This week' };
  }
  start.setDate(start.getDate() - 29);
  return { start, end, days: 30, label: 'This month' };
}

function SectionCard({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  const content = <View style={styles.sectionCard}>{children}</View>;
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.85}>{content}</TouchableOpacity>;
  return content;
}

function TimeFramePill({ timeFrame, onSelect }: { timeFrame: TimeFrame; onSelect: (tf: TimeFrame) => void }) {
  const { theme } = useTheme();
  const options: TimeFrame[] = ['day', 'week', 'month'];
  const index = options.indexOf(timeFrame);
  const bubbleX = useSharedValue(index * SEGMENT_WIDTH);
  const dragStartX = useSharedValue(0);
  const snapTo = useCallback((targetIndex: number) => {
    onSelect(options[Math.max(0, Math.min(2, targetIndex))]);
  }, [onSelect]);
  useEffect(() => { bubbleX.value = withSpring(index * SEGMENT_WIDTH, springConfig); }, [index, bubbleX]);
  const panGesture = Gesture.Pan()
    .onStart(() => { dragStartX.value = bubbleX.value; })
    .onUpdate((e) => { bubbleX.value = Math.max(0, Math.min(2 * SEGMENT_WIDTH, dragStartX.value + e.translationX)); })
    .onEnd(() => {
      const targetIndex = Math.max(0, Math.min(2, Math.round((bubbleX.value + (SEGMENT_WIDTH - 4) / 2) / SEGMENT_WIDTH)));
      bubbleX.value = withSpring(targetIndex * SEGMENT_WIDTH, springConfig);
      runOnJS(snapTo)(targetIndex);
    });
  const bubbleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: bubbleX.value }] }));
  const isDark = theme.isDark;
  const glassColors = isDark ? ['rgba(22,19,32,0.92)', 'rgba(18,17,33,0.86)'] : ['rgba(255,255,255,0.72)', 'rgba(255,255,255,0.52)'];
  const bubbleColors = isDark ? ['rgba(255,255,255,0.25)', 'rgba(200,200,255,0.15)'] : ['rgba(255,255,255,0.78)', 'rgba(255,255,255,0.5)'];
  const borderColor = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.75)';
  return (
    <View style={[styles.pillOuter, { marginHorizontal: PILL_MARGIN_H }]}>
      {Platform.OS !== 'web' ? (<><BlurView intensity={92} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /><LinearGradient colors={glassColors} style={StyleSheet.absoluteFill} /></>) : (
        <LinearGradient colors={isDark ? ['rgba(30,29,45,0.9)', 'rgba(24,23,37,0.82)'] : ['rgba(255,255,255,0.88)', 'rgba(255,255,255,0.7)']} style={StyleSheet.absoluteFill} />
      )}
      <View style={[styles.pillBorder, { borderColor }]} />
      <View style={styles.pillRow}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.pillBubble, bubbleStyle]}>
            <LinearGradient colors={bubbleColors} style={[StyleSheet.absoluteFill, { borderRadius: BUBBLE_RADIUS }]} />
            <View style={[styles.pillBubbleBorder, { borderColor, borderRadius: BUBBLE_RADIUS }]} />
          </Animated.View>
        </GestureDetector>
        {options.map((opt) => (
          <TouchableOpacity key={opt} style={styles.pillSegment} onPress={() => onSelect(opt)} activeOpacity={0.8}>
            <Text style={[styles.pillLabel, { color: timeFrame === opt ? theme.colors.primary.main : theme.colors.text.tertiary }, { fontWeight: timeFrame === opt ? '600' : '400' }]}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export const HubOverviewScreen: React.FC = () => {
  const navigation = useNavigation();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('day');
  const [brachosCount, setBrachosCount] = useState(0);
  const [brachosRangeTotal, setBrachosRangeTotal] = useState(0);
  const [tehillimProgress, setTehillimProgress] = useState({ percentComplete: 0, dayName: '', chaptersRemaining: [] as number[], totalChapters: [] as number[] });
  const [tehillimStreak, setTehillimStreak] = useState(0);
  const [tehillimAvgWpm, setTehillimAvgWpm] = useState<number | null>(null);
  const [tehillimDaysInRange, setTehillimDaysInRange] = useState(0);
  const [tzedakahTotal, setTzedakahTotal] = useState(0);
  const [goalsSummary, setGoalsSummary] = useState({ total: 0, completed: 0 });
  const [goalsRangeSummary, setGoalsRangeSummary] = useState<{ daysCompleted: number; totalDays: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [brachosMenuVisible, setBrachosMenuVisible] = useState(false);

  const range = useMemo(() => getRangeForTimeFrame(timeFrame), [timeFrame]);

  const load = useCallback(async () => {
    setLoading(true);
    const { start, end, days } = range;
    if (timeFrame === 'day') {
      const [brachos, tProgress, tStreak, tWpm, tzedakah, summary, tehillimDaysDay] = await Promise.all([
        getBrachosCount(),
        DailyTehillimTracker.getTodaysProgress(),
        DailyTehillimTracker.getStreak(),
        DailyTehillimTracker.getAverageWPM(),
        TzedakahTracker.getTotalForDateRange(start, end),
        DailyGoalsService.getTodaySummary(),
        DailyTehillimTracker.getCompletedDaysInRange(start, end),
      ]);
      setBrachosCount(brachos);
      setBrachosRangeTotal(brachos);
      setTehillimProgress(tProgress);
      setTehillimStreak(tStreak);
      setTehillimAvgWpm(tWpm);
      setTehillimDaysInRange(
        tProgress.goalType === 'whenever' ? tehillimDaysDay : (tProgress.percentComplete === 100 ? 1 : 0)
      );
      setTzedakahTotal(tzedakah);
      setGoalsSummary(summary);
    } else {
      const [brachosToday, brachosRange, tProgress, tStreak, tWpm, tehillimDays, tzedakah, summary, goalsRange] = await Promise.all([
        getBrachosCount(),
        getBrachosTotalForRange(start, end),
        DailyTehillimTracker.getTodaysProgress(),
        DailyTehillimTracker.getStreak(),
        DailyTehillimTracker.getAverageWPM(),
        DailyTehillimTracker.getCompletedDaysInRange(start, end),
        TzedakahTracker.getTotalForDateRange(start, end),
        DailyGoalsService.getTodaySummary(),
        DailyGoalsService.getRangeSummary(start, end),
      ]);
      setBrachosCount(brachosToday);
      setBrachosRangeTotal(brachosRange);
      setTehillimProgress(tProgress);
      setTehillimStreak(tStreak);
      setTehillimAvgWpm(tWpm);
      setTehillimDaysInRange(tehillimDays);
      setTzedakahTotal(tzedakah);
      setGoalsSummary(summary);
      setGoalsRangeSummary(goalsRange);
    }
    setLoading(false);
  }, [timeFrame, range]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [timeFrame]);

  const handleBrachosAdd = async () => {
    const next = await addBrachos(1);
    setBrachosCount(next);
    if (timeFrame === 'day') setBrachosRangeTotal(next);
    else setBrachosRangeTotal(await getBrachosTotalForRange(range.start, range.end));
  };

  const handleBrachosAddTefilla = async (delta: number) => {
    const next = await addBrachos(delta);
    setBrachosCount(next);
    if (timeFrame === 'day') setBrachosRangeTotal(next);
    else setBrachosRangeTotal(await getBrachosTotalForRange(range.start, range.end));
    setBrachosMenuVisible(false);
  };

  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const brachosGoal = timeFrame === 'day' ? 100 : timeFrame === 'week' ? 700 : 3000;
  const brachosSubtitle = timeFrame === 'day' ? 'Goal: 100 a day' : `Goal: ${brachosGoal} in ${range.days} days`;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']} style={StyleSheet.absoluteFill} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.hubTitle}>Hub</Text>
        <Text style={styles.hubSubtitle}>Your day, your growth</Text>

        <TimeFramePill timeFrame={timeFrame} onSelect={setTimeFrame} />

        <Text style={styles.title}>{range.label}</Text>
        <Text style={styles.subtitle}>{timeFrame === 'day' ? dayName : `${range.days} days`}</Text>

        {/* Daily goals – add in morning, check off at night */}
        <FadeIn delay={0}>
          <SectionCard onPress={() => (navigation as any).navigate('DailyGoals')}>
            <Text style={styles.sectionTitle}>
              {timeFrame === 'day' ? 'Daily goals' : timeFrame === 'week' ? 'Goals this week' : 'Goals this month'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {timeFrame === 'day'
                ? 'Set your intentions in the morning, check them off at night'
                : `${range.label} • ${range.days} days`}
            </Text>
            <View style={styles.row}>
              <Text style={styles.bigNumber}>
                {timeFrame === 'day'
                  ? `${goalsSummary.completed}/${goalsSummary.total}`
                  : goalsRangeSummary != null
                    ? `${goalsRangeSummary.daysCompleted}/${goalsRangeSummary.totalDays}`
                    : '—'}
              </Text>
              {timeFrame === 'day' && <Text style={styles.streakBadge}>done today</Text>}
              {timeFrame !== 'day' && goalsRangeSummary != null && (
                <Text style={styles.streakBadge}>days completed</Text>
              )}
            </View>
            <Text style={styles.linkHint}>Tap to add goals & check off →</Text>
          </SectionCard>
        </FadeIn>

        {/* Brachos */}
        <FadeIn delay={100}>
          <SectionCard onPress={() => (navigation as any).navigate('Library')}>
            <View style={styles.row}>
              <View>
                <Text style={styles.sectionTitle}>Brachos consistency</Text>
                <Text style={styles.sectionSubtitle}>{brachosSubtitle}</Text>
              </View>
              <View style={styles.rightRow}>
                <Text style={styles.bigNumber}>{brachosRangeTotal}/{brachosGoal}</Text>
                {timeFrame === 'day' && (
                  <>
                    <TouchableOpacity
                      style={styles.plusButton}
                      onPress={handleBrachosAdd}
                    >
                      <Text style={styles.plusButtonText}>+1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.brachosMenuButton}
                      onPress={() => setBrachosMenuVisible(true)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.brachosMenuButtonText}>⋮</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </SectionCard>
        </FadeIn>

        {/* Brachos 3-dots menu: Add Shacharis / Mincha / Maariv */}
        <Modal visible={brachosMenuVisible} transparent animationType="fade">
          <Pressable style={styles.brachosMenuBackdrop} onPress={() => setBrachosMenuVisible(false)}>
            <Pressable style={styles.brachosMenuBox} onPress={() => {}}>
              <TouchableOpacity
                style={styles.brachosMenuItem}
                onPress={() => handleBrachosAddTefilla(BRACHOS_PER_TEFILLA.shacharis)}
              >
                <Text style={styles.brachosMenuItemTitle}>Add Shacharis</Text>
                <Text style={styles.brachosMenuItemSub}>+{BRACHOS_PER_TEFILLA.shacharis} brachos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.brachosMenuItem}
                onPress={() => handleBrachosAddTefilla(BRACHOS_PER_TEFILLA.mincha)}
              >
                <Text style={styles.brachosMenuItemTitle}>Add Mincha</Text>
                <Text style={styles.brachosMenuItemSub}>+{BRACHOS_PER_TEFILLA.mincha} brachos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.brachosMenuItem, styles.brachosMenuItemLast]}
                onPress={() => handleBrachosAddTefilla(BRACHOS_PER_TEFILLA.maariv)}
              >
                <Text style={styles.brachosMenuItemTitle}>Add Maariv</Text>
                <Text style={styles.brachosMenuItemSub}>+{BRACHOS_PER_TEFILLA.maariv} brachos</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Tehillim */}
        <FadeIn delay={150}>
          <SectionCard onPress={() => (navigation as any).navigate('TehillimList')}>
            <Text style={styles.sectionTitle}>Tehillim consistency</Text>
            <Text style={styles.sectionSubtitle}>
              {timeFrame === 'day' ? (tehillimProgress.dayName === 'Tehillim' ? 'Tehillim' : `${tehillimProgress.dayName}'s Tehillim`) : `${range.label} • days completed`}
            </Text>
            <View style={styles.row}>
              {timeFrame === 'day' ? <Text style={styles.bigNumber}>{tehillimProgress.percentComplete}%</Text> : <Text style={styles.bigNumber}>{tehillimDaysInRange}/{range.days}</Text>}
              {tehillimStreak > 0 && <Text style={styles.streakBadge}>{tehillimStreak} day streak</Text>}
              {tehillimAvgWpm != null && <Text style={styles.streakBadge}>Avg {tehillimAvgWpm} WPM</Text>}
            </View>
            <Text style={styles.linkHint}>Tap to open Tehillim</Text>
          </SectionCard>
        </FadeIn>

        {/* Tzedakah */}
        <FadeIn delay={200}>
          <SectionCard onPress={() => (navigation as any).navigate('Tzedakah')}>
            <Text style={styles.sectionTitle}>Tzedakah given</Text>
            <Text style={styles.sectionSubtitle}>{range.label}</Text>
            <Text style={styles.bigNumber}>
              {tzedakahTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, style: 'currency', currency: 'USD' })}
            </Text>
            <Text style={styles.linkHint}>Tap to view history & add</Text>
          </SectionCard>
        </FadeIn>

        {/* Daily gratitude */}
        <FadeIn delay={350}>
          <SectionCard onPress={() => (navigation as any).navigate('Gratitude')}>
            <Text style={styles.sectionTitle}>Daily gratitude</Text>
            <Text style={styles.sectionSubtitle}>What are you thankful for today?</Text>
            <Text style={styles.linkHint}>Tap to view & add entries →</Text>
          </SectionCard>
        </FadeIn>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.xl + spacing.safeTopInset },
  hubTitle: { fontFamily: fonts.heading.bold, fontSize: 32, color: colors.text.primary, marginBottom: 4 },
  hubSubtitle: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.text.secondary, marginBottom: spacing.lg },
  title: { fontFamily: fonts.heading.bold, fontSize: 28, color: colors.text.primary, marginBottom: 4 },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.text.secondary, marginBottom: spacing.lg },
  sectionCard: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.85)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  sectionTitle: { fontFamily: fonts.heading.semibold, fontSize: 18, color: colors.text.primary, marginBottom: 4 },
  sectionSubtitle: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.text.secondary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bigNumber: { fontFamily: fonts.heading.bold, fontSize: 24, color: colors.primary.dark },
  streakBadge: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.text.secondary },
  linkHint: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.text.tertiary, marginTop: spacing.xs },
  inlineLink: { marginTop: spacing.xs },
  inlineLinkText: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.primary.main },
  plusButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  plusButtonText: { fontFamily: fonts.body.semibold, fontSize: 14, color: '#fff' },
  brachosMenuButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brachosMenuButtonText: { fontFamily: fonts.body.regular, fontSize: 18, color: colors.text.secondary, fontWeight: '700' },
  brachosMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  brachosMenuBox: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    minWidth: 240,
    overflow: 'hidden',
    ...(Platform.OS !== 'web' && { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 }),
  },
  brachosMenuItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  brachosMenuItemLast: { borderBottomWidth: 0 },
  brachosMenuItemTitle: { fontFamily: fonts.heading.semibold, fontSize: 16, color: colors.text.primary },
  brachosMenuItemSub: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  pillOuter: {
    alignSelf: 'center',
    width: SCREEN_WIDTH - PILL_MARGIN_H * 2,
    borderRadius: PILL_RADIUS,
    overflow: 'hidden',
    marginBottom: spacing.md,
    minHeight: 36,
    ...(Platform.OS !== 'web' && { shadowColor: '#2C2C2C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 }),
    elevation: 4,
  },
  pillBorder: { ...StyleSheet.absoluteFillObject, borderRadius: PILL_RADIUS, borderWidth: 1.5 },
  pillRow: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingVertical: 4, paddingHorizontal: 4 },
  pillSegment: { width: SEGMENT_WIDTH, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  pillBubble: { position: 'absolute', left: 4, top: 4, width: SEGMENT_WIDTH - 4, height: PILL_BUBBLE_HEIGHT, borderRadius: BUBBLE_RADIUS, overflow: 'hidden' },
  pillBubbleBorder: { ...StyleSheet.absoluteFillObject, borderWidth: 1.5 },
  pillLabel: { fontFamily: fonts.body.medium, fontSize: 13, letterSpacing: 0.2 },
});
