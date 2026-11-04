import React, { useMemo, useState, useCallback, type ComponentProps } from 'react';
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
import { Screen, Section, ListRow, GlassButton, EmptyState } from '../../components/ui';
import { BrandGlassTile, type BrandGlassTint } from '../../components/ui/BrandGlassTile';
import { useTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';
import { fonts } from '../../src/design/typography';
import { MESECHTAS } from '../gemara/GemaraScreen';
import { MISHNA_TRACTATES } from '../../src/services/MishnaYomiService';
import { NACH_BOOKS } from '../../src/services/NachYomiService';
import { RAMBAM_BOOKS } from '../../src/services/RambamStructure';
import { navigateOrComingSoon, LIBRARY_GRID_COMING_SOON_IDS } from '../../src/feature/LibraryFeatureAccess';

type IconName = ComponentProps<typeof Ionicons>['name'];

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

/** Clearance for the floating tab bar + mini-player. */
const TAB_BAR_CLEARANCE = 144;
const SEARCH_ICON_SIZE = 18;
const SEARCH_MIN_HEIGHT = 44;

const PRAYER_VISUAL: Record<
  PrayerItem['service'],
  { icon: IconName; tint: BrandGlassTint }
> = {
  shacharis: { icon: 'sunny-outline', tint: 'rose' },
  mincha: { icon: 'partly-sunny-outline', tint: 'gold' },
  maariv: { icon: 'moon-outline', tint: 'lavender' },
};

const LIBRARY_VISUAL: Record<string, { icon: IconName; tint: BrandGlassTint }> = {
  asher_yatzar: { icon: 'water-outline', tint: 'sky' },
  bedtime: { icon: 'moon-outline', tint: 'lavender' },
  tehillim: { icon: 'book-outline', tint: 'rose' },
  tefilas_haderech: { icon: 'navigate-outline', tint: 'sage' },
  bentching: { icon: 'restaurant-outline', tint: 'gold' },
  gemara: { icon: 'library-outline', tint: 'sky' },
  nach: { icon: 'bookmark-outline', tint: 'rose' },
  mishna: { icon: 'reader-outline', tint: 'sage' },
  rambam: { icon: 'school-outline', tint: 'gold' },
  chumash: { icon: 'book-outline', tint: 'lavender' },
  pirkei_avos: { icon: 'people-outline', tint: 'sage' },
  parsha: { icon: 'leaf-outline', tint: 'sage' },
};

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
  const { spacing, radii, type } = theme.tokens;

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

  const openCustomize = () => {
    void Haptics.selectionAsync();
    setQuickAccessCustomizeVisible(true);
  };

  const closeCustomize = () => {
    void Haptics.selectionAsync();
    setQuickAccessCustomizeVisible(false);
  };

  const availableTexts = useMemo(
    () => LIBRARY_ITEMS.filter((item) => !LIBRARY_GRID_COMING_SOON_IDS.has(item.id)),
    [],
  );
  const comingSoonTexts = useMemo(
    () => LIBRARY_ITEMS.filter((item) => LIBRARY_GRID_COMING_SOON_IDS.has(item.id)),
    [],
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
          marginHorizontal: spacing.xs,
          fontFamily: fonts.body.semibold,
        },
      ]}
    >
      {label}
    </Text>
  );

  const header = (
    <View>
      <Text
        style={{
          fontFamily: fonts.heading.bold,
          fontSize: 40,
          letterSpacing: 0.3,
          color: theme.colors.text.primary,
        }}
      >
        Library
      </Text>

      <View
        style={[
          styles.searchBar,
          {
            minHeight: SEARCH_MIN_HEIGHT,
            marginTop: spacing.md,
            marginBottom: spacing.md,
            paddingHorizontal: spacing.md,
            borderRadius: radii.xl,
            backgroundColor: colorWithAlpha(
              theme.colors.background.primary,
              theme.isDark ? 0.35 : 0.65,
            ),
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: searchFocused
              ? theme.colors.primary.main
              : colorWithAlpha(theme.colors.primary.light, 0.5),
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
          {sectionLabel('Daily Tefillos')}
          <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            {PRAYER_ITEMS.map((item) => {
              const visual = PRAYER_VISUAL[item.service];
              return (
                <BrandGlassTile
                  key={item.id}
                  title={item.title}
                  trailing={item.hebrewTitle}
                  icon={visual.icon}
                  tint={visual.tint}
                  onPress={() => handlePrayerPress(item)}
                />
              );
            })}
          </View>

          {sectionLabel('More Texts')}
          <View style={styles.tileGrid}>
            {availableTexts.map((item) => {
              const visual = LIBRARY_VISUAL[item.id] ?? {
                icon: 'book-outline' as IconName,
                tint: 'neutral' as BrandGlassTint,
              };
              return (
                <View key={item.id} style={styles.tileHalf}>
                  <BrandGlassTile
                    title={item.title}
                    icon={visual.icon}
                    tint={visual.tint}
                    compact
                    onPress={() => handleItemPress(item)}
                  />
                </View>
              );
            })}
            <View style={styles.tileHalf}>
              <BrandGlassTile
                title="Parsha"
                icon={LIBRARY_VISUAL.parsha.icon}
                tint={LIBRARY_VISUAL.parsha.tint}
                compact
                muted
                badge="Soon"
                onPress={() =>
                  navigateOrComingSoon(navigation as any, { type: 'screen', name: 'Parsha' })
                }
              />
            </View>
            {comingSoonTexts.map((item) => {
              const visual = LIBRARY_VISUAL[item.id] ?? {
                icon: 'book-outline' as IconName,
                tint: 'neutral' as BrandGlassTint,
              };
              return (
                <View key={item.id} style={styles.tileHalf}>
                  <BrandGlassTile
                    title={item.title}
                    icon={visual.icon}
                    tint={visual.tint}
                    compact
                    muted
                    badge="Soon"
                    onPress={() => handleItemPress(item)}
                  />
                </View>
              );
            })}
          </View>

          {sectionLabel('Quick Access')}
          <View style={[styles.chipWrap, { gap: spacing.sm, marginBottom: spacing.sm }]}>
            {quickAccessPerakim.map((perek) => (
              <Pressable
                key={perek}
                onPress={() => {
                  void Haptics.selectionAsync();
                  navigation.navigate('TehillimReader' as never, { psalm: perek } as never);
                }}
                style={({ pressed }) => [
                  styles.quickChip,
                  {
                    opacity: pressed ? 0.85 : 1,
                    backgroundColor: colorWithAlpha(
                      theme.colors.primary.light,
                      theme.isDark ? 0.28 : 0.5,
                    ),
                    borderColor: colorWithAlpha(theme.colors.primary.main, 0.25),
                    borderRadius: radii.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Tehillim ${perek}`}
              >
                <Text
                  style={{
                    fontFamily: fonts.body.semibold,
                    fontSize: 14,
                    color: theme.colors.text.primary,
                  }}
                >
                  {perek}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.hebrew.regular,
                    fontSize: 13,
                    color: theme.colors.text.secondary,
                    marginLeft: spacing.xs,
                  }}
                  accessibilityLanguage="he"
                >
                  {`תהלים ${perekToHebrew(perek)}`}
                </Text>
              </Pressable>
            ))}
          </View>
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
          backgroundColor: colorWithAlpha(
            theme.colors.background.primary,
            theme.isDark ? 0.45 : 0.72,
          ),
          borderTopLeftRadius: isFirst ? radii.xl : 0,
          borderTopRightRadius: isFirst ? radii.xl : 0,
          borderBottomLeftRadius: isLast ? radii.xl : 0,
          borderBottomRightRadius: isLast ? radii.xl : 0,
          overflow: 'hidden',
          marginBottom: isLast ? spacing.md : 0,
        }}
      >
        {!isFirst ? (
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              backgroundColor: colorWithAlpha(theme.colors.primary.main, 0.18),
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
                        <Text
                          style={[
                            type.textStyles.caption,
                            {
                              fontFamily: fonts.hebrew.regular,
                              color: theme.colors.text.secondary,
                            },
                          ]}
                          accessibilityLanguage="he"
                        >
                          {`תהלים ${perekToHebrew(perek)}`}
                        </Text>
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
                          <Text
                            style={[type.textStyles.label, { color: theme.colors.semantic.error }]}
                          >
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
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 4,
  },
  tileHalf: {
    width: '50%',
    padding: 4,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    minHeight: 40,
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
