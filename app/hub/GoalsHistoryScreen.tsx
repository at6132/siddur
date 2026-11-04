/**
 * Goals History – scroll through past days, tap a day to see what you accomplished.
 * Inset-grouped list; day detail is a native page sheet.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Modal, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Section, ListRow, GlassButton } from '../../components/ui';
import { PracticeHeader } from '../../components/hub/PracticeKit';
import { useTheme } from '../../src/design/theme';
import { toLocalDateString } from '../../src/utils/dateUtils';
import { DailyGoalsService, type DailyGoalsDay } from '../../src/storage/DailyGoalsService';

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const today = toLocalDateString();
  const isToday = dateStr === today;
  if (isToday) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = dateStr === toLocalDateString(yesterday);
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export interface DaySummary {
  dateStr: string;
  completed: number;
  total: number;
}

export const GoalsHistoryScreen: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { spacing, type } = theme.tokens;
  const navigation = useNavigation();
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [streak, setStreak] = useState(0);
  const [selectedDay, setSelectedDay] = useState<DailyGoalsDay | null>(null);
  const [detailDateStr, setDetailDateStr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [list, streakCount] = await Promise.all([
      DailyGoalsService.getHistorySummaries(60),
      DailyGoalsService.getCompletionStreak(),
    ]);
    setSummaries(list);
    setStreak(streakCount);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openDay = async (dateStr: string) => {
    const day = await DailyGoalsService.getDay(dateStr);
    if (day) {
      setDetailDateStr(dateStr);
      setSelectedDay(day);
    }
  };

  const closeModal = useCallback(() => {
    setSelectedDay(null);
    setDetailDateStr(null);
  }, []);

  const completedCount = selectedDay ? selectedDay.goals.filter((g) => g.completed).length : 0;
  const totalCount = selectedDay ? selectedDay.goals.length : 0;

  const statsParts: string[] = [];
  if (summaries.length > 0) {
    statsParts.push(`Goals set on ${summaries.length} day${summaries.length !== 1 ? 's' : ''}`);
  }
  if (streak > 0) {
    statsParts.push(`${streak} day streak`);
  }

  return (
    <Screen
      scroll
      bottomExtra={spacing['3xl'] + spacing.lg}
      state={summaries.length === 0 ? 'empty' : 'ready'}
      emptyTitle="No past days yet"
      emptyMessage="Add goals in the morning and check them off tonight. Each day shows up here."
      header={
        <PracticeHeader
          title="Past days"
          subtitle={statsParts.length > 0 ? statsParts.join(' · ') : 'Tap a day to see what you accomplished'}
          onBack={() => navigation.goBack()}
        />
      }
    >
      <Section title="Last 60 days">
        {summaries.map((s) => {
          const allDone = s.completed === s.total && s.total > 0;
          return (
            <ListRow
              key={s.dateStr}
              title={formatDateLabel(s.dateStr)}
              subtitle={s.dateStr}
              trailing={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Text style={[type.textStyles.bodyBold, { color: theme.colors.text.primary }]}>
                    {`${s.completed}/${s.total}`}
                  </Text>
                  {allDone ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={type.fontSize.xl}
                      color={theme.colors.primary.main}
                    />
                  ) : null}
                </View>
              }
              showChevron
              onPress={() => openDay(s.dateStr)}
            />
          );
        })}
      </Section>

      <Modal
        visible={selectedDay != null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
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
          {selectedDay && detailDateStr ? (
            <>
              <Text
                accessibilityRole="header"
                style={[type.textStyles.h3, { color: theme.colors.text.primary }]}
              >
                {formatDateLabel(detailDateStr)}
              </Text>
              <Text
                style={[
                  type.textStyles.bodySmall,
                  { color: theme.colors.text.secondary, marginTop: spacing.xs, marginBottom: spacing.md },
                ]}
              >
                {`${detailDateStr} · ${completedCount}/${totalCount} completed`}
              </Text>
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <Section>
                  {selectedDay.goals.map((g) => (
                    <View
                      key={g.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        minHeight: spacing['2xl'],
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.md,
                        gap: spacing.sm,
                      }}
                    >
                      <Ionicons
                        name={g.completed ? 'checkmark-circle' : 'ellipse-outline'}
                        size={type.fontSize.xl}
                        color={g.completed ? theme.colors.primary.main : theme.colors.neutral[400]}
                      />
                      <Text
                        style={[
                          type.textStyles.body,
                          {
                            flex: 1,
                            color: g.completed ? theme.colors.text.tertiary : theme.colors.text.primary,
                            textDecorationLine: g.completed ? 'line-through' : 'none',
                          },
                        ]}
                      >
                        {g.text}
                      </Text>
                    </View>
                  ))}
                </Section>
              </ScrollView>
              <GlassButton title="Close" variant="secondary" onPress={closeModal} />
            </>
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
};
