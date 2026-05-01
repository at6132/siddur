import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, Modal, Pressable } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FadeIn } from '../../components/animations/FadeIn';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { MESECHTAS } from '../gemara/GemaraScreen';
import { MISHNA_TRACTATES } from '../../src/services/MishnaYomiService';
import { NACH_BOOKS } from '../../src/services/NachYomiService';
import { RAMBAM_BOOKS } from '../../src/services/RambamStructure';
import { navigateOrComingSoon, LIBRARY_GRID_COMING_SOON_IDS } from '../../src/feature/LibraryFeatureAccess';

interface PrayerItem {
  id: string;
  title: string;
  hebrewTitle: string;
  icon: string;
  service: 'shacharis' | 'mincha' | 'maariv';
  color: string;
  defaultTime: string;
}

interface LibraryItem {
  id: string;
  title: string;
  icon: string;
  screen: string;
  color: string;
  /** Hidden; powers Library search only */
  searchKeywords: string;
}

const LIBRARY_QUICK_ACCESS_KEY = '@library_quick_access_perakim';
const DEFAULT_QUICK_ACCESS_PERAKIM = [23, 91, 121, 100];
const QUICK_ACCESS_ICONS: { [key: number]: string } = {
  23: '🌟',
  91: '🛡️',
  100: '📿',
  121: '⛰️',
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
    icon: '🌅',
    service: 'shacharis',
    color: 'rgba(255, 200, 120, 0.3)',
    defaultTime: '7:00 AM',
  },
  {
    id: 'mincha',
    title: 'Mincha',
    hebrewTitle: 'מנחה',
    icon: '☀️',
    service: 'mincha',
    color: 'rgba(255, 180, 100, 0.3)',
    defaultTime: '1:00 PM',
  },
  {
    id: 'maariv',
    title: 'Maariv',
    hebrewTitle: 'מעריב',
    icon: '🌙',
    service: 'maariv',
    color: 'rgba(100, 120, 180, 0.3)',
    defaultTime: '8:00 PM',
  },
];

const LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: 'asher_yatzar',
    title: 'Asher Yatzar',
    icon: '💧',
    screen: 'AsherYatzar',
    color: 'rgba(165, 212, 196, 0.3)',
    searchKeywords: 'asher yatzar bathroom blessing ברכה',
  },
  {
    id: 'bedtime',
    title: 'Bedtime Shema',
    icon: '📿',
    screen: 'SiddurReader',
    color: 'rgba(165, 180, 212, 0.3)',
    searchKeywords: 'bedtime shema kriyat mitah sleep קריאת שמע המטה',
  },
  {
    id: 'tehillim',
    title: 'Tehillim',
    icon: '📖',
    screen: 'TehillimList',
    color: 'rgba(212, 165, 184, 0.3)',
    searchKeywords: 'tehillim psalms chapters perakim goals תהלים',
  },
  {
    id: 'tefilas_haderech',
    title: 'Tefillas HaDerech',
    icon: '✈️',
    screen: 'TefillasHaDerech',
    color: 'rgba(196, 212, 232, 0.3)',
    searchKeywords: 'tefillas haderech travel journey דרך',
  },
  {
    id: 'bentching',
    title: 'Bentching',
    icon: '🍞',
    screen: 'Bentching',
    color: 'rgba(212, 196, 165, 0.3)',
    searchKeywords: 'bentching birkas hamazon grace meals ברכת המזון',
  },
  {
    id: 'gemara',
    title: 'Gemara',
    icon: '📚',
    screen: 'Gemara',
    color: 'rgba(180, 160, 255, 0.3)',
    searchKeywords: 'gemara talmud bavli daf yomi masechta מסכת גמרא',
  },
  {
    id: 'nach',
    title: 'Nach',
    icon: '📖',
    screen: 'Nach',
    color: 'rgba(160, 180, 255, 0.3)',
    searchKeywords: 'nach neviim ketuvim tanakh yomi פרקים נביאים כתובים',
  },
  {
    id: 'mishna',
    title: 'Mishna',
    icon: '📕',
    screen: 'Mishna',
    color: 'rgba(200, 165, 165, 0.3)',
    searchKeywords: 'mishna mishnah seder yomi משנה',
  },
  {
    id: 'rambam',
    title: 'Rambam',
    icon: '📕',
    screen: 'Rambam',
    color: 'rgba(180, 140, 100, 0.3)',
    searchKeywords: 'rambam mishneh torah hilchot yomi רמבם הלכות',
  },
  {
    id: 'chumash',
    title: 'Chumash',
    icon: '📜',
    screen: 'Chumash',
    color: 'rgba(165, 200, 165, 0.3)',
    searchKeywords: 'chumash torah five books shneyim mikra targum חומש שניים מקרא',
  },
  {
    id: 'pirkei_avos',
    title: 'Pirkei Avos',
    icon: '📖',
    screen: 'PirkeiAvos',
    color: 'rgba(165, 180, 165, 0.3)',
    searchKeywords: 'pirkei avos avot ethics fathers פרקי אבות',
  },
];

