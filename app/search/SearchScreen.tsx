import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/design/theme';
import { ListRow } from '../../components/ui/ListRow';
import { Section } from '../../components/ui/Section';
import { Screen } from '../../components/ui/Screen';
import { navigateOrComingSoon } from '../../src/feature/LibraryFeatureAccess';

type SearchAction =
  | { kind: 'root'; name: string; params?: Record<string, unknown> }
  | { kind: 'tab'; tab: string; screen?: string; params?: Record<string, unknown> }
  | { kind: 'siddur'; service: string }
  | { kind: 'gated'; name: string; params?: Record<string, unknown> };

interface SearchItem {
  id: string;
  label: string;
  subtitle: string;
  group: string;
  keywords: string;
  action: SearchAction;
}

const SEARCH_INDEX: SearchItem[] = [
  // Pray
  { id: 'shacharis', label: 'Shacharis', subtitle: 'Morning prayers', group: 'Pray', keywords: 'shacharit shacharis morning', action: { kind: 'siddur', service: 'shacharis' } },
  { id: 'mincha', label: 'Mincha', subtitle: 'Afternoon prayers', group: 'Pray', keywords: 'mincha afternoon', action: { kind: 'siddur', service: 'mincha' } },
  { id: 'maariv', label: 'Maariv', subtitle: 'Evening prayers', group: 'Pray', keywords: 'maariv evening', action: { kind: 'siddur', service: 'maariv' } },
  { id: 'asher_yatzar', label: 'Asher Yatzar', subtitle: 'After using the restroom', group: 'Pray', keywords: 'asher yatzar', action: { kind: 'siddur', service: 'asher_yatzar' } },
  { id: 'bentching', label: 'Bentching', subtitle: 'Birkas Hamazon', group: 'Pray', keywords: 'bentching birkat hamazon', action: { kind: 'siddur', service: 'bentching' } },
  { id: 'bedtime', label: 'Bedtime Shema', subtitle: 'Kriyas Shema al hamita', group: 'Pray', keywords: 'bedtime shema', action: { kind: 'siddur', service: 'bedtime' } },
  { id: 'tefilas_haderech', label: 'Tefillas HaDerech', subtitle: 'Traveler’s prayer', group: 'Pray', keywords: 'derech travel', action: { kind: 'siddur', service: 'tefilas_haderech' } },
  // Tehillim
  { id: 'tehillim_list', label: 'Tehillim', subtitle: '150 perakim', group: 'Tehillim', keywords: 'tehillim psalms', action: { kind: 'root', name: 'TehillimList' } },
  { id: 'tehillim_settings', label: 'Tehillim settings', subtitle: 'Daily goal type', group: 'Tehillim', keywords: 'tehillim goal', action: { kind: 'root', name: 'TehillimSettings' } },
  { id: 'tehillim_shared', label: 'Create shared Tehillim', subtitle: 'Split campaign + share link', group: 'Tehillim', keywords: 'shared campaign', action: { kind: 'root', name: 'CreateSharedTehillim' } },
  // Practice / Hub
  { id: 'hub', label: 'Hub overview', subtitle: 'Day, week, month stats', group: 'Practice', keywords: 'hub practice', action: { kind: 'tab', tab: 'Hub', screen: 'HubOverview' } },
  { id: 'daily_goals', label: 'Daily goals', subtitle: 'Morning–night check-off', group: 'Practice', keywords: 'goals', action: { kind: 'tab', tab: 'Hub', screen: 'DailyGoals' } },
  { id: 'goals_history', label: 'Goals history', subtitle: 'Past completion', group: 'Practice', keywords: 'goals history', action: { kind: 'tab', tab: 'Hub', screen: 'GoalsHistory' } },
  { id: 'gratitude', label: 'Gratitude', subtitle: 'Journal + streak', group: 'Practice', keywords: 'gratitude', action: { kind: 'tab', tab: 'Hub', screen: 'Gratitude' } },
  { id: 'habits', label: 'Habits', subtitle: 'Spiritual goals check-off', group: 'Practice', keywords: 'habits', action: { kind: 'root', name: 'Habits' } },
  { id: 'tzedakah', label: 'Tzedakah', subtitle: 'History and totals', group: 'Practice', keywords: 'tzedakah charity', action: { kind: 'root', name: 'Tzedakah' } },
  { id: 'omer', label: 'Sefiras HaOmer', subtitle: 'Count + liturgy', group: 'Practice', keywords: 'omer sefirat', action: { kind: 'root', name: 'Omer' } },
  // Day
  { id: 'calendar', label: 'Calendar', subtitle: 'Month, day detail, zmanim', group: 'Day', keywords: 'calendar zmanim', action: { kind: 'tab', tab: 'Calendar' } },
  // Home tools
  { id: 'customize_home', label: 'Customize home', subtitle: 'Layout visibility and sizes', group: 'Home', keywords: 'customize home widgets', action: { kind: 'root', name: 'CustomizeHome' } },
  { id: 'marketplace', label: 'Panel marketplace', subtitle: 'Browse and add widgets', group: 'Home', keywords: 'marketplace panels widgets', action: { kind: 'root', name: 'PanelsMarketplace' } },
  { id: 'home', label: 'Home', subtitle: 'Today’s widgets', group: 'Home', keywords: 'home today', action: { kind: 'tab', tab: 'Home' } },
  // Learn (gated)
  { id: 'parsha', label: 'Weekly Parsha', subtitle: 'Learning', group: 'Learn', keywords: 'parsha', action: { kind: 'gated', name: 'Parsha' } },
  { id: 'gemara', label: 'Gemara', subtitle: 'Daf Yomi and tractates', group: 'Learn', keywords: 'gemara talmud', action: { kind: 'gated', name: 'Gemara' } },
  { id: 'nach', label: 'Nach', subtitle: 'Prophets and Writings', group: 'Learn', keywords: 'nach tanakh', action: { kind: 'gated', name: 'Nach' } },
  { id: 'mishna', label: 'Mishna', subtitle: 'Mishna Yomi', group: 'Learn', keywords: 'mishna', action: { kind: 'gated', name: 'Mishna' } },
  { id: 'rambam', label: 'Rambam', subtitle: 'Mishneh Torah', group: 'Learn', keywords: 'rambam', action: { kind: 'gated', name: 'Rambam' } },
  { id: 'chumash', label: 'Chumash', subtitle: 'Shneyim Mikra', group: 'Learn', keywords: 'chumash torah', action: { kind: 'gated', name: 'Chumash' } },
  { id: 'pirkei_avos', label: 'Pirkei Avos', subtitle: 'Ethics of the Fathers', group: 'Learn', keywords: 'pirkei avos', action: { kind: 'gated', name: 'PirkeiAvos' } },
  { id: 'library', label: 'Library', subtitle: 'Tefillos and texts', group: 'Learn', keywords: 'library', action: { kind: 'tab', tab: 'Library', screen: 'LibraryHome' } },
  // Settings
  { id: 'settings', label: 'Settings', subtitle: 'Notifications, General, About', group: 'Settings', keywords: 'settings preferences', action: { kind: 'root', name: 'Settings' } },
  { id: 'settings_notifications', label: 'Notifications', subtitle: 'Prayer times and reminders', group: 'Settings', keywords: 'notifications alerts', action: { kind: 'root', name: 'Settings', params: { scrollTo: 'notifications' } } },
  { id: 'settings_general', label: 'General', subtitle: 'Nusach, display, Refuah names', group: 'Settings', keywords: 'nusach general refuah', action: { kind: 'root', name: 'Settings', params: { scrollTo: 'general' } } },
  { id: 'settings_about', label: 'About', subtitle: 'Version and legal', group: 'Settings', keywords: 'about privacy terms', action: { kind: 'root', name: 'Settings', params: { scrollTo: 'about' } } },
  { id: 'add_reminder', label: 'Add custom reminder', subtitle: 'Create or edit a reminder', group: 'Settings', keywords: 'reminder custom', action: { kind: 'root', name: 'AddCustomReminder' } },
];

