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

interface PrayerItem {
  id: string;
  title: string;
  hebrewTitle: string;
  subtitle: string;
  icon: string;
  service: 'shacharis' | 'mincha' | 'maariv';
  color: string;
  defaultTime: string;
}

interface LibraryItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  screen: string;
  color: string;
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
    subtitle: 'Morning prayers',
    icon: '🌅',
    service: 'shacharis',
    color: 'rgba(255, 200, 120, 0.3)',
    defaultTime: '7:00 AM',
  },
  {
    id: 'mincha',
    title: 'Mincha',
    hebrewTitle: 'מנחה',
    subtitle: 'Afternoon prayers',
    icon: '☀️',
    service: 'mincha',
    color: 'rgba(255, 180, 100, 0.3)',
    defaultTime: '1:00 PM',
  },
  {
    id: 'maariv',
    title: 'Maariv',
    hebrewTitle: 'מעריב',
    subtitle: 'Evening prayers',
    icon: '🌙',
    service: 'maariv',
    color: 'rgba(100, 120, 180, 0.3)',
    defaultTime: '8:00 PM',
  },
];

const LIBRARY_ITEMS: LibraryItem[] = [
  // Most used first
  {
    id: 'asher_yatzar',
    title: 'Asher Yatzar',
    subtitle: 'Blessing after using the bathroom',
    icon: '💧',
    screen: 'AsherYatzar',
    color: 'rgba(165, 212, 196, 0.3)',
  },
  {
    id: 'bedtime',
    title: 'Bedtime Shema',
    subtitle: 'Kriyas Shema al haMitah • Before sleep',
    icon: '📿',
    screen: 'SiddurReader',
    color: 'rgba(165, 180, 212, 0.3)',
  },
  {
    id: 'tehillim',
    title: 'Tehillim',
    subtitle: '150 chapters • Set daily or weekly goals',
    icon: '📖',
    screen: 'TehillimList',
    color: 'rgba(212, 165, 184, 0.3)',
  },
  {
    id: 'tefilas_haderech',
    title: 'Tefillas HaDerech',
    subtitle: 'Traveler’s prayer • Safe journey',
    icon: '✈️',
    screen: 'TefillasHaDerech',
    color: 'rgba(196, 212, 232, 0.3)',
  },
  {
    id: 'bentching',
    title: 'Bentching',
    subtitle: 'Birkas Hamazon • Grace after meals',
    icon: '🍞',
    screen: 'Bentching',
    color: 'rgba(212, 196, 165, 0.3)',
  },
  // Rest of library
  {
    id: 'gemara',
    title: 'Gemara',
    subtitle: 'Talmud Bavli • Daf Yomi & masechtos',
    icon: '📚',
    screen: 'Gemara',
    color: 'rgba(180, 160, 255, 0.3)',
  },
  {
    id: 'nach',
    title: 'Nach',
    subtitle: 'Neviim & Ketuvim • Nach Yomi & chapters',
    icon: '📖',
    screen: 'Nach',
    color: 'rgba(160, 180, 255, 0.3)',
  },
  {
    id: 'mishna',
    title: 'Mishna',
    subtitle: '6 sedarim • Mishna Yomi & perakim',
    icon: '📕',
    screen: 'Mishna',
    color: 'rgba(200, 165, 165, 0.3)',
  },
  {
    id: 'rambam',
    title: 'Rambam',
    subtitle: 'Mishneh Torah • Rambam Yomi (3 perakim)',
    icon: '📕',
    screen: 'Rambam',
    color: 'rgba(180, 140, 100, 0.3)',
  },
  {
    id: 'chumash',
    title: 'Chumash',
    subtitle: 'Five Books • Shneyim Mikra VeChad Targum',
    icon: '📜',
    screen: 'Chumash',
    color: 'rgba(165, 200, 165, 0.3)',
  },
  {
    id: 'pirkei_avos',
    title: 'Pirkei Avos',
    subtitle: 'Ethics of the Fathers • 6 perakim',
    icon: '📖',
    screen: 'PirkeiAvos',
    color: 'rgba(165, 180, 165, 0.3)',
  },
];

