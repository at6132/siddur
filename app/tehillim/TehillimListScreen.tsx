import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Platform,
  Alert,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen, Section, ListRow, GlassButton, EmptyState } from '../../components/ui';
import { PracticeHeader, GroupLabel } from '../../components/hub/PracticeKit';
import { IconButton, TextAction } from '../../components/settings/SettingsKit';
import {
  PerekCell,
  ProgressBar,
  Skeleton,
  hebrewNumeral,
  TEHILLIM_COUNT,
} from '../../components/tehillim/TehillimKit';
import { useTheme } from '../../src/design/theme';
import { DailyTehillimTracker } from '../../src/storage/DailyTehillimTracker';
import { getAnonymousId } from '../../src/analytics/IdentityService';
import {
  listMyTehillimCampaigns,
  leaveTehillimCampaign,
  deleteTehillimCampaign,
  type TehillimCampaign,
} from '../../src/api/tehillimApi';

const COLS = 4;

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
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;
  const { width: windowWidth } = useWindowDimensions();
  const [dailyProgress, setDailyProgress] = useState<DailyProgress | null>(null);
  const [overallProgress, setOverallProgress] = useState<OverallProgress | null>(null);
  const [completedPerakim, setCompletedPerakim] = useState<number[]>([]);
  const [fullBookCompletionsCount, setFullBookCompletionsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [myCampaigns, setMyCampaigns] = useState<TehillimCampaign[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const gap = spacing.sm;
  const itemWidth = (windowWidth - spacing.gutter * 2 - gap * (COLS - 1)) / COLS;

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [])
  );

  const loadProgress = async () => {
    const [progress, overall, fullBookCount, currentBookCompleted] = await Promise.all([
      DailyTehillimTracker.getTodaysProgress(),
      DailyTehillimTracker.getOverallTehillimProgress(),
      DailyTehillimTracker.getFullTehillimCompletionsCount(),
      DailyTehillimTracker.getCurrentBookCompleted(),
    ]);
    setFullBookCompletionsCount(fullBookCount);
    setDailyProgress({
      dayName: progress.dayName,
      totalChapters: progress.totalChapters,
      chaptersCompleted: progress.chaptersCompleted,
      chaptersRemaining: progress.chaptersRemaining,
      percentComplete: progress.percentComplete,
      goalType: progress.goalType,
    });
    setOverallProgress(overall);
    setCompletedPerakim(currentBookCompleted);
    try {
      const pid = await getAnonymousId();
      const { campaigns } = await listMyTehillimCampaigns(pid);
      setMyCampaigns(campaigns || []);
    } catch {
      setMyCampaigns([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadProgress();
    } finally {
      setRefreshing(false);
    }
  };

  const allTehillim: TehillimItem[] = useMemo(
    () =>
      Array.from({ length: TEHILLIM_COUNT }, (_, i) => ({
        number: i + 1,
        hebrew: hebrewNumeral(i + 1),
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
    completedPerakim.includes(chapterNum);

  const handleContinueDaily = async () => {
    const nextChapter = await DailyTehillimTracker.getNextChapter();
    if (nextChapter) {
      (navigation as any).navigate('TehillimReader' as never, { psalm: nextChapter } as never);
    }
  };

  const handleResetCurrentBook = () => {
    Alert.alert(
      'Reset Sefer Tehillim progress?',
      'This clears checkmarks for your current run (this week, month, or all 150 perakim, depending on your goal). Your count of siyumei Sefer Tehillim does not change.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await DailyTehillimTracker.resetCurrentBookProgress();
            await loadProgress();
          },
        },
      ]
    );
  };

  const handleLeaveCampaign = async (c: TehillimCampaign) => {
    Alert.alert(
      'Leave Tehillim page?',
      `Leave "${c.title || 'Shared Tehillim'}"? You can rejoin with the link.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const pid = await getAnonymousId();
              await leaveTehillimCampaign(c.id, pid);
              await loadProgress();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Could not leave');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCampaign = async (c: TehillimCampaign) => {
    Alert.alert(
      'Delete Tehillim page?',
      `Permanently delete "${c.title || 'Shared Tehillim'}"? Everyone will lose access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const pid = await getAnonymousId();
              await deleteTehillimCampaign(c.id, pid);
              await loadProgress();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Could not delete');
            }
          },
        },
      ]
    );
  };

  /* ------------------------------- sections -------------------------------- */

  const renderDaily = () => {
    if (!dailyProgress) {
      return (
        <View style={{ marginBottom: spacing.lg, gap: spacing.sm }}>
          <Skeleton height={spacing.lg} width="60%" />
          <Skeleton height={spacing.md} width="85%" />
          <Skeleton height={spacing.sm} />
          <Skeleton height={spacing['2xl']} style={{ borderRadius: radii.xl }} />
        </View>
      );
    }

    const { dayName, percentComplete, goalType } = dailyProgress;
    const totalChapters = dailyProgress.totalChapters ?? [];
    const chaptersRemaining = dailyProgress.chaptersRemaining ?? [];
    const isWhenever = goalType === 'whenever';
    const startChapter = totalChapters[0];
    const endChapter = totalChapters[totalChapters.length - 1];
    const completedCount = totalChapters.length - chaptersRemaining.length;
    const shownPercent = overallProgress ? overallProgress.percentComplete : percentComplete;

    const subtitle = isWhenever
      ? `${completedCount} of 150 perakim. Open any perek.`
      : overallProgress
        ? `${completedCount} of ${totalChapters.length} today, ${overallProgress.completed} of ${overallProgress.total} ${overallProgress.label}`
        : `Chapters ${startChapter} to ${endChapter}, ${totalChapters.length} total`;

    return (
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={[type.textStyles.h3, { color: theme.colors.text.primary }]}>
          {isWhenever ? 'Tehillim whenever you can' : `${dayName}'s Tehillim`}
        </Text>
        <Text style={[type.textStyles.bodySmall, { color: theme.colors.text.secondary, marginTop: spacing.xs }]}>
          {subtitle}
        </Text>

        <ProgressBar percent={shownPercent} style={{ marginTop: spacing.md }} />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: spacing.xs,
          }}
        >
          <Text style={[type.textStyles.caption, { color: theme.colors.text.tertiary, flex: 1 }]}>
            {overallProgress
              ? `${overallProgress.completed} of ${overallProgress.total} (${overallProgress.percentComplete}%)`
              : `${percentComplete}% complete`}
          </Text>
          <TextAction
            label="Edit goal"
            onPress={() => (navigation as any).navigate('TehillimSettings' as never)}
            align="flex-end"
          />
        </View>

        <View style={{ marginTop: spacing.sm }}>
          {isWhenever ? (
            <Text style={[type.textStyles.bodySmall, { color: theme.colors.text.secondary }]}>
              {chaptersRemaining.length === 0
                ? 'All 150 perakim complete'
                : 'Open any perek below and tap Complete perek when done.'}
            </Text>
          ) : chaptersRemaining.length > 0 ? (
            <GlassButton
              title={`Continue with chapter ${chaptersRemaining[0]}`}
              onPress={handleContinueDaily}
            />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="checkmark-circle" size={type.fontSize.xl} color={theme.colors.semantic.success} />
              <Text style={[type.textStyles.bodyBold, { color: theme.colors.text.primary }]}>
                {dayName}'s Tehillim complete
              </Text>
            </View>
          )}
        </View>

        <Section
          title="Sefer Tehillim"
          style={{ marginTop: spacing.lg, marginBottom: 0 }}
          footer="Each siyum is completing all 150 perakim. Then the count goes up and you begin again. Reset clears only this run."
        >
          <ListRow
            title="Siyumei Sefer Tehillim"
            trailing={
              <Text style={[type.textStyles.bodyBold, { color: theme.colors.primary.dark }]}>
                {fullBookCompletionsCount}
              </Text>
            }
          />
          <ListRow
            title="Reset this sefer's progress"
            onPress={handleResetCurrentBook}
            trailing={
              <Ionicons name="refresh" size={type.fontSize.lg} color={theme.colors.semantic.error} />
            }
          />
        </Section>
      </View>
    );
  };

  const renderSharedPages = () => (
    <Section title="Shared pages" footer="Separate from your personal Tehillim above.">
      {myCampaigns.map((c) => {
        const deadlineStr = c.deadline
          ? new Date(c.deadline).toLocaleDateString(undefined, { dateStyle: 'short' })
          : null;
        const subtitle = [
          c.type === 'split' ? 'Split and claim' : 'Shared completion',
          c.reason,
          deadlineStr ? `By ${deadlineStr}` : null,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <ListRow
            key={c.id}
            title={c.title || 'Shared Tehillim'}
            subtitle={subtitle}
            onPress={() => (navigation as any).navigate('SharedTehillimView' as never, { campaignId: c.id } as never)}
            trailing={
              <IconButton
                name={c.is_creator ? 'trash-outline' : 'exit-outline'}
                label={c.is_creator ? `Delete ${c.title || 'Shared Tehillim'}` : `Leave ${c.title || 'Shared Tehillim'}`}
                tone="danger"
                onPress={() => (c.is_creator ? handleDeleteCampaign(c) : handleLeaveCampaign(c))}
              />
            }
          />
        );
      })}
      <ListRow
        title="Make your Tehillim page"
        subtitle="Share a link. Others join and complete."
        leading={<Ionicons name="people-outline" size={type.fontSize.xl} color={theme.colors.primary.dark} />}
        showChevron
        onPress={() => (navigation as any).navigate('CreateSharedTehillim' as never)}
      />
    </Section>
  );

  const renderItem = ({ item }: { item: TehillimItem }) => (
    <PerekCell
      number={item.number}
      width={itemWidth}
      state={isCompleted(item.number) ? 'done' : isToday(item.number) ? 'today' : 'default'}
      onPress={() => (navigation as any).navigate('TehillimReader' as never, { psalm: item.number } as never)}
    />
  );

  return (
    <Screen
      header={
        <View>
          <PracticeHeader title="Tehillim" onBack={() => navigation.goBack()} />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.background.primary,
              borderRadius: radii.lg,
              borderColor: theme.colors.neutral[300],
              borderWidth: StyleSheet.hairlineWidth,
              marginBottom: spacing.sm,
              minHeight: 44,
            }}
          >
            <Ionicons
              name="search"
              size={type.fontSize.lg}
              color={theme.colors.text.tertiary}
              style={{ marginLeft: spacing.md }}
            />
            <TextInput
              accessibilityLabel="Search perek"
              style={{
                flex: 1,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.sm,
                fontSize: type.fontSize.base,
                fontFamily: type.fonts.body.regular,
                color: theme.colors.text.primary,
              }}
              placeholder="Search perek (e.g. 90 or צ)"
              placeholderTextColor={theme.colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
            />
            {searchQuery ? (
              <IconButton
                name="close-circle"
                label="Clear search"
                tone="muted"
                size={type.fontSize.lg}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSearchQuery('');
                }}
              />
            ) : null}
          </View>
        </View>
      }
    >
      <FlatList
        data={tehillimList}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.number)}
        numColumns={COLS}
        contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
        columnWrapperStyle={{ flexDirection: 'row-reverse', gap, marginBottom: gap }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary.main}
          />
        }
        ListHeaderComponent={
          <View>
            {renderDaily()}
            {renderSharedPages()}
            <GroupLabel>All perakim</GroupLabel>
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="No perek found" message="Try a number from 1 to 150 or a Hebrew letter." />
        }
        keyboardShouldPersistTaps={Platform.OS === 'ios' ? 'never' : 'handled'}
      />
    </Screen>
  );
};
