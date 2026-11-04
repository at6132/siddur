import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  Platform,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen, Section, ListRow, Chip, GlassButton, EmptyState } from '../../components/ui';
import { useTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';
import { MESECHTAS } from '../gemara/GemaraScreen';
import { MISHNA_TRACTATES } from '../../src/services/MishnaYomiService';
import { NACH_BOOKS } from '../../src/services/NachYomiService';
import { RAMBAM_BOOKS } from '../../src/services/RambamStructure';
import { navigateOrComingSoon, LIBRARY_GRID_COMING_SOON_IDS } from '../../src/feature/LibraryFeatureAccess';

interface PrayerItem {
  id: string;
  title: string;
  hebrewTitle: string;
  service: 'shacharis' | 'mincha' | 'maariv';
  defaultTime: string;
}

interface LibraryItem {
  id: string;
  title: string;
  screen: string;
  /** Hidden; powers Library search only */
  searchKeywords: string;
}

const LIBRARY_QUICK_ACCESS_KEY = '@library_quick_access_perakim';
const DEFAULT_QUICK_ACCESS_PERAKIM = [23, 91, 121, 100];

/** Rows that still land on Coming soon read quieter. */
const MUTED_OPACITY = 0.55;
/** Clearance for the floating tab bar + mini-player. */
const TAB_BAR_CLEARANCE = 144;
const SEARCH_ICON_SIZE = 18;
const SEARCH_MIN_HEIGHT = 44;

// Hebrew letters for perek numbers 1–150 (same as TehillimListScreen)
const TEHILLIM_HEBREW_NUMBERS = [
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
  'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ',
  'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל',
  'לא', 'לב', 'לג', 'לד', 'לה', 'לו', 'לז', 'לח', 'לט', 'מ',
  'מא', 'מב', 'מג', 'מד', 'מה', 'מו', 'מז', 'מח', 'מט', 'נ',
  'נא', 'נב', 'נג', 'נד', 'נה', 'נו', 'נז', 'נח', 'נט', 'ס',
  'סא', 'סב', 'סג', 'סד', 'סה', 'סו', 'סז', 'סח', 'סט', 'ע',
  'עא', 'עב', 'עג', 'עד', 'עה', 'עו', 'עז', 'עח', 'עט', 'פ',
  'פא', 'פב', 'פג', 'פד', 'פה', 'פו', 'פז', 'פח', 'פט', 'צ',
  'צא', 'צב', 'צג', 'צד', 'צה', 'צו', 'צז', 'צח', 'צט', 'ק',
  'קא', 'קב', 'קג', 'קד', 'קה', 'קו', 'קז', 'קח', 'קט', 'קי',
  'קיא', 'קיב', 'קיג', 'קיד', 'קטו', 'קטז', 'קיז', 'קיח', 'קיט', 'קכ',
  'קכא', 'קכב', 'קכג', 'קכד', 'קכה', 'קכו', 'קכז', 'קכח', 'קכט', 'קל',
  'קלא', 'קלב', 'קלג', 'קלד', 'קלה', 'קלו', 'קלז', 'קלח', 'קלט', 'קמ',
  'קמא', 'קמב', 'קמג', 'קמד', 'קמה', 'קמו', 'קמז', 'קמח', 'קמט', 'קנ',
];
function perekToHebrew(perek: number): string {
  return perek >= 1 && perek <= 150 ? TEHILLIM_HEBREW_NUMBERS[perek - 1] : String(perek);
}

const PRAYER_ITEMS: PrayerItem[] = [
  {
    id: 'shacharis',
    title: 'Shacharis',
    hebrewTitle: 'שחרית',
    service: 'shacharis',
    defaultTime: '7:00 AM',
  },
  {
    id: 'mincha',
    title: 'Mincha',
    hebrewTitle: 'מנחה',
    service: 'mincha',
    defaultTime: '1:00 PM',
  },
  {
    id: 'maariv',
    title: 'Maariv',
    hebrewTitle: 'מעריב',
    service: 'maariv',
    defaultTime: '8:00 PM',
  },
];

const LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: 'asher_yatzar',
    title: 'Asher Yatzar',
    screen: 'AsherYatzar',
    searchKeywords: 'asher yatzar bathroom blessing ברכה',
  },
  {
    id: 'bedtime',
    title: 'Bedtime Shema',
    screen: 'SiddurReader',
    searchKeywords: 'bedtime shema kriyat mitah sleep קריאת שמע המטה',
  },
  {
    id: 'tehillim',
    title: 'Tehillim',
    screen: 'TehillimList',
    searchKeywords: 'tehillim psalms chapters perakim goals תהלים',
  },
  {
    id: 'tefilas_haderech',
    title: 'Tefillas HaDerech',
    screen: 'TefillasHaDerech',
    searchKeywords: 'tefillas haderech travel journey דרך',
  },
  {
    id: 'bentching',
    title: 'Bentching',
    screen: 'Bentching',
    searchKeywords: 'bentching birkas hamazon grace meals ברכת המזון',
  },
  {
    id: 'gemara',
    title: 'Gemara',
    screen: 'Gemara',
    searchKeywords: 'gemara talmud bavli daf yomi masechta מסכת גמרא',
  },
  {
    id: 'nach',
    title: 'Nach',
    screen: 'Nach',
    searchKeywords: 'nach neviim ketuvim tanakh yomi פרקים נביאים כתובים',
  },
  {
    id: 'mishna',
    title: 'Mishna',
    screen: 'Mishna',
    searchKeywords: 'mishna mishnah seder yomi משנה',
  },
  {
    id: 'rambam',
    title: 'Rambam',
    screen: 'Rambam',
    searchKeywords: 'rambam mishneh torah hilchot yomi רמבם הלכות',
  },
  {
    id: 'chumash',
    title: 'Chumash',
    screen: 'Chumash',
    searchKeywords: 'chumash torah five books shneyim mikra targum חומש שניים מקרא',
  },
  {
    id: 'pirkei_avos',
    title: 'Pirkei Avos',
    screen: 'PirkeiAvos',
    searchKeywords: 'pirkei avos avot ethics fathers פרקי אבות',
  },
];