/** Unified searchable item – all Library content in one flat list */
type SearchableItem = {
  id: string;
  title: string;
  subtitle: string;
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
      subtitle: p.subtitle,
      keywords: `${p.title} ${p.hebrewTitle} ${p.subtitle} שחרית מנחה מעריב morning afternoon evening prayer`,
      icon: p.icon,
      color: p.color,
      onPress: () => handlePrayerPress(p),
    })),
    // Quick Links (unique ids to avoid key collision with LIBRARY_ITEMS)
    { id: 'quick_asher_yatzar', title: 'Asher Yatzar', subtitle: 'Blessing after bathroom', keywords: 'asher yatzar bathroom blessing ברכה', icon: '💧', color: 'rgba(165, 212, 196, 0.3)', onPress: () => nav.navigate('SiddurReader', { service: 'asher_yatzar' }) },
    { id: 'quick_tehillim', title: 'Tehillim', subtitle: '150 perakim', keywords: 'tehillim psalm perek תהלים', icon: '📖', color: 'rgba(212, 165, 184, 0.3)', onPress: () => nav.navigate('TehillimList') },
    { id: 'quick_bentching', title: 'Bentching', subtitle: 'Birkas Hamazon', keywords: 'bentching birkas hamazon grace meals ברכת המזון', icon: '🍞', color: 'rgba(212, 196, 165, 0.3)', onPress: () => nav.navigate('SiddurReader', { service: 'bentching' }) },
    // Parsha
    { id: 'parsha', title: 'Parsha', subtitle: 'Weekly Torah portion', keywords: 'parsha torah portion weekly פרשה', icon: '📜', color: 'rgba(165, 200, 165, 0.3)', onPress: () => nav.navigate('Parsha') },
    { id: 'chumash_search', title: 'Chumash', subtitle: 'Shneyim Mikra VeChad Targum', keywords: 'chumash torah five books shneyim mikra chad targum חומש שניים מקרא', icon: '📜', color: 'rgba(165, 200, 165, 0.3)', onPress: () => nav.navigate('Chumash') },
    // More Texts
    ...LIBRARY_ITEMS.map((i) => ({
      id: i.id,
      title: i.title,
      subtitle: i.subtitle,
      keywords: `${i.title} ${i.subtitle} gemara talmud nach mishna rambam chumash torah shneyim mikra parsha pirkei avos tehillim brachos bentching bedtime tefilas haderech`,
      icon: i.icon,
      color: i.color,
      onPress: () => handleItemPress(i),
    })),
    // Gemara masechtos
    ...MESECHTAS.map((m) => ({
      id: `gemara_${m.name}`,
      title: m.name,
      subtitle: `Gemara • ${m.dapim} דפים`,
      keywords: `gemara talmud daf ${m.name} ${m.hebrew} מסכת`,
      icon: '📚',
      color: 'rgba(180, 160, 255, 0.3)',
      onPress: () => nav.navigate('GemaraTractate', { tractate: m.name }),
    })),
    // Mishna tractates
    ...MISHNA_TRACTATES.map((t) => ({
      id: `mishna_${t.sefariaName}`,
      title: t.sefariaName,
      subtitle: `Mishna • ${t.perakim} פרקים`,
      keywords: `mishna mishnah ${t.sefariaName} ${t.hebrew} מסכת`,
      icon: '📕',
      color: 'rgba(200, 165, 165, 0.3)',
      onPress: () => nav.navigate('MishnaTractate', { tractate: t.sefariaName }),
    })),
    // Nach books
    ...NACH_BOOKS.map((b) => ({
      id: `nach_${b.sefariaName}`,
      title: b.sefariaName,
      subtitle: `Nach • ${b.chapters} פרקים`,
      keywords: `nach tanakh neviim ketuvim ${b.sefariaName} ${b.hebrew} נביאים כתובים`,
      icon: '📖',
      color: 'rgba(160, 180, 255, 0.3)',
      onPress: () => nav.navigate('NachBook', { book: b.sefariaName }),
    })),
    // Rambam sections (Hilchot)
    ...RAMBAM_BOOKS.flatMap((book) =>
      book.sections.map((s) => ({
        id: `rambam_${s.sefariaName.replace(/\s+/g, '_')}`,
        title: s.hebrew,
        subtitle: `Rambam ${book.english} • ${s.chapters} פרקים`,
        keywords: `rambam mishneh torah hilchos ${s.sefariaName} ${s.hebrew} ${book.english} הלכות`,
        icon: '📕',
        color: 'rgba(180, 140, 100, 0.3)',
        onPress: () => nav.navigate('RambamSection', { sefariaName: s.sefariaName }),
      }))
    ),
    // Pirkei Avos perakim
    ...[1, 2, 3, 4, 5, 6].map((p) => ({
      id: `pirkei_avos_${p}`,
      title: `Pirkei Avos ${p}`,
      subtitle: 'Perek ' + p,
      keywords: `pirkei avos avot perek ${p} פרקי אבות`,
      icon: '📖',
      color: 'rgba(165, 180, 165, 0.3)',
      onPress: () => nav.navigate('MishnaReader', { tractate: 'Pirkei Avot', perek: p }),
    })),
    // Quick Access
    { id: 'tehillim_23', title: 'Tehillim 23', subtitle: 'Psalm 23', keywords: 'tehillim psalm 23 mizmor תהלים', icon: '🌟', color: 'rgba(212, 165, 184, 0.3)', onPress: () => nav.navigate('TehillimReader', { psalm: 23 }) },
    { id: 'tehillim_91', title: 'Tehillim 91', subtitle: 'Psalm 91', keywords: 'tehillim psalm 91 mizmor תהלים', icon: '🛡️', color: 'rgba(212, 165, 184, 0.3)', onPress: () => nav.navigate('TehillimReader', { psalm: 91 }) },
    { id: 'tehillim_121', title: 'Tehillim 121', subtitle: 'Psalm 121', keywords: 'tehillim psalm 121 mizmor תהלים', icon: '⛰️', color: 'rgba(212, 165, 184, 0.3)', onPress: () => nav.navigate('TehillimReader', { psalm: 121 }) },
  ];
}

