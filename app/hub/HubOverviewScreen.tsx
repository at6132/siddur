/**
 * Hub – Clean dashboard with at-a-glance stats and quick navigation to sub-pages.
 */

import React, { useState, useCallback, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { FadeIn } from '../../components/animations/FadeIn';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { colors } from '../../src/design/colors';
import { useTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';
import { getBrachosCount, addBrachos, getBrachosTotalForRange, BRACHOS_PER_TEFILLA } from '../../src/storage/BrachosCounterService';
import { DailyTehillimTracker } from '../../src/storage/DailyTehillimTracker';
import { TzedakahTracker } from '../../src/storage/TzedakahTracker';
import { DailyGoalsService } from '../../src/storage/DailyGoalsService';

type TimeFrame = 'day' | 'week' | 'month';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE_GAP = spacing.md;
const TILE_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - TILE_GAP) / 2;
const SLIDER_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const SLIDER_SEGMENT_WIDTH = SLIDER_WIDTH / 3;

function TimeFrameSlider({ value, onChange }: { value: TimeFrame; onChange: (tf: TimeFrame) => void }) {
  const options: TimeFrame[] = ['day', 'week', 'month'];
  const labels = ['Today', 'Week', 'Month'];
  const index = options.indexOf(value);
  const translateX = useSharedValue(index * SLIDER_SEGMENT_WIDTH);

  useEffect(() => {
    translateX.value = withSpring(index * SLIDER_SEGMENT_WIDTH, { damping: 20, stiffness: 200 });
  }, [index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.sliderContainer}>
      <Animated.View style={[styles.sliderIndicator, indicatorStyle]} />
      {options.map((opt, i) => (
        <TouchableOpacity
          key={opt}
          style={styles.sliderSegment}
          onPress={() => onChange(opt)}
          activeOpacity={0.7}
        >
          <Text style={[styles.sliderLabel, value === opt && styles.sliderLabelActive]}>
            {labels[i]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

interface StatTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  subtitle?: string;
  onPress: () => void;
  accentColor?: string;
  onActionPress?: () => void;
  showAction?: boolean;
}

function StatTile({ icon, iconBg, iconColor, label, value, subtitle, onPress, accentColor, onActionPress, showAction }: StatTileProps) {
  return (
    <TouchableOpacity style={styles.statTile} onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.92)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.tileHeader}>
        <View style={[styles.tileIconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        {showAction && onActionPress && (
          <TouchableOpacity
            style={[styles.plusBtn, { backgroundColor: iconBg }]}
            onPress={onActionPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="add" size={20} color={iconColor} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.tileContent}>
        <Text style={styles.tileLabel}>{label}</Text>
        <Text style={[styles.tileValue, accentColor && { color: accentColor }]}>{value}</Text>
        {subtitle && <Text style={styles.tileSubtitle}>{subtitle}</Text>}
      </View>
      <View style={[styles.tileAccent, { backgroundColor: accentColor || iconColor }]} />
    </TouchableOpacity>
  );
}

interface ExploreCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  comingSoon?: boolean;
  onPress?: () => void;
}

function ExploreCard({ icon, title, subtitle, comingSoon, onPress }: ExploreCardProps) {
  return (
    <TouchableOpacity
      style={[styles.exploreCard, comingSoon && styles.exploreCardDisabled]}
      onPress={onPress}
      activeOpacity={comingSoon ? 1 : 0.8}
      disabled={comingSoon}
    >
      <Ionicons name={icon} size={28} color={comingSoon ? colors.text.tertiary : colors.primary.main} />
      <View style={styles.exploreCardText}>
        <Text style={[styles.exploreCardTitle, comingSoon && styles.exploreCardTitleDisabled]}>{title}</Text>
        <Text style={styles.exploreCardSubtitle}>{subtitle}</Text>
      </View>
      {comingSoon && (
        <View style={styles.comingSoonPill}>
          <Text style={styles.comingSoonText}>Soon</Text>
        </View>
      )}
      {!comingSoon && <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />}
    </TouchableOpacity>
  );
}

export const HubOverviewScreen: React.FC = () => {
  const { theme } = useTheme();
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
    const { start, end, days } = getDateRange(timeFrame);

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

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.backgroundGradient} style={StyleSheet.absoluteFill} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FadeIn delay={0}>
          <TouchableOpacity
            style={styles.featureBannerWrap}
            activeOpacity={0.9}
            onPress={() => (navigation as any).navigate('Settings', { scrollTo: 'shabbosAlarm' })}
            accessibilityRole="button"
            accessibilityLabel="New feature: Shabbos alarm can ring briefly each Shabbos morning. Opens Settings to Shabbos alarm."
          >
            <LinearGradient
              colors={[
                colorWithAlpha(theme.colors.primary.main, 0.38),
                colorWithAlpha(theme.colors.accent.lavender, 0.22),
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.featureBanner}
            >
              <View style={styles.featureBannerIconWrap}>
                <Ionicons name="sparkles" size={20} color={colors.primary.main} />
              </View>
              <View style={styles.featureBannerTextCol}>
                <Text style={styles.featureBannerTitle}>New Feature</Text>
                <Text style={styles.featureBannerSub}>
                  The Shabbos alarm can ring for just a few seconds every Shabbos morning
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </LinearGradient>
          </TouchableOpacity>
        </FadeIn>

        {/* Header */}
        <FadeIn delay={0}>
          <Text style={styles.greeting}>Good {getTimeOfDay()}</Text>
          <Text style={styles.date}>{dayName}</Text>
        </FadeIn>

        {/* Time Frame Slider */}
        <FadeIn delay={50}>
          <TimeFrameSlider value={timeFrame} onChange={setTimeFrame} />
        </FadeIn>
        
        {/* Stats - 2x2 Grid */}
        <View style={styles.statsGrid}>
          <FadeIn delay={100}>
            <StatTile
              icon="checkmark-circle-outline"
              iconBg="rgba(212, 165, 184, 0.12)"
              iconColor={colors.primary.main}
              accentColor={colors.primary.main}
              label="Goals"
              value={timeFrame === 'day' 
                ? `${goalsSummary.completed}/${goalsSummary.total}`
                : goalsRangeSummary ? `${goalsRangeSummary.daysCompleted}/${goalsRangeSummary.totalDays}` : '—'
              }
              subtitle={timeFrame === 'day' ? 'completed' : 'days completed'}
              onPress={() => (navigation as any).navigate('DailyGoals')}
            />
          </FadeIn>
          <FadeIn delay={150}>
            <StatTile
              icon="book-outline"
              iconBg="rgba(212, 165, 184, 0.12)"
              iconColor={colors.primary.main}
              accentColor={colors.primary.main}
              label="Tehillim"
              value={timeFrame === 'day' 
                ? `${tehillimProgress.percentComplete}%`
                : `${tehillimDaysCompleted}/${days}`
              }
              subtitle={timeFrame === 'day' 
                ? (tehillimStreak > 0 ? `${tehillimStreak} day streak` : tehillimProgress.dayName)
                : 'days completed'
              }
              onPress={() => (navigation as any).navigate('TehillimList')}
            />
          </FadeIn>
          <FadeIn delay={200}>
            <StatTile
              icon="sparkles-outline"
              iconBg="rgba(212, 165, 184, 0.12)"
              iconColor={colors.primary.main}
              accentColor={colors.primary.main}
              label="Brachos"
              value={`${brachosTotal}`}
              subtitle={`of ${brachosGoal} goal`}
              onPress={() => (navigation as any).navigate('Library')}
              showAction={timeFrame === 'day'}
              onActionPress={() => setBrachosMenuVisible(true)}
            />
          </FadeIn>
          <FadeIn delay={250}>
            <StatTile
              icon="heart-outline"
              iconBg="rgba(212, 165, 184, 0.12)"
              iconColor={colors.primary.main}
              accentColor={colors.primary.main}
              label="Tzedakah"
              value={tzedakahTotal > 0 ? `$${tzedakahTotal.toFixed(0)}` : '$0'}
              subtitle={timeFrame === 'day' ? 'given today' : `given this ${timeFrame}`}
              onPress={() => (navigation as any).navigate('Tzedakah')}
            />
          </FadeIn>
        </View>

        {/* Brachos Add Menu */}
        <Modal visible={brachosMenuVisible} transparent animationType="fade">
          <Pressable style={styles.menuBackdrop} onPress={() => setBrachosMenuVisible(false)}>
            <Pressable style={styles.menuBox} onPress={() => {}}>
              <Text style={styles.menuTitle}>Add Brachos</Text>
              <TouchableOpacity style={styles.menuItem} onPress={() => handleBrachosAdd(1)}>
                <View style={styles.menuItemLeft}>
                  <Ionicons name="add-circle-outline" size={22} color={colors.accent.gold} />
                  <Text style={styles.menuItemText}>+1 Bracha</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => handleBrachosAdd(BRACHOS_PER_TEFILLA.shacharis)}>
                <View style={styles.menuItemLeft}>
                  <Ionicons name="sunny-outline" size={22} color={colors.accent.gold} />
                  <Text style={styles.menuItemText}>Shacharis</Text>
                </View>
                <Text style={styles.menuItemBadge}>+{BRACHOS_PER_TEFILLA.shacharis}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => handleBrachosAdd(BRACHOS_PER_TEFILLA.mincha)}>
                <View style={styles.menuItemLeft}>
                  <Ionicons name="partly-sunny-outline" size={22} color={colors.accent.gold} />
                  <Text style={styles.menuItemText}>Mincha</Text>
                </View>
                <Text style={styles.menuItemBadge}>+{BRACHOS_PER_TEFILLA.mincha}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => handleBrachosAdd(BRACHOS_PER_TEFILLA.maariv)}>
                <View style={styles.menuItemLeft}>
                  <Ionicons name="moon-outline" size={22} color={colors.accent.gold} />
                  <Text style={styles.menuItemText}>Maariv</Text>
                </View>
                <Text style={styles.menuItemBadge}>+{BRACHOS_PER_TEFILLA.maariv}</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Quick Actions */}
        <FadeIn delay={300}>
          <Text style={styles.sectionLabel}>Quick Actions</Text>
        </FadeIn>

        <FadeIn delay={350}>
          <ExploreCard
            icon="journal-outline"
            title="Gratitude Journal"
            subtitle="What are you thankful for?"
            onPress={() => (navigation as any).navigate('Gratitude')}
          />
        </FadeIn>

        {/* Explore Section */}
        <FadeIn delay={400}>
          <Text style={styles.sectionLabel}>Explore</Text>
        </FadeIn>

        <FadeIn delay={450}>
          <ExploreCard
            icon="book-outline"
            title="Shared Tehillim"
            subtitle="Create or join a shared Tehillim page"
            onPress={() => (navigation as any).navigate('CreateSharedTehillim')}
          />
        </FadeIn>

        <FadeIn delay={450}>
          <ExploreCard
            icon="location-outline"
            title="Minyan Finder"
            subtitle="Find nearby minyanim"
            comingSoon
          />
        </FadeIn>

        <FadeIn delay={500}>
          <ExploreCard
            icon="restaurant-outline"
            title="Kosher Restaurants"
            subtitle="Discover kosher dining"
            comingSoon
          />
        </FadeIn>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.xl + spacing.safeTopInset },

  featureBannerWrap: {
    marginBottom: spacing.md,
  },
  featureBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: spacing.sm,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  featureBannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureBannerTextCol: { flex: 1 },
  featureBannerTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 15,
    color: colors.text.primary,
    marginBottom: 2,
  },
  featureBannerSub: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  
  // Header
  greeting: {
    fontFamily: fonts.heading.bold,
    fontSize: 28,
    color: colors.text.primary,
    marginBottom: 2,
  },
  date: {
    fontFamily: fonts.body.regular,
    fontSize: 15,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },

  // Time Frame Slider
  sliderContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    padding: 4,
    marginBottom: spacing.lg,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  sliderIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: SLIDER_SEGMENT_WIDTH - 8,
    height: '100%',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  sliderSegment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  sliderLabel: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.text.tertiary,
  },
  sliderLabelActive: {
    color: colors.text.primary,
    fontFamily: fonts.body.semibold,
  },

  // Section Labels
  sectionLabel: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
  },
  statTile: {
    width: TILE_WIDTH,
    minHeight: 130,
    borderRadius: 24,
    padding: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  tileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tileIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  tileLabel: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tileValue: {
    fontFamily: fonts.heading.bold,
    fontSize: 26,
    color: colors.text.primary,
    lineHeight: 30,
  },
  tileSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  tileAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  plusBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colorWithAlpha(colors.accent.gold, 0.18),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Brachos Menu
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  menuBox: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    width: 280,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
      android: { elevation: 8 },
    }),
  },
  menuTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 18,
    color: colors.text.primary,
    textAlign: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuItemText: {
    fontFamily: fonts.body.medium,
    fontSize: 16,
    color: colors.text.primary,
  },
  menuItemBadge: {
    fontFamily: fonts.body.semibold,
    fontSize: 14,
    color: colors.accent.gold,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginHorizontal: spacing.lg,
  },

  // Explore Cards
  exploreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    gap: spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  exploreCardDisabled: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  exploreCardText: {
    flex: 1,
  },
  exploreCardTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 15,
    color: colors.text.primary,
  },
  exploreCardTitleDisabled: {
    color: colors.text.secondary,
  },
  exploreCardSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  comingSoonPill: {
    backgroundColor: colorWithAlpha(colors.accent.lavender, 0.22),
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  comingSoonText: {
    fontFamily: fonts.body.medium,
    fontSize: 10,
    color: colors.primary.main,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
