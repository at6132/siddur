/**
 * Hub – at-a-glance practice stats and quick navigation to sub-pages.
 * Grouped rows on the screen gradient; the brachos sheet is a native page sheet.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Modal, ScrollView, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/design/theme';
import { Screen, Section, ListRow, Chip, GlassButton } from '../../components/ui';
import { GroupLabel } from '../../components/hub/PracticeKit';
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

const TIME_FRAMES: { value: TimeFrame; label: string }[] = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
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
  const { spacing, type } = theme.tokens;
  const navigation = useNavigation();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('day');
  const [brachosCount, setBrachosCount] = useState(0);
  const [brachosTotal, setBrachosTotal] = useState(0);
  const [tehillimProgress, setTehillimProgress] = useState({ percentComplete: 0, dayName: '' });
  const [tehillimStreak, setTehillimStreak] = useState(0);
  const [tehillimDaysCompleted, setTehillimDaysCompleted] = useState(0);
  const [tzedakahTotal, setTzedakahTotal] = useState(0);
  const [goalsSummary, setGoalsSummary] = useState({ total: 0, completed: 0 });
  const [goalsRangeSummary, setGoalsRangeSummary] = useState<{ daysCompleted: number; totalDays: number } | null>(null);
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
      const [brachos, brachosRange, tProgress, tStreak, tehillimDays, tzedakah, goals, goalsRange] = await Promise.all([
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
  }, [timeFrame, getDateRange]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [timeFrame]);

  const handleBrachosAdd = async (amount: number) => {
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
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const goalsValue =
    timeFrame === 'day'
      ? `${goalsSummary.completed}/${goalsSummary.total}`
      : goalsRangeSummary
        ? `${goalsRangeSummary.daysCompleted}/${goalsRangeSummary.totalDays}`
        : 'n/a';

  const tehillimValue =
    timeFrame === 'day' ? `${tehillimProgress.percentComplete}%` : `${tehillimDaysCompleted}/${days}`;
  const tehillimSubtitle =
    timeFrame === 'day'
      ? tehillimStreak > 0
        ? `${tehillimStreak} day streak`
        : tehillimProgress.dayName
      : 'days completed';

  const statValue = (value: string) => (
    <Text style={[type.textStyles.h4, { color: theme.colors.text.primary }]}>{value}</Text>
  );

  const brachosOptions: { key: string; title: string; amount: number }[] = [
    { key: 'one', title: 'One bracha', amount: 1 },
    { key: 'shacharis', title: 'Shacharis', amount: BRACHOS_PER_TEFILLA.shacharis },
    { key: 'mincha', title: 'Mincha', amount: BRACHOS_PER_TEFILLA.mincha },
    { key: 'maariv', title: 'Maariv', amount: BRACHOS_PER_TEFILLA.maariv },
  ];

  return (
    <Screen
      scroll
      bottomExtra={spacing['3xl'] + spacing.lg}
      header={
        <View style={{ paddingBottom: spacing.md }}>
          <Text
            accessibilityRole="header"
            style={[type.textStyles.h2, { color: theme.colors.text.primary }]}
          >
            Good {getTimeOfDay()}
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
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          marginBottom: spacing.lg,
        }}
      >
        {TIME_FRAMES.map((tf) => (
          <Chip
            key={tf.value}
            label={tf.label}
            selected={timeFrame === tf.value}
            onPress={() => setTimeFrame(tf.value)}
            style={{ flex: 1, alignSelf: 'stretch' }}
          />
        ))}
      </View>

      <Section title="Practice">
        <ListRow
          title="Goals"
          subtitle={timeFrame === 'day' ? 'completed' : 'days completed'}
          trailing={statValue(goalsValue)}
          showChevron
          onPress={() => (navigation as any).navigate('DailyGoals')}
        />
        <ListRow
          title="Tehillim"
          subtitle={tehillimSubtitle}
          trailing={statValue(tehillimValue)}
          showChevron
          onPress={() => (navigation as any).navigate('TehillimList')}
        />
        <ListRow
          title="Brachos"
          subtitle={`of ${brachosGoal} goal`}
          trailing={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              {statValue(`${brachosTotal}`)}
              {timeFrame === 'day' ? (
                <Chip label="Add" onPress={() => setBrachosMenuVisible(true)} />
              ) : null}
            </View>
          }
          showChevron
          onPress={() => (navigation as any).navigate('Library')}
        />
        <ListRow
          title="Tzedakah"
          subtitle={timeFrame === 'day' ? 'given today' : `given this ${timeFrame}`}
          trailing={statValue(tzedakahTotal > 0 ? `$${tzedakahTotal.toFixed(0)}` : '$0')}
          showChevron
          onPress={() => (navigation as any).navigate('Tzedakah')}
        />
      </Section>

      <Section title="Quick actions">
        <ListRow
          title="Gratitude journal"
          subtitle="What are you thankful for?"
          showChevron
          onPress={() => (navigation as any).navigate('Gratitude')}
        />
        <ListRow
          title="Shabbos alarm"
          subtitle="Ring for a few seconds each Shabbos morning"
          showChevron
          onPress={() => (navigation as any).navigate('Settings', { scrollTo: 'shabbosAlarm' })}
        />
      </Section>

      <Section title="Explore">
        <ListRow
          title="Shared Tehillim"
          subtitle="Create or join a shared Tehillim page"
          showChevron
          onPress={() => (navigation as any).navigate('CreateSharedTehillim')}
        />
        <ListRow
          title="Minyan finder"
          subtitle="Find nearby minyanim"
          disabled
          trailing={
            <Text style={[type.textStyles.caption, { color: theme.colors.text.secondary }]}>Soon</Text>
          }
        />
        <ListRow
          title="Kosher restaurants"
          subtitle="Discover kosher dining"
          disabled
          trailing={
            <Text style={[type.textStyles.caption, { color: theme.colors.text.secondary }]}>Soon</Text>
          }
        />
      </Section>

      <Modal
        visible={brachosMenuVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setBrachosMenuVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.background.secondary,
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
                    <Text style={[type.textStyles.bodyBold, { color: theme.colors.text.primary }]}>
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
            variant="secondary"
            onPress={() => setBrachosMenuVisible(false)}
          />
        </View>
      </Modal>
    </Screen>
  );
};