/** Unified searchable item – all Library content in one flat list */
type SearchableItem = {
  id: string;
  title: string;
  keywords: string;
  icon: string;
  color: string;
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
      icon: p.icon,
      color: p.color,
      onPress: () => handlePrayerPress(p),
    })),
    { id: 'quick_asher_yatzar', title: 'Asher Yatzar', keywords: 'asher yatzar bathroom blessing ברכה', icon: '💧', color: 'rgba(165, 212, 196, 0.3)', onPress: () => nav.navigate('SiddurReader', { service: 'asher_yatzar' }) },
    { id: 'quick_tehillim', title: 'Tehillim', keywords: 'tehillim psalm perakim 150 תהלים', icon: '📖', color: 'rgba(212, 165, 184, 0.3)', onPress: () => nav.navigate('TehillimList') },
    { id: 'quick_bentching', title: 'Bentching', keywords: 'bentching birkas hamazon grace meals ברכת המזון', icon: '🍞', color: 'rgba(212, 196, 165, 0.3)', onPress: () => nav.navigate('SiddurReader', { service: 'bentching' }) },
    { id: 'parsha', title: 'Parsha', keywords: 'parsha torah portion weekly sedra פרשה', icon: '📜', color: 'rgba(165, 200, 165, 0.3)', onPress: () => navigateOrComingSoon(nav, { type: 'screen', name: 'Parsha' }) },
    { id: 'chumash_search', title: 'Chumash', keywords: 'chumash torah five books shneyim mikra targum חומש שניים מקרא', icon: '📜', color: 'rgba(165, 200, 165, 0.3)', onPress: () => navigateOrComingSoon(nav, { type: 'screen', name: 'Chumash' }) },
    ...LIBRARY_ITEMS.map((i) => ({
      id: i.id,
      title: i.title,
      keywords: `${i.title} ${i.searchKeywords} gemara talmud nach mishna rambam chumash torah parsha pirkei avos tehillim brachos bentching bedtime tefilas haderech`,
      icon: i.icon,
      color: i.color,
      onPress: () => handleItemPress(i),
    })),
    ...MESECHTAS.map((m) => ({
      id: `gemara_${m.name}`,
      title: m.name,
      keywords: `gemara talmud daf ${m.dapim} ${m.name} ${m.hebrew} מסכת דפים`,
      icon: '📚',
      color: 'rgba(180, 160, 255, 0.3)',
      onPress: () => navigateOrComingSoon(nav, { type: 'screen', name: 'GemaraTractate', params: { tractate: m.name } }),
    })),
    ...MISHNA_TRACTATES.map((t) => ({
      id: `mishna_${t.sefariaName}`,
      title: t.sefariaName,
      keywords: `mishna mishnah ${t.perakim} ${t.sefariaName} ${t.hebrew} מסכת פרקים`,
      icon: '📕',
      color: 'rgba(200, 165, 165, 0.3)',
      onPress: () => navigateOrComingSoon(nav, { type: 'screen', name: 'MishnaTractate', params: { tractate: t.sefariaName } }),
    })),
    ...NACH_BOOKS.map((b) => ({
      id: `nach_${b.sefariaName}`,
      title: b.sefariaName,
      keywords: `nach tanakh neviim ketuvim ${b.chapters} ${b.sefariaName} ${b.hebrew} נביאים כתובים פרקים`,
      icon: '📖',
      color: 'rgba(160, 180, 255, 0.3)',
      onPress: () => navigateOrComingSoon(nav, { type: 'screen', name: 'NachBook', params: { book: b.sefariaName } }),
    })),
    ...RAMBAM_BOOKS.flatMap((book) =>
      book.sections.map((s) => ({
        id: `rambam_${s.sefariaName.replace(/\s+/g, '_')}`,
        title: s.hebrew,
        keywords: `rambam mishneh torah hilchos ${s.chapters} ${s.sefariaName} ${s.hebrew} ${book.english} הלכות פרקים`,
        icon: '📕',
        color: 'rgba(180, 140, 100, 0.3)',
        onPress: () => navigateOrComingSoon(nav, { type: 'screen', name: 'RambamSection', params: { sefariaName: s.sefariaName } }),
      }))
    ),
    ...[1, 2, 3, 4, 5, 6].map((p) => ({
      id: `pirkei_avos_${p}`,
      title: `Pirkei Avos ${p}`,
      keywords: `pirkei avos avot perek ${p} פרקי אבות פרק`,
      icon: '📖',
      color: 'rgba(165, 180, 165, 0.3)',
      onPress: () => navigateOrComingSoon(nav, { type: 'screen', name: 'MishnaReader', params: { tractate: 'Pirkei Avot', perek: p } }),
    })),
    { id: 'tehillim_23', title: 'Tehillim 23', keywords: 'tehillim psalm 23 mizmor תהלים', icon: '🌟', color: 'rgba(212, 165, 184, 0.3)', onPress: () => nav.navigate('TehillimReader', { psalm: 23 }) },
    { id: 'tehillim_91', title: 'Tehillim 91', keywords: 'tehillim psalm 91 mizmor תהלים', icon: '🛡️', color: 'rgba(212, 165, 184, 0.3)', onPress: () => nav.navigate('TehillimReader', { psalm: 91 }) },
    { id: 'tehillim_121', title: 'Tehillim 121', keywords: 'tehillim psalm 121 mizmor תהלים', icon: '⛰️', color: 'rgba(212, 165, 184, 0.3)', onPress: () => nav.navigate('TehillimReader', { psalm: 121 }) },
  ];
}

