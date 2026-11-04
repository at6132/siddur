/**
 * Hub – at-a-glance practice stats and quick navigation.
 * Glass practice cards + liquid-glass timeframe; brachos sheet stays native pageSheet.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Modal, ScrollView, Platform, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/design/theme';
import { Screen, Section, ListRow, Chip, GlassButton } from '../../components/ui';
import { BrandGlassTile } from '../../components/ui/BrandGlassTile';
import { LiquidGlassSegmentedControl } from '../../components/navigation/LiquidGlassSegmentedControl';
import { MiniProgressBar } from '../../components/hub/MiniProgressBar';
import { GroupLabel } from '../../components/hub/PracticeKit';
import { fonts } from '../../src/design/typography';
import { colorWithAlpha } from '../../src/design/colorAlpha';
import {
  getBrachosCount,
  addBrachos,
  getBrachosTotalForRange,
  BRACHOS_PER_TEFILLA,
} from '../../src/storage/BrachosCounterService';
import { DailyTehillimTracker } from '../../src/storage/DailyTehillimTracker';
import { TzedakahTracker } from '../../src/storage/TzedakahTracker';
import { DailyGoalsService } from '../../src/storage/DailyGoalsService';

type TimeFrame = 'day' | 'week' | 'month';

const TIME_FRAME_TABS: { key: TimeFrame; label: string }[] = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export const HubOverviewScreen: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { spacing, type, radii } = theme.tokens;
  const navigation = useNavigation();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('day');
  const [loading, setLoading] = useState(true);
  const [brachosCount, setBrachosCount] = useState(0);
  const [brachosTotal, setBrachosTotal] = useState(0);
  const [tehillimProgress, setTehillimProgress] = useState({ percentComplete: 0, dayName: '' });
  const [tehillimStreak, setTehillimStreak] = useState(0);
  const [tehillimDaysCompleted, setTehillimDaysCompleted] = useState(0);
  const [tzedakahTotal, setTzedakahTotal] = useState(0);
  const [goalsSummary, setGoalsSummary] = useState({ total: 0, completed: 0 });
  const [goalsRangeSummary, setGoalsRangeSummary] = useState<{
    daysCompleted: number;
    totalDays: number;
  } | null>(null);
  const [brachosMenuVisible, setBrachosMenuVisible] = useState(false);

  const getDateRange = useCallback((tf: TimeFrame) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (tf === 'week') start.setDate(start.getDate() - 6);
    else if (tf === 'month') start.setDate(start.getDate() - 29);
    const days = tf === 'day' ? 1 : tf === 'week' ? 7 : 30;
    return { start, end, days };
  }, []);

  const load = useCallback(async () => {
    const { start, end } = getDateRange(timeFrame);

    if (timeFrame === 'day') {
      const [brachos, tProgress, tStreak, tzedakah, goals] = await Promise.all([
        getBrachosCount(),
        DailyTehillimTracker.getTodaysProgress(),
        DailyTehillimTracker.getStreak(),
        TzedakahTracker.getTotalForDateRange(start, end),
        DailyGoalsService.getTodaySummary(),
      ]);
      setBrachosCount(brachos);
      setBrachosTotal(brachos);
      setTehillimProgress(tProgress);
      setTehillimStreak(tStreak);
      setTehillimDaysCompleted(tProgress.percentComplete === 100 ? 1 : 0);
      setTzedakahTotal(tzedakah);
      setGoalsSummary(goals);
      setGoalsRangeSummary(null);
    } else {
      const [brachos, brachosRange, tProgress, tStreak, tehillimDays, tzedakah, goals, goalsRange] =
        await Promise.all([
          getBrachosCount(),
          getBrachosTotalForRange(start, end),
          DailyTehillimTracker.getTodaysProgress(),
          DailyTehillimTracker.getStreak(),
          DailyTehillimTracker.getCompletedDaysInRange(start, end),
          TzedakahTracker.getTotalForDateRange(start, end),
          DailyGoalsService.getTodaySummary(),
          DailyGoalsService.getRangeSummary(start, end),
        ]);
      setBrachosCount(brachos);
      setBrachosTotal(brachosRange);
      setTehillimProgress(tProgress);
      setTehillimStreak(tStreak);
      setTehillimDaysCompleted(tehillimDays);
      setTzedakahTotal(tzedakah);
      setGoalsSummary(goals);
      setGoalsRangeSummary(goalsRange);
    }
    setLoading(false);
  }, [timeFrame, getDateRange]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useEffect(() => {
    load();
  }, [timeFrame]);

  const handleBrachosAdd = async (amount: number) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const next = await addBrachos(amount);
    setBrachosCount(next);
    if (timeFrame === 'day') setBrachosTotal(next);
    else {
      const { start, end } = getDateRange(timeFrame);
      setBrachosTotal(await getBrachosTotalForRange(start, end));
    }
    setBrachosMenuVisible(false);
  };

  const { days } = getDateRange(timeFrame);
  const brachosGoal = timeFrame === 'day' ? 100 : timeFrame === 'week' ? 700 : 3000;
  const dayName = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const goalsValue =
    timeFrame === 'day'
      ? `${goalsSummary.completed}/${goalsSummary.total || 0}`
      : goalsRangeSummary
        ? `${goalsRangeSummary.daysCompleted}/${goalsRangeSummary.totalDays}`
        : '0/0';

  const goalsProgress =
    timeFrame === 'day'
      ? goalsSummary.total > 0
        ? goalsSummary.completed / goalsSummary.total
        : 0
      : goalsRangeSummary && goalsRangeSummary.totalDays > 0
        ? goalsRangeSummary.daysCompleted / goalsRangeSummary.totalDays
        : 0;

  const tehillimValue =
    timeFrame === 'day' ? `${tehillimProgress.percentComplete}%` : `${tehillimDaysCompleted}/${days}`;
  const tehillimSubtitle =
    timeFrame === 'day'
      ? tehillimStreak > 0
        ? `${tehillimStreak} day streak`
        : tehillimProgress.dayName || 'Today’s perakim'
      : 'days completed';
  const tehillimProgressPct =
    timeFrame === 'day'
      ? tehillimProgress.percentComplete / 100
      : days > 0
        ? tehillimDaysCompleted / days
        : 0;

  const brachosProgress = Math.min(1, brachosTotal / brachosGoal);
  const timeFrameIndex = TIME_FRAME_TABS.findIndex((t) => t.key === timeFrame);

  const brachosOptions: { key: string; title: string; amount: number }[] = [
    { key: 'one', title: 'One bracha', amount: 1 },
    { key: 'shacharis', title: 'Shacharis', amount: BRACHOS_PER_TEFILLA.shacharis },
    { key: 'mincha', title: 'Mincha', amount: BRACHOS_PER_TEFILLA.mincha },
    { key: 'maariv', title: 'Maariv', amount: BRACHOS_PER_TEFILLA.maariv },
  ];

  const PRACTICE_CARD_HEIGHT = 148;

  const practiceCard = (
    title: string,
    value: string,
    subtitle: string,
    progress: number,
    tint: 'rose' | 'sky' | 'lavender' | 'gold' | 'sage',
    icon: React.ComponentProps<typeof Ionicons>['name'],
    onPress: () => void,
    extra?: React.ReactNode,
  ) => (
    <View style={[styles.half, { height: PRACTICE_CARD_HEIGHT }]}>
      <BrandGlassTile
        title={title}
        tint={tint}
        compact
        fill
        onPress={onPress}
        style={{ height: '100%' }}
      >
        <View style={styles.practiceInner}>
          <View style={styles.cardTop}>
            <View
              style={[
                styles.iconWell,
                {
                  backgroundColor: colorWithAlpha(
                    theme.colors.background.primary,
                    theme.isDark ? 0.18 : 0.45,
                  ),
                  borderRadius: radii.md,
                },
              ]}
            >
              <Ionicons name={icon} size={18} color={theme.colors.primary.dark} />
            </View>
            {extra ?? <View style={styles.extraSpacer} />}
          </View>
          <View style={styles.practiceCopy}>
            <Text
              style={{
                fontFamily: fonts.heading.bold,
                fontSize: 28,
                color: theme.colors.text.primary,
                letterSpacing: 0.2,
                lineHeight: 32,
              }}
              numberOfLines={1}
            >
              {loading ? '—' : value}
            </Text>
            <Text
              style={{
                fontFamily: fonts.body.semibold,
                fontSize: 13,
                color: theme.colors.text.primary,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              style={{
                fontFamily: fonts.body.regular,
                fontSize: 12,
                color: theme.colors.text.secondary,
                marginTop: 2,
                minHeight: 16,
              }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          </View>
          <View style={styles.progressSlot}>
            <MiniProgressBar progress={loading ? 0 : progress} />
          </View>
        </View>
      </BrandGlassTile>
    </View>
  );

  const sectionLabel = (label: string) => (
    <Text
      style={[
        type.textStyles.caption,
        {
          color: theme.colors.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: type.letterSpacing.wider,
          marginBottom: spacing.sm,
          marginTop: spacing.md,
          fontFamily: fonts.body.semibold,
        },
      ]}
    >
      {label}
    </Text>
  );

  return (
    <Screen
      scroll
      bottomExtra={spacing['3xl'] + spacing.lg}
      header={
        <View style={{ paddingBottom: spacing.sm }}>
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: fonts.heading.bold,
              fontSize: 36,
              letterSpacing: 0.3,
              color: theme.colors.text.primary,
            }}
          >
            {`Good ${getTimeOfDay()}`}
          </Text>
          <Text
            style={[
              type.textStyles.body,
              { color: theme.colors.text.secondary, marginTop: spacing.xs },
            ]}
          >
            {dayName}
          </Text>
        </View>
      }
    >
      <View style={{ marginBottom: spacing.md, alignItems: 'center' }}>
        <LiquidGlassSegmentedControl
          tabs={TIME_FRAME_TABS}
          activeIndex={Math.max(0, timeFrameIndex)}
          onIndexChange={(index) => {
            const next = TIME_FRAME_TABS[index];
            if (next) setTimeFrame(next.key);
          }}
        />
      </View>

      <View style={styles.grid}>
        {practiceCard(
          'Goals',
          goalsValue,
          timeFrame === 'day' ? (goalsSummary.total === 0 ? 'Add a goal' : 'completed') : 'days completed',
          goalsProgress,
          'rose',
          'checkbox-outline',
          () => (navigation as any).navigate('DailyGoals'),
        )}
        {practiceCard(
          'Tehillim',
          tehillimValue,
          tehillimSubtitle,
          tehillimProgressPct,
          'lavender',
          'book-outline',
          () => (navigation as any).navigate('TehillimList'),
        )}
        {practiceCard(
          'Brachos',
          `${brachosTotal}`,
          `of ${brachosGoal} goal`,
          brachosProgress,
          'sky',
          'sparkles-outline',
          () => (navigation as any).navigate('Library'),
          timeFrame === 'day' ? (
            <Chip
              label="Add"
              onPress={() => {
                void Haptics.selectionAsync();
                setBrachosMenuVisible(true);
              }}
            />
          ) : null,
        )}
        {practiceCard(
          'Tzedakah',
          tzedakahTotal > 0 ? `$${tzedakahTotal.toFixed(0)}` : '$0',
          timeFrame === 'day' ? 'given today' : `given this ${timeFrame}`,
          tzedakahTotal > 0 ? Math.min(1, tzedakahTotal / 18) : 0,
          'gold',
          'heart-outline',
          () => (navigation as any).navigate('Tzedakah'),
        )}
      </View>

      <View style={{ marginTop: spacing['2xl'], gap: spacing.sm }}>
        <BrandGlassTile
          title="Gratitude journal"
          subtitle="What are you thankful for?"
          icon="journal-outline"
          tint="sage"
          onPress={() => (navigation as any).navigate('Gratitude')}
        />
        <BrandGlassTile
          title="Shabbos alarm"
          subtitle="Morning ring on Shabbos"
          icon="alarm-outline"
          tint="rose"
          onPress={() => (navigation as any).navigate('Settings', { scrollTo: 'shabbosAlarm' })}
        />
      </View>

      {sectionLabel('Explore')}
      <View style={{ gap: spacing.sm }}>
        <BrandGlassTile
          title="Shared Tehillim"
          subtitle="Create or join a shared Tehillim page"
          icon="people-outline"
          tint="lavender"
          onPress={() => (navigation as any).navigate('CreateSharedTehillim')}
        />
        <BrandGlassTile
          title="Minyan finder"
          subtitle="Find nearby minyanim"
          icon="navigate-outline"
          tint="sky"
          muted
          badge="Soon"
        />
        <BrandGlassTile
          title="Kosher restaurants"
          subtitle="Discover kosher dining"
          icon="restaurant-outline"
          tint="gold"
          muted
          badge="Soon"
        />
      </View>

      <Modal
        visible={brachosMenuVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setBrachosMenuVisible(false)}
      >
        <LinearGradient
          colors={[...theme.backgroundGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            paddingHorizontal: spacing.gutter,
            paddingTop: Platform.OS === 'android' ? insets.top + spacing.md : spacing.lg,
            paddingBottom: insets.bottom + spacing.md,
          }}
        >
          <Text
            accessibilityRole="header"
            style={[type.textStyles.h3, { color: theme.colors.text.primary, marginBottom: spacing.md }]}
          >
            Add brachos
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <GroupLabel>{`Count so far today: ${brachosCount}`}</GroupLabel>
            <Section>
              {brachosOptions.map((opt) => (
                <ListRow
                  key={opt.key}
                  title={opt.title}
                  trailing={
                    <Text style={[type.textStyles.bodyBold, { color: theme.colors.primary.dark }]}>
                      {`+${opt.amount}`}
                    </Text>
                  }
                  onPress={() => handleBrachosAdd(opt.amount)}
                />
              ))}
            </Section>
          </ScrollView>
          <GlassButton
            title="Close"
            variant="primary"
            onPress={() => setBrachosMenuVisible(false)}
          />
        </LinearGradient>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    alignItems: 'stretch',
  },
  half: {
    width: '50%',
    padding: 4,
  },
  practiceInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  practiceCopy: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  progressSlot: {
    width: '100%',
    height: 6,
    marginTop: 4,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  extraSpacer: {
    width: 44,
    height: 32,
  },
  iconWell: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