function matchesSearch(item: SearchableItem, q: string): boolean {
  if (!q.trim()) return true;
  const words = q.toLowerCase().trim().split(/\s+/);
  const searchable = `${item.title} ${item.subtitle} ${item.keywords}`.toLowerCase();
  return words.every((word) => searchable.includes(word));
}

// Glass Card Component - must use useStyles to get themed styles
const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  bgColor?: string;
}> = ({ children, style, onPress, bgColor }) => {
  const cardStyles = useStyles();
  const content = (
    <View style={[cardStyles.glassCard, style]}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={50} style={cardStyles.glassBlur}>
          <View style={[cardStyles.glassInner, bgColor && { backgroundColor: bgColor }]}>
            {children}
          </View>
        </BlurView>
      ) : (
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
          style={cardStyles.glassBlur}
        >
          <View style={[cardStyles.glassInner, bgColor && { backgroundColor: bgColor }]}>
            {children}
          </View>
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

  const handlePrayerPress = (item: PrayerItem) => {
    navigation.navigate('SiddurReader' as never, { service: item.service } as never);
  };

  const handleItemPress = (item: LibraryItem) => {
    if (item.id === 'parsha') {
      navigation.navigate('Parsha' as never);
    } else if (item.id === 'gemara') {
      navigation.navigate('Gemara' as never);
    } else if (item.id === 'nach') {
      navigation.navigate('Nach' as never);
    } else if (item.id === 'mishna') {
      navigation.navigate('Mishna' as never);
    } else if (item.id === 'rambam') {
      navigation.navigate('Rambam' as never);
    } else if (item.id === 'chumash') {
      navigation.navigate('Chumash' as never);
    } else if (item.id === 'pirkei_avos') {
      navigation.navigate('PirkeiAvos' as never);
    } else if (item.id === 'tehillim' || item.id === 'tehillim_more') {
      navigation.navigate('TehillimList' as never);
    } else if (item.id === 'bentching') {
      navigation.navigate('SiddurReader' as never, { service: 'bentching' } as never);
    } else if (item.id === 'bedtime') {
      navigation.navigate('SiddurReader' as never, { service: 'bedtime' } as never);
    } else {
      navigation.navigate('SiddurReader' as never, { service: item.id } as never);
    }
  };

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
                        <Text style={styles.prayerSubtitle}>{item.subtitle}</Text>
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
              <GlassCard style={styles.prayerCard} bgColor={item.color}>
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
                      <Text style={styles.prayerSubtitle}>{item.subtitle}</Text>
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
                <GlassCard style={styles.quickLinkCard} bgColor="rgba(165, 212, 196, 0.3)" onPress={() => navigation.navigate('SiddurReader' as never, { service: 'asher_yatzar' } as never)}>
                  <View style={styles.quickLinkCardInner}>
                    <Text style={styles.itemIcon}>💧</Text>
                    <Text style={styles.quickLinkTitle} numberOfLines={1}>Asher Yatzar</Text>
                  </View>
                </GlassCard>
              </View>
            </View>
            <View style={styles.quickLinkCardWrapper}>
              <View style={styles.quickLinkCardFill}>
                <GlassCard style={styles.quickLinkCard} bgColor="rgba(212, 165, 184, 0.3)" onPress={() => navigation.navigate('TehillimList' as never)}>
                  <View style={styles.quickLinkCardInner}>
                    <Text style={styles.itemIcon}>📖</Text>
                    <Text style={styles.quickLinkTitle} numberOfLines={1}>Tehillim</Text>
                  </View>
                </GlassCard>
              </View>
            </View>
            <View style={styles.quickLinkCardWrapper}>
              <View style={styles.quickLinkCardFill}>
                <GlassCard style={styles.quickLinkCard} bgColor="rgba(212, 196, 165, 0.3)" onPress={() => navigation.navigate('SiddurReader' as never, { service: 'bentching' } as never)}>
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
          <GlassCard style={styles.prayerCard} bgColor="rgba(165, 200, 165, 0.3)" onPress={() => navigation.navigate('Parsha' as never)}>
            <View style={styles.prayerCardContent}>
              <View style={styles.prayerCardLeft}>
                <Text style={styles.prayerIcon}>📜</Text>
                <View style={styles.prayerInfo}>
                  <Text style={styles.prayerTitle}>Parsha</Text>
                  <Text style={styles.prayerSubtitle}>Weekly Torah portion</Text>
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
                  style={styles.itemCard}
                  onPress={() => handleItemPress(item)}
                  bgColor={item.color}
                >
                  <View style={styles.itemCardInner}>
                    <Text style={styles.itemIcon}>{item.icon}</Text>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.itemSubtitle} numberOfLines={2}>{item.subtitle}</Text>
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
    gap: spacing.md,
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
    minHeight: 90,
  },
  quickLinkCard: {
    flex: 1,
    minHeight: 90,
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
  prayerCard: {},
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
    fontSize: 36,
    marginRight: spacing.md,
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
  prayerSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 2,
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
    minHeight: 130,
    overflow: 'hidden',
  },
  itemCardInner: {
    flex: 1,
    minHeight: 100,
  },
  itemIcon: {
    fontSize: 26,
    marginBottom: spacing.sm,
  },
  itemTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 15,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  itemSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: theme.isDark ? theme.colors.text.secondary : theme.colors.neutral[700],
    lineHeight: 15,
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