/** Unified searchable item – all Library content in one flat list */
type SearchableItem = {
  id: string;
  title: string;
  keywords: string;
  onPress: () => void;
};

function buildSearchableItems(
  navigation: ReturnType<typeof useNavigation>,
  handlePrayerPress: (p: PrayerItem) => void,
  handleItemPress: (i: LibraryItem) => void
): SearchableItem[] {
  const nav = navigation as any;
  return [
    // Daily Tefillos
    ...PRAYER_ITEMS.map((p) => ({
      id: p.id,
      title: p.title,
      keywords: `${p.title} ${p.hebrewTitle} שחרית מנחה מעריב morning afternoon evening prayer`,
      onPress: () => handlePrayerPress(p),
    })),
    { id: 'quick_asher_yatzar', title: 'Asher Yatzar', keywords: 'asher yatzar bathroom blessing ברכה', onPress: () => nav.navigate('SiddurReader', { service: 'asher_yatzar' }) },
    { id: 'quick_tehillim', title: 'Tehillim', keywords: 'tehillim psalm perakim 150 תהלים', onPress: () => nav.navigate('TehillimList') },
    { id: 'quick_bentching', title: 'Bentching', keywords: 'bentching birkas hamazon grace meals ברכת המזון', onPress: () => nav.navigate('SiddurReader', { service: 'bentching' }) },
    { id: 'parsha', title: 'Parsha', keywords: 'parsha torah portion weekly sedra פרשה', onPress: () => navigateOrComingSoon(nav, { type: 'screen', name: 'Parsha' }) },
    { id: 'chumash_search', title: 'Chumash', keywords: 'chumash torah five books shneyim mikra targum חומש שניים מקרא', onPress: () => navigateOrComingSoon(nav, { type: 'screen', name: 'Chumash' }) },
    ...LIBRARY_ITEMS.map((i) => ({
      id: i.id,
      title: i.title,
      keywords: `${i.title} ${i.searchKeywords} gemara talmud nach mishna rambam chumash torah parsha pirkei avos tehillim brachos bentching bedtime tefilas haderech`,
      onPress: () => handleItemPress(i),
    })),
    ...MESECHTAS.map((m) => ({
      id: `gemara_${m.name}`,
      title: m.name,
      keywords: `gemara talmud daf ${m.dapim} ${m.name} ${m.hebrew} מסכת דפים`,
      onPress: () => navigateOrComingSoon(nav, { type: 'screen', name: 'GemaraTractate', params: { tractate: m.name } }),
    })),
    ...MISHNA_TRACTATES.map((t) => ({
      id: `mishna_${t.sefariaName}`,
      title: t.sefariaName,
      keywords: `mishna mishnah ${t.perakim} ${t.sefariaName} ${t.hebrew} מסכת פרקים`,
      onPress: () => navigateOrComingSoon(nav, { type: 'screen', name: 'MishnaTractate', params: { tractate: t.sefariaName } }),
    })),
    ...NACH_BOOKS.map((b) => ({
      id: `nach_${b.sefariaName}`,
      title: b.sefariaName,
      keywords: `nach tanakh neviim ketuvim ${b.chapters} ${b.sefariaName} ${b.hebrew} נביאים כתובים פרקים`,
      onPress: () => navigateOrComingSoon(nav, { type: 'screen', name: 'NachBook', params: { book: b.sefariaName } }),
    })),
    ...RAMBAM_BOOKS.flatMap((book) =>
      book.sections.map((s) => ({
        id: `rambam_${s.sefariaName.replace(/\s+/g, '_')}`,
        title: s.hebrew,
        keywords: `rambam mishneh torah hilchos ${s.chapters} ${s.sefariaName} ${s.hebrew} ${book.english} הלכות פרקים`,
        onPress: () => navigateOrComingSoon(nav, { type: 'screen', name: 'RambamSection', params: { sefariaName: s.sefariaName } }),
      }))
    ),
    ...[1, 2, 3, 4, 5, 6].map((p) => ({
      id: `pirkei_avos_${p}`,
      title: `Pirkei Avos ${p}`,
      keywords: `pirkei avos avot perek ${p} פרקי אבות פרק`,
      onPress: () => navigateOrComingSoon(nav, { type: 'screen', name: 'MishnaReader', params: { tractate: 'Pirkei Avot', perek: p } }),
    })),
    { id: 'tehillim_23', title: 'Tehillim 23', keywords: 'tehillim psalm 23 mizmor תהלים', onPress: () => nav.navigate('TehillimReader', { psalm: 23 }) },
    { id: 'tehillim_91', title: 'Tehillim 91', keywords: 'tehillim psalm 91 mizmor תהלים', onPress: () => nav.navigate('TehillimReader', { psalm: 91 }) },
    { id: 'tehillim_121', title: 'Tehillim 121', keywords: 'tehillim psalm 121 mizmor תהלים', onPress: () => nav.navigate('TehillimReader', { psalm: 121 }) },
  ];
}