function matchesSearch(item: SearchableItem, q: string): boolean {
  if (!q.trim()) return true;
  const words = q.toLowerCase().trim().split(/\s+/);
  const searchable = `${item.title} ${item.keywords}`.toLowerCase();
  return words.every((word) => searchable.includes(word));
}

// Glass Card Component - must use useStyles to get themed styles
const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  bgColor?: string;
  compact?: boolean;
}> = ({ children, style, onPress, bgColor, compact }) => {
  const cardStyles = useStyles();
  const inner = [
    cardStyles.glassInner,
    compact && cardStyles.glassInnerCompact,
    bgColor && { backgroundColor: bgColor },
  ];
  const content = (
    <View style={[cardStyles.glassCard, style]}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={50} style={cardStyles.glassBlur}>
          <View style={inner}>{children}</View>
        </BlurView>
      ) : (
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
          style={cardStyles.glassBlur}
        >
          <View style={inner}>{children}</View>
        </LinearGradient>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

export const LibraryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useStyles();

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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.backgroundGradient}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <FadeIn delay={0}>
          <Text style={styles.title}>Library</Text>
        </FadeIn>

        {/* Search Bar */}
        <FadeIn delay={25}>
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search prayers, texts, brachos..."
              placeholderTextColor={theme.colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
          </View>
        </FadeIn>

        {isSearching ? (
          /* Search Results */
          <View style={styles.searchResults}>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <GlassCard
                  key={item.id}
                  style={styles.searchResultCard}
                  bgColor={item.color}
                  compact
                  onPress={item.onPress}
                >
                  <TouchableOpacity
                    style={styles.prayerCardContent}
                    onPress={item.onPress}
                    activeOpacity={0.7}
                  >
                    <View style={styles.prayerCardLeft}>
                      <Text style={styles.prayerIcon}>{item.icon}</Text>
                      <View style={styles.prayerInfo}>
                        <Text style={styles.prayerTitle}>{item.title}</Text>
                      </View>
                    </View>
                    <Text style={styles.prayerArrow}>→</Text>
                  </TouchableOpacity>
                </GlassCard>
              ))
            ) : (
              <Text style={styles.searchEmpty}>No results for "{searchQuery.trim()}"</Text>
            )}
          </View>
        ) : (
          <>
        {/* Daily Prayers Section */}
        <FadeIn delay={50}>
          <Text style={styles.sectionTitle}>Daily Tefillos</Text>
        </FadeIn>

        <View style={styles.prayerCards}>
          {PRAYER_ITEMS.map((item, index) => (
            <FadeIn key={item.id} delay={100 + index * 50}>
              <GlassCard style={styles.prayerCard} bgColor={item.color} compact>
                <TouchableOpacity
                  style={styles.prayerCardContent}
                  onPress={() => handlePrayerPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.prayerCardLeft}>
                    <Text style={styles.prayerIcon}>{item.icon}</Text>
                    <View style={styles.prayerInfo}>
                      <View style={styles.prayerTitleRow}>
                        <Text style={styles.prayerTitle}>{item.title}</Text>
                        <Text style={styles.prayerHebrew}>{item.hebrewTitle}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.prayerArrow}>→</Text>
                </TouchableOpacity>
              </GlassCard>
            </FadeIn>
          ))}
        </View>

        {/* Quick Links */}
        <FadeIn delay={200}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.quickLinksRow}>
            <View style={styles.quickLinkCardWrapper}>
              <View style={styles.quickLinkCardFill}>
                <GlassCard style={styles.quickLinkCard} bgColor="rgba(165, 212, 196, 0.3)" compact onPress={() => navigation.navigate('SiddurReader' as never, { service: 'asher_yatzar' } as never)}>
                  <View style={styles.quickLinkCardInner}>
                    <Text style={styles.itemIcon}>💧</Text>
                    <Text style={styles.quickLinkTitle} numberOfLines={1}>Asher Yatzar</Text>
                  </View>
                </GlassCard>
              </View>
            </View>
            <View style={styles.quickLinkCardWrapper}>
              <View style={styles.quickLinkCardFill}>
                <GlassCard style={styles.quickLinkCard} bgColor="rgba(212, 165, 184, 0.3)" compact onPress={() => navigation.navigate('TehillimList' as never)}>
                  <View style={styles.quickLinkCardInner}>
                    <Text style={styles.itemIcon}>📖</Text>
                    <Text style={styles.quickLinkTitle} numberOfLines={1}>Tehillim</Text>
                  </View>
                </GlassCard>
              </View>
            </View>
            <View style={styles.quickLinkCardWrapper}>
              <View style={styles.quickLinkCardFill}>
                <GlassCard style={styles.quickLinkCard} bgColor="rgba(212, 196, 165, 0.3)" compact onPress={() => navigation.navigate('SiddurReader' as never, { service: 'bentching' } as never)}>
                  <View style={styles.quickLinkCardInner}>
                    <Text style={styles.itemIcon}>🍞</Text>
                    <Text style={styles.quickLinkTitle} numberOfLines={1}>Bentching</Text>
                  </View>
                </GlassCard>
              </View>
            </View>
          </View>
        </FadeIn>

        <View style={styles.sectionDivider} />

        {/* Parsha */}
        <FadeIn delay={250}>
          <GlassCard
            style={[styles.prayerCard, styles.libraryCardMuted]}
            bgColor="rgba(165, 200, 165, 0.3)"
            compact
            onPress={() => navigateOrComingSoon(navigation as any, { type: 'screen', name: 'Parsha' })}
          >
            <View style={styles.prayerCardContent}>
              <View style={styles.prayerCardLeft}>
                <Text style={styles.prayerIcon}>📜</Text>
                <View style={styles.prayerInfo}>
                  <Text style={styles.prayerTitle}>Parsha</Text>
                </View>
              </View>
              <Text style={styles.prayerArrow}>→</Text>
            </View>
          </GlassCard>
        </FadeIn>

        {/* Other Texts Section */}
        <FadeIn delay={300}>
          <Text style={[styles.sectionTitle, styles.moreTextsSectionTitle]}>More Texts</Text>
        </FadeIn>

        <View style={styles.grid}>
          {LIBRARY_ITEMS.map((item, index) => (
            <View key={item.id} style={styles.gridItemWrapper}>
              <FadeIn delay={350 + index * 30}>
                <GlassCard
                  style={[styles.itemCard, LIBRARY_GRID_COMING_SOON_IDS.has(item.id) && styles.libraryCardMuted]}
                  compact
                  onPress={() => handleItemPress(item)}
                  bgColor={item.color}
                >
                  <View style={styles.itemCardInner}>
                    <Text style={styles.itemIcon}>{item.icon}</Text>
                    <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                  </View>
                </GlassCard>
              </FadeIn>
            </View>
          ))}
        </View>

        {/* Quick Access Section */}
        <FadeIn delay={500}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickAccessRow}>
            {quickAccessPerakim.map((perek) => (
              <TouchableOpacity
                key={perek}
                style={styles.quickAccessItem}
                onPress={() => navigation.navigate('TehillimReader' as never, { psalm: perek } as never)}
              >
                <Text style={styles.quickAccessIcon}>{QUICK_ACCESS_ICONS[perek] ?? '📖'}</Text>
                <Text style={styles.quickAccessText}>תהלים {perekToHebrew(perek)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.quickAccessCustomizeButton}
            onPress={() => setQuickAccessCustomizeVisible(true)}
          >
            <Text style={styles.quickAccessCustomizeText}>Customize</Text>
          </TouchableOpacity>
        </FadeIn>

        {/* Quick Access Customize Modal */}
        <Modal visible={quickAccessCustomizeVisible} transparent animationType="fade">
          <Pressable style={styles.customizeModalBackdrop} onPress={() => setQuickAccessCustomizeVisible(false)}>
            <Pressable style={styles.customizeModalBox} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.customizeModalTitle}>Quick Access Perakim</Text>
              <Text style={styles.customizeModalSubtitle}>Add or remove perakim (1–150)</Text>
              <ScrollView style={styles.customizeModalList}>
                {quickAccessPerakim.map((perek) => (
                  <View key={perek} style={styles.customizeModalRow}>
                    <Text style={styles.customizeModalRowText}>תהלים {perekToHebrew(perek)}</Text>
                    <TouchableOpacity
                      onPress={() => removeQuickAccessPerek(perek)}
                      style={styles.customizeModalRemoveBtn}
                      disabled={quickAccessPerakim.length <= 1}
                    >
                      <Text style={styles.customizeModalRemoveText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.customizeModalAddRow}>
                <TextInput
                  style={styles.customizeModalInput}
                  placeholder="Perek number (1–150)"
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={customizeNewPerek}
                  onChangeText={setCustomizeNewPerek}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <TouchableOpacity style={styles.customizeModalAddBtn} onPress={addQuickAccessPerek}>
                  <Text style={styles.customizeModalAddBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.customizeModalDoneBtn}
                onPress={() => setQuickAccessCustomizeVisible(false)}
              >
                <Text style={styles.customizeModalDoneText}>Done</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Attribution */}
        <FadeIn delay={550}>
          <View style={styles.attribution}>
            <Text style={styles.attributionText}>
              Texts provided by Sefaria • sefaria.org
            </Text>
          </View>
        </FadeIn>
          </>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>
    </View>
  );
};

function createLibraryStyles(theme: AppTheme) {
  return {
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl + spacing.safeTopInset,
  },
  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 32,
    color: theme.colors.text.primary,
    marginBottom: spacing.md,
  },
  searchBarContainer: {
    marginBottom: spacing.lg,
  },
  searchInput: {
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
  },
  searchResults: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  searchResultCard: {
    marginBottom: spacing.sm,
  },
  searchEmpty: {
    fontFamily: fonts.body.regular,
    fontSize: 15,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 18,
    color: theme.colors.text.primary,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  moreTextsSectionTitle: {
    marginTop: spacing.lg,
  },
  prayerCards: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
    marginVertical: spacing.md,
  },
  quickLinksRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'stretch',
    width: '100%',
  },
  quickLinkCardWrapper: {
    flex: 1,
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  quickLinkCardFill: {
    flex: 1,
    width: '100%',
    minHeight: 76,
  },
  quickLinkCard: {
    flex: 1,
    minHeight: 76,
  },
  quickLinkCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 12,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  glassCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)',
    shadowColor: theme.isDark ? '#000' : 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: theme.isDark ? 0.45 : 0.2,
    shadowRadius: theme.isDark ? 14 : 8,
    elevation: 3,
  },
  glassBlur: {
    overflow: 'hidden',
  },
  glassInner: {
    padding: spacing.md,
    backgroundColor: theme.isDark ? 'rgba(10,10,15,0.55)' : 'rgba(255,255,255,0.4)',
  },
  glassInnerCompact: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  prayerCard: {},
  libraryCardMuted: {
    opacity: 0.52,
  },
  prayerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prayerCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  prayerIcon: {
    fontSize: 32,
    marginRight: spacing.sm + 2,
  },
  prayerInfo: {
    flex: 1,
  },
  prayerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  prayerTitle: {
    fontFamily: fonts.heading.bold,
    fontSize: 20,
    color: theme.colors.text.primary,
  },
  prayerHebrew: {
    fontFamily: fonts.hebrew.regular,
    fontSize: 16,
    color: theme.colors.text.secondary,
    letterSpacing: 0,
  },
  prayerArrow: {
    fontFamily: fonts.body.bold,
    fontSize: 20,
    color: theme.colors.text.tertiary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    marginHorizontal: -spacing.sm,
  },
  gridItemWrapper: {
    flexBasis: '50%',
    flexGrow: 0,
    flexShrink: 0,
    width: '50%',
    maxWidth: '50%',
    padding: spacing.sm,
    overflow: 'hidden',
  },
  itemCard: {
    width: '100%',
    minHeight: 88,
    overflow: 'hidden',
  },
  itemCardInner: {
    flex: 1,
    minHeight: 72,
    justifyContent: 'center',
  },
  itemIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  itemTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  quickAccessRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickAccessItem: {
    minWidth: 80,
    flex: 1,
    backgroundColor: theme.isDark ? 'rgba(20,20,35,0.85)' : 'rgba(255,255,255,0.75)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
    shadowColor: theme.isDark ? '#000' : 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.35 : 0.15,
    shadowRadius: theme.isDark ? 10 : 6,
    elevation: 2,
  },
  quickAccessIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  quickAccessText: {
    fontFamily: fonts.hebrew.medium,
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    letterSpacing: 0,
    writingDirection: 'rtl',
  },
  quickAccessCustomizeButton: {
    marginTop: spacing.sm,
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  quickAccessCustomizeText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: theme.colors.primary.main,
    textDecorationLine: 'underline',
  },
  customizeModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  customizeModalBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.background.primary,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    maxHeight: '80%',
  },
  customizeModalTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 18,
    color: theme.colors.text.primary,
    marginBottom: spacing.xs,
  },
  customizeModalSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: spacing.md,
  },
  customizeModalList: {
    maxHeight: 200,
    marginBottom: spacing.md,
  },
  customizeModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  },
  customizeModalRowText: {
    fontFamily: fonts.hebrew.medium,
    fontSize: 15,
    color: theme.colors.text.primary,
    letterSpacing: 0,
    writingDirection: 'rtl',
  },
  customizeModalRemoveBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  customizeModalRemoveText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: theme.colors.semantic?.error ?? '#c53030',
  },
  customizeModalAddRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  customizeModalInput: {
    flex: 1,
    fontFamily: fonts.body.regular,
    fontSize: 15,
    color: theme.colors.text.primary,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
  },
  customizeModalAddBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.primary.main,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
  },
  customizeModalAddBtnText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: '#fff',
  },
  customizeModalDoneBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    borderRadius: borderRadius.lg,
  },
  customizeModalDoneText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  attribution: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  attributionText: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: theme.colors.text.tertiary,
  },
  };
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(() => {
    try {
      return StyleSheet.create(createLibraryStyles(theme));
    } catch (e) {
      console.warn('LibraryScreen styles error:', e);
      return StyleSheet.create({ container: { flex: 1 } });
    }
  }, [theme]);
}