export function SearchScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { spacing, type, radii } = theme.tokens;
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEARCH_INDEX;
    return SEARCH_INDEX.filter((item) => {
      const hay = `${item.label} ${item.subtitle} ${item.keywords} ${item.group}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchItem[]>();
    for (const item of filtered) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const runAction = useCallback(
    (action: SearchAction) => {
      Keyboard.dismiss();
      switch (action.kind) {
        case 'root':
          navigation.navigate(action.name, action.params ?? {});
          break;
        case 'tab':
          if (action.screen) {
            navigation.navigate(action.tab, {
              screen: action.screen,
              params: action.params,
            });
          } else {
            navigation.navigate(action.tab);
          }
          break;
        case 'siddur':
          navigateOrComingSoon(navigation, { type: 'siddur', service: action.service });
          break;
        case 'gated':
          navigateOrComingSoon(navigation, {
            type: 'screen',
            name: action.name,
            params: action.params,
          });
          break;
      }
    },
    [navigation],
  );

  const hasQuery = query.trim().length > 0;

  return (
    <Screen
      state={grouped.length === 0 ? 'empty' : 'ready'}
      emptyTitle="No matches"
      emptyMessage={hasQuery ? `Nothing found for “${query.trim()}”.` : undefined}
      contentStyle={{ paddingHorizontal: 0 }}
      header={
        <View style={{ marginBottom: spacing.md }}>
          <Text
            style={[
              type.textStyles.h2,
              { color: theme.colors.text.primary, marginBottom: spacing.sm },
            ]}
            accessibilityRole="header"
          >
            Search
          </Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Pray, Tehillim, Hub, Settings…"
            placeholderTextColor={theme.colors.text.tertiary}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            returnKeyType="search"
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.background.primary,
                borderColor: theme.colors.neutral[300],
                color: theme.colors.text.primary,
                borderRadius: radii.lg,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm + spacing['2xs'],
                fontFamily: type.fonts.body.regular,
                fontSize: type.fontSize.base,
              },
            ]}
            accessibilityLabel="Search features"
          />
        </View>
      }
    >
      <FlatList
        data={grouped}
        keyExtractor={([group]) => group}
        contentContainerStyle={{
          paddingHorizontal: spacing.gutter,
          paddingBottom: insets.bottom + spacing['2xl'],
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        renderItem={({ item: [group, items] }) => (
          <Section title={group}>
            {items.map((row) => (
              <ListRow
                key={row.id}
                title={row.label}
                subtitle={row.subtitle}
                showChevron
                onPress={() => runAction(row.action)}
              />
            ))}
          </Section>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
});