function matchesSearch(item: SearchableItem, q: string): boolean {
  if (!q.trim()) return true;
  const words = q.toLowerCase().trim().split(/\s+/);
  const searchable = `${item.title} ${item.keywords}`.toLowerCase();
  return words.every((word) => searchable.includes(word));
}

export const LibraryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { spacing, radii, type, hebrew } = theme.tokens;

  const handlePrayerPress = useCallback((item: PrayerItem) => {
    navigation.navigate('SiddurReader' as never, { service: item.service } as never);
  }, [navigation]);

  const handleItemPress = useCallback(
    (item: LibraryItem) => {
      const nav = navigation as any;
      if (item.id === 'tehillim' || item.id === 'tehillim_more') {
        nav.navigate('TehillimList');
        return;
      }
      const screenById: Record<string, string> = {
        gemara: 'Gemara',
        nach: 'Nach',
        mishna: 'Mishna',
        rambam: 'Rambam',
        chumash: 'Chumash',
        pirkei_avos: 'PirkeiAvos',
      };
      const screen = screenById[item.id];
      if (screen) {
        navigateOrComingSoon(nav, { type: 'screen', name: screen });
        return;
      }
      navigateOrComingSoon(nav, { type: 'siddur', service: item.id });
    },
    [navigation],
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [quickAccessPerakim, setQuickAccessPerakim] = useState<number[]>(DEFAULT_QUICK_ACCESS_PERAKIM);
  const [quickAccessCustomizeVisible, setQuickAccessCustomizeVisible] = useState(false);
  const [customizeNewPerek, setCustomizeNewPerek] = useState('');

  const loadQuickAccessPerakim = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(LIBRARY_QUICK_ACCESS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((n) => typeof n === 'number' && n >= 1 && n <= 150);
          if (valid.length > 0) setQuickAccessPerakim(valid);
        }
      }
    } catch (e) {
      console.warn('Load quick access perakim:', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadQuickAccessPerakim(); }, [loadQuickAccessPerakim]));

  const saveQuickAccessPerakim = useCallback(async (perakim: number[]) => {
    setQuickAccessPerakim(perakim);
    try {
      await AsyncStorage.setItem(LIBRARY_QUICK_ACCESS_KEY, JSON.stringify(perakim));
    } catch (e) {
      console.warn('Save quick access perakim:', e);
    }
  }, []);

  const addQuickAccessPerek = useCallback(() => {
    const num = parseInt(customizeNewPerek, 10);
    if (isNaN(num) || num < 1 || num > 150 || quickAccessPerakim.includes(num)) return;
    setCustomizeNewPerek('');
    saveQuickAccessPerakim([...quickAccessPerakim, num].sort((a, b) => a - b));
  }, [customizeNewPerek, quickAccessPerakim, saveQuickAccessPerakim]);

  const removeQuickAccessPerek = useCallback(
    (perek: number) => {
      const next = quickAccessPerakim.filter((p) => p !== perek);
      if (next.length > 0) saveQuickAccessPerakim(next);
    },
    [quickAccessPerakim, saveQuickAccessPerakim]
  );

  const searchableItems = useMemo(
    () => buildSearchableItems(navigation, handlePrayerPress, handleItemPress),
    [navigation, handlePrayerPress, handleItemPress]
  );
  const filteredItems = useMemo(
    () => (searchQuery.trim() ? searchableItems.filter((i) => matchesSearch(i, searchQuery)) : []),
    [searchableItems, searchQuery]
  );

  const isSearching = searchQuery.trim().length > 0;

  const hebrewTrailing = (text: string) => (
    <Text
      style={[hebrew.textStyles.caption, { color: theme.colors.text.secondary }]}
      accessibilityLanguage="he"
    >
      {text}
    </Text>
  );

  const soonTrailing = (
    <Text style={[type.textStyles.caption, { color: theme.colors.text.tertiary }]}>Soon</Text>
  );

  const openCustomize = () => {
    void Haptics.selectionAsync();
    setQuickAccessCustomizeVisible(true);
  };

  const closeCustomize = () => {
    void Haptics.selectionAsync();
    setQuickAccessCustomizeVisible(false);
  };

  const header = (
    <View>
      <Text style={[type.textStyles.h2, { color: theme.colors.text.primary }]}>Library</Text>

      <View
        style={[
          styles.searchBar,
          {
            minHeight: SEARCH_MIN_HEIGHT,
            marginTop: spacing.md,
            marginBottom: spacing.lg,
            paddingHorizontal: spacing.md,
            borderRadius: radii.lg,
            backgroundColor: colorWithAlpha(theme.colors.text.primary, theme.isDark ? 0.1 : 0.06),
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: searchFocused ? theme.colors.primary.main : 'transparent',
          },
        ]}
      >
        <Ionicons name="search" size={SEARCH_ICON_SIZE} color={theme.colors.text.tertiary} />
        <TextInput
          style={[
            type.textStyles.body,
            styles.searchInput,
            { color: theme.colors.text.primary, marginLeft: spacing.sm },
          ]}
          placeholder="Search prayers, texts, brachos..."
          placeholderTextColor={theme.colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search the library"
        />
      </View>

      {isSearching && filteredItems.length === 0 ? (
        <EmptyState
          title="No results"
          message={`No results for "${searchQuery.trim()}"`}
        />
      ) : null}

      {!isSearching ? (
        <>
          <Section title="Daily Tefillos">
            {PRAYER_ITEMS.map((item) => (
              <ListRow
                key={item.id}
                title={item.title}
                trailing={hebrewTrailing(item.hebrewTitle)}
                showChevron
                onPress={() => handlePrayerPress(item)}
              />
            ))}
          </Section>

          <Text
            style={[
              type.textStyles.caption,
              {
                color: theme.colors.text.secondary,
                textTransform: 'uppercase',
                letterSpacing: type.letterSpacing.wider,
                marginBottom: spacing.sm,
                marginHorizontal: spacing.sm,
              },
            ]}
          >
            Quick Links
          </Text>
          <View style={[styles.chipRow, { gap: spacing.sm, marginBottom: spacing.lg }]}>
            <Chip
              label="Asher Yatzar"
              onPress={() => navigation.navigate('SiddurReader' as never, { service: 'asher_yatzar' } as never)}
            />
            <Chip
              label="Tehillim"
              onPress={() => navigation.navigate('TehillimList' as never)}
            />
            <Chip
              label="Bentching"
              onPress={() => navigation.navigate('SiddurReader' as never, { service: 'bentching' } as never)}
            />
          </View>

          <Section title="More Texts">
            <ListRow
              title="Parsha"
              trailing={soonTrailing}
              showChevron
              style={{ opacity: MUTED_OPACITY }}
              onPress={() => navigateOrComingSoon(navigation as any, { type: 'screen', name: 'Parsha' })}
            />
            {LIBRARY_ITEMS.map((item) => {
              const muted = LIBRARY_GRID_COMING_SOON_IDS.has(item.id);
              return (
                <ListRow
                  key={item.id}
                  title={item.title}
                  trailing={muted ? soonTrailing : undefined}
                  showChevron
                  style={muted ? { opacity: MUTED_OPACITY } : undefined}
                  onPress={() => handleItemPress(item)}
                />
              );
            })}
          </Section>

          <Section title="Quick Access">
            {quickAccessPerakim.map((perek) => (
              <ListRow
                key={perek}
                title={`Tehillim ${perek}`}
                trailing={hebrewTrailing(`תהלים ${perekToHebrew(perek)}`)}
                showChevron
                onPress={() => navigation.navigate('TehillimReader' as never, { psalm: perek } as never)}
              />
            ))}
          </Section>
          <GlassButton
            title="Customize"
            variant="ghost"
            size="sm"
            style={styles.customizeButton}
            onPress={openCustomize}
          />
        </>
      ) : null}
    </View>
  );

  const footer = !isSearching ? (
    <View style={{ marginTop: spacing.xl, alignItems: 'center', paddingVertical: spacing.md }}>
      <Text style={[type.textStyles.caption, { color: theme.colors.text.tertiary }]}>
        Texts provided by Sefaria • sefaria.org
      </Text>
    </View>
  ) : null;

  const renderSearchResult = ({ item, index }: { item: SearchableItem; index: number }) => {
    const isFirst = index === 0;
    const isLast = index === filteredItems.length - 1;
    return (
      <View
        style={{
          backgroundColor: theme.colors.background.primary,
          borderTopLeftRadius: isFirst ? radii.lg : 0,
          borderTopRightRadius: isFirst ? radii.lg : 0,
          borderBottomLeftRadius: isLast ? radii.lg : 0,
          borderBottomRightRadius: isLast ? radii.lg : 0,
          overflow: 'hidden',
        }}
      >
        {!isFirst ? (
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              backgroundColor: theme.colors.neutral[300],
              marginLeft: spacing.md,
            }}
          />
        ) : null}
        <ListRow title={item.title} showChevron onPress={item.onPress} />
      </View>
    );
  };

  return (
    <Screen contentStyle={styles.noPadding}>
      <FlatList
        data={isSearching ? filteredItems : []}
        keyExtractor={(item, index) => `${item.id}_${index}`}
        renderItem={renderSearchResult}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.gutter,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: TAB_BAR_CLEARANCE,
        }}
      />

      <Modal
        visible={quickAccessCustomizeVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeCustomize}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: theme.colors.background.secondary }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.modalHeader,
              {
                paddingHorizontal: spacing.gutter,
                paddingTop: Platform.OS === 'ios' ? spacing.md : insets.top + spacing.sm,
                paddingBottom: spacing.sm,
              },
            ]}
          >
            <View style={styles.flex}>
              <Text style={[type.textStyles.h3, { color: theme.colors.text.primary }]}>
                Quick Access Perakim
              </Text>
              <Text
                style={[
                  type.textStyles.caption,
                  { color: theme.colors.text.secondary, marginTop: spacing['2xs'] },
                ]}
              >
                Add or remove perakim (1–150)
              </Text>
            </View>
            <GlassButton title="Done" variant="ghost" size="sm" onPress={closeCustomize} />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={{
              paddingHorizontal: spacing.gutter,
              paddingTop: spacing.md,
              paddingBottom: insets.bottom + spacing.lg,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <Section>
              {quickAccessPerakim.map((perek) => {
                const lastOne = quickAccessPerakim.length <= 1;
                return (
                  <ListRow
                    key={perek}
                    title={`Tehillim ${perek}`}
                    trailing={
                      <View style={[styles.modalTrailing, { gap: spacing.md }]}>
                        {hebrewTrailing(`תהלים ${perekToHebrew(perek)}`)}
                      <Pressable
                        onPress={() => {
                          void Haptics.selectionAsync();
                          removeQuickAccessPerek(perek);
                        }}
                        disabled={lastOne}
                        hitSlop={spacing.sm}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove Tehillim ${perek}`}
                        style={[styles.removeButton, { opacity: lastOne ? 0.45 : 1 }]}
                      >
                        <Text style={[type.textStyles.label, { color: theme.colors.semantic.error }]}>
                          Remove
                        </Text>
                      </Pressable>
                      </View>
                    }
                  />
                );
              })}
            </Section>

            <View style={[styles.addRow, { gap: spacing.sm }]}>
              <TextInput
                style={[
                  type.textStyles.body,
                  styles.addInput,
                  {
                    color: theme.colors.text.primary,
                    backgroundColor: theme.colors.background.primary,
                    borderRadius: radii.lg,
                    borderWidth: StyleSheet.hairlineWidth * 2,
                    borderColor: theme.colors.neutral[300],
                    paddingHorizontal: spacing.md,
                  },
                ]}
                placeholder="Perek number (1–150)"
                placeholderTextColor={theme.colors.text.tertiary}
                value={customizeNewPerek}
                onChangeText={setCustomizeNewPerek}
                keyboardType="number-pad"
                maxLength={3}
                accessibilityLabel="Perek number"
              />
              <GlassButton title="Add" size="md" onPress={addQuickAccessPerek} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  noPadding: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  customizeButton: {
    alignSelf: 'flex-start',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  addInput: {
    flex: 1,
    minHeight: 44,
  },
});
