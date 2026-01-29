import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassButton } from '../../components/ui/GlassButton';
import { FadeIn } from '../../components/animations/FadeIn';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorView } from '../../components/ui/ErrorView';
import { NotificationBanner } from '../../components/ui/NotificationBanner';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles, fonts } from '../../src/design/typography';
import { CalendarEngine } from '../../src/core/calendar/CalendarEngine';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { DailyTehillimTracker } from '../../src/storage/DailyTehillimTracker';
import { DayInfo } from '../../src/types/calendar';
import { CalendarContext } from '../../src/types/calendar';
import { OmerCalculator } from '../../src/core/omer/OmerCalculator';

const { width, height } = Dimensions.get('window');

// Floating Orb Component
const FloatingOrb: React.FC<{
  size: number;
  color: string;
  style?: any;
  duration?: number;
}> = ({ size, color, style, duration = 4000 }) => {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -20,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          position: 'absolute',
          transform: [{ translateY }],
        },
        style,
      ]}
    />
  );
};

// Glass Card Component
const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}> = ({ children, style, onPress }) => {
  const content = (
    <View style={[styles.glassCard, style]}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={60} style={styles.glassBlur}>
          <View style={styles.glassInner}>{children}</View>
        </BlurView>
      ) : (
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
          style={styles.glassBlur}
        >
          <View style={styles.glassInner}>{children}</View>
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

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [dayInfo, setDayInfo] = useState<DayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tehillimProgress, setTehillimProgress] = useState({
    percentComplete: 0,
    chaptersRemaining: [] as number[],
    totalChapters: [] as number[],
    message: '',
  });

  // Animation for progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadDayInfo();
  }, []);

  // Reload Tehillim progress when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadTehillimProgress();
    }, [])
  );

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: tehillimProgress.percentComplete,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [tehillimProgress.percentComplete]);

  const loadDayInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const preferences = await UserPreferencesService.getPreferences();
      if (!preferences) {
        setError('Please complete onboarding first');
        return;
      }

      const context: CalendarContext = {
        nusach: preferences.nusach,
        location: preferences.location,
      };

      const info = await CalendarEngine.getTodayInfo(context);
      setDayInfo(info);
      await loadTehillimProgress();
    } catch (err) {
      console.error('Error loading day info:', err);
      setError('Failed to load day information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTehillimProgress = async () => {
    const progress = await DailyTehillimTracker.getTodaysProgress();
    const message = await DailyTehillimTracker.getMotivationalMessage();
    setTehillimProgress({
      percentComplete: progress.percentComplete,
      chaptersRemaining: progress.chaptersRemaining,
      totalChapters: progress.totalChapters,
      message,
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDayInfo();
  };

  const handleTehillimPress = async () => {
    const nextChapter = await DailyTehillimTracker.getNextChapter();
    if (nextChapter) {
      navigation.navigate('TehillimReader' as never, { psalm: nextChapter } as never);
    } else {
      navigation.navigate('Tehillim' as never);
    }
  };

  const formatTime = (date: Date | undefined) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
          style={StyleSheet.absoluteFill}
        />
        <LoadingSpinner />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
          style={StyleSheet.absoluteFill}
        />
        <ErrorView message={error} onRetry={loadDayInfo} />
      </View>
    );
  }

  if (!dayInfo) return null;

  const greeting = getGreeting();
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5', '#FAF9F7']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Orbs */}
      <FloatingOrb
        size={180}
        color="rgba(212, 165, 184, 0.2)"
        style={{ top: height * 0.02, left: -60 }}
        duration={5000}
      />
      <FloatingOrb
        size={140}
        color="rgba(165, 196, 212, 0.2)"
        style={{ top: height * 0.2, right: -40 }}
        duration={6000}
      />

      {/* Notification Banner */}
      <NotificationBanner onSetup={() => navigation.navigate('Settings' as never)} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <FadeIn delay={0}>
          <Text style={styles.greeting}>{greeting}</Text>
        </FadeIn>

        {/* Date Card */}
        <FadeIn delay={100}>
          <GlassCard style={styles.dateCard}>
            <Text style={styles.hebrewDate}>{dayInfo.jewishDateShort}</Text>
            <View style={styles.dateDivider} />
            <Text style={styles.gregorianDate}>
              {dayInfo.gregorianDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            {dayInfo.specialDays && dayInfo.specialDays.length > 0 && (
              <View style={styles.specialBadge}>
                <Text style={styles.specialBadgeText}>
                  {dayInfo.specialDays[0].name}
                </Text>
              </View>
            )}
          </GlassCard>
        </FadeIn>

        {/* Daily Tehillim Progress Card */}
        <FadeIn delay={150}>
          <GlassCard style={styles.tehillimCard} onPress={handleTehillimPress}>
            <View style={styles.tehillimHeader}>
              <View style={styles.tehillimIcon}>
                <Text style={styles.tehillimIconText}>📖</Text>
              </View>
              <View style={styles.tehillimInfo}>
                <Text style={styles.tehillimTitle}>Daily Tehillim</Text>
                <Text style={styles.tehillimMessage}>{tehillimProgress.message}</Text>
              </View>
              <View style={styles.tehillimPercentContainer}>
                <Text style={styles.tehillimPercent}>{tehillimProgress.percentComplete}%</Text>
              </View>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <Animated.View 
                  style={[
                    styles.progressBarFill, 
                    { width: progressWidth }
                  ]} 
                />
              </View>
            </View>
            
            {/* Chapter Info */}
            <View style={styles.tehillimFooter}>
              <Text style={styles.tehillimFooterText}>
                {tehillimProgress.totalChapters.length - tehillimProgress.chaptersRemaining.length} of {tehillimProgress.totalChapters.length} chapters
              </Text>
              <Text style={styles.tehillimContinue}>
                {tehillimProgress.percentComplete === 100 ? 'Complete ✓' : 'Continue →'}
              </Text>
            </View>
          </GlassCard>
        </FadeIn>

        {/* Zmanim Card */}
        <FadeIn delay={200}>
          <GlassCard style={styles.zmanimCard}>
            <Text style={styles.sectionTitle}>Today's Zmanim</Text>
            <View style={styles.zmanimGrid}>
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Sunrise</Text>
                <Text style={styles.zmanTime}>{formatTime(dayInfo.zmanim.sunrise)}</Text>
              </View>
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Latest Shema</Text>
                <Text style={styles.zmanTime}>{formatTime(dayInfo.extendedZmanim?.sofZmanShma)}</Text>
              </View>
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Chatzos</Text>
                <Text style={styles.zmanTime}>{formatTime(dayInfo.extendedZmanim?.chatzos)}</Text>
              </View>
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Mincha</Text>
                <Text style={styles.zmanTime}>{formatTime(dayInfo.zmanim.mincha)}</Text>
              </View>
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Sunset</Text>
                <Text style={styles.zmanTime}>{formatTime(dayInfo.zmanim.sunset)}</Text>
              </View>
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Tzeis</Text>
                <Text style={styles.zmanTime}>{formatTime(dayInfo.extendedZmanim?.tzeis)}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => navigation.navigate('Calendar' as never)}
            >
              <Text style={styles.seeAllText}>See all zmanim →</Text>
            </TouchableOpacity>
          </GlassCard>
        </FadeIn>

        {/* Spiritual Cue */}
        {dayInfo.spiritualCue && (
          <FadeIn delay={250}>
            <GlassCard style={styles.cueCard}>
              <Text style={styles.cueEmoji}>💫</Text>
              <Text style={styles.cueText}>{dayInfo.spiritualCue.text}</Text>
            </GlassCard>
          </FadeIn>
        )}

        {/* Davening Changes */}
        {(dayInfo.daveningChanges.hallel || !dayInfo.daveningChanges.tachanun || dayInfo.daveningChanges.yaalehVeyavo) && (
          <FadeIn delay={300}>
            <GlassCard style={styles.changesCard}>
              <Text style={styles.sectionTitle}>Today's Davening</Text>
              <View style={styles.changesList}>
                {dayInfo.daveningChanges.hallel && (
                  <View style={styles.changeItem}>
                    <Text style={styles.changeIcon}>🎵</Text>
                    <Text style={styles.changeText}>
                      {dayInfo.daveningChanges.hallel === 'full' ? 'Full Hallel' : 'Half Hallel'}
                    </Text>
                  </View>
                )}
                {!dayInfo.daveningChanges.tachanun && (
                  <View style={styles.changeItem}>
                    <Text style={styles.changeIcon}>✨</Text>
                    <Text style={styles.changeText}>No Tachanun</Text>
                  </View>
                )}
                {dayInfo.daveningChanges.yaalehVeyavo && (
                  <View style={styles.changeItem}>
                    <Text style={styles.changeIcon}>📜</Text>
                    <Text style={styles.changeText}>Ya'aleh V'Yavo</Text>
                  </View>
                )}
                {dayInfo.daveningChanges.musaf && (
                  <View style={styles.changeItem}>
                    <Text style={styles.changeIcon}>🕊️</Text>
                    <Text style={styles.changeText}>Musaf</Text>
                  </View>
                )}
              </View>
            </GlassCard>
          </FadeIn>
        )}

        {/* Omer Card */}
        {dayInfo.omerDay && (
          <FadeIn delay={350}>
            <GlassCard style={styles.omerCard} onPress={() => navigation.navigate('Omer' as never)}>
              <View style={styles.omerHeader}>
                <Text style={styles.omerEmoji}>✨</Text>
                <Text style={styles.omerTitle}>Sefiras HaOmer</Text>
              </View>
              <Text style={styles.omerDay}>Day {dayInfo.omerDay}</Text>
              <Text style={styles.omerDescription}>
                {OmerCalculator.getOmerDescription(dayInfo.omerDay)}
              </Text>
            </GlassCard>
          </FadeIn>
        )}

        {/* Quick Actions */}
        <FadeIn delay={400}>
          <View style={styles.quickActions}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => navigation.navigate('Tehillim' as never)}
              >
                <Text style={styles.quickActionIcon}>📖</Text>
                <Text style={styles.quickActionText}>Tehillim</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => navigation.navigate('Calendar' as never)}
              >
                <Text style={styles.quickActionIcon}>📅</Text>
                <Text style={styles.quickActionText}>Calendar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => navigation.navigate('Habits' as never)}
              >
                <Text style={styles.quickActionIcon}>✓</Text>
                <Text style={styles.quickActionText}>Habits</Text>
              </TouchableOpacity>
            </View>
          </View>
        </FadeIn>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing['2xl'],
    paddingBottom: 120,
  },
  greeting: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 32,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },

  // Glass Card
  glassCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  glassBlur: {
    overflow: 'hidden',
  },
  glassInner: {
    padding: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },

  // Date Card
  dateCard: {},
  hebrewDate: {
    fontFamily: fonts.heading.bold,
    fontSize: 28,
    color: colors.text.primary,
    textAlign: 'center',
  },
  dateDivider: {
    width: 50,
    height: 2,
    backgroundColor: colors.primary.main,
    alignSelf: 'center',
    marginVertical: spacing.sm,
    borderRadius: 1,
    opacity: 0.6,
  },
  gregorianDate: {
    fontFamily: fonts.body.regular,
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  specialBadge: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  specialBadgeText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 12,
    color: '#fff',
  },

  // Tehillim Progress Card
  tehillimCard: {},
  tehillimHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tehillimIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 165, 184, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tehillimIconText: {
    fontSize: 20,
  },
  tehillimInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  tehillimTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 17,
    color: colors.text.primary,
  },
  tehillimMessage: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  tehillimPercentContainer: {
    backgroundColor: 'rgba(212, 165, 184, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tehillimPercent: {
    fontFamily: fonts.body.bold,
    fontSize: 16,
    color: colors.primary.dark,
  },
  progressBarContainer: {
    marginTop: spacing.md,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: 4,
  },
  tehillimFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  tehillimFooterText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.tertiary,
  },
  tehillimContinue: {
    fontFamily: fonts.body.semiBold,
    fontSize: 13,
    color: colors.primary.main,
  },

  // Zmanim Card
  zmanimCard: {},
  sectionTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  zmanimGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  zmanItem: {
    width: '33.33%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  zmanLabel: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  zmanTime: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: colors.text.primary,
  },
  seeAllButton: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  seeAllText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.primary.main,
  },

  // Spiritual Cue Card
  cueCard: {
    alignItems: 'center',
  },
  cueEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  cueText: {
    fontFamily: fonts.body.regular,
    fontSize: 15,
    color: colors.text.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
  },

  // Davening Changes Card
  changesCard: {},
  changesList: {
    gap: spacing.sm,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeIcon: {
    fontSize: 16,
    width: 28,
  },
  changeText: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.text.primary,
  },

  // Omer Card
  omerCard: {
    alignItems: 'center',
  },
  omerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  omerEmoji: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  omerTitle: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  omerDay: {
    fontFamily: fonts.heading.bold,
    fontSize: 36,
    color: colors.primary.main,
  },
  omerDescription: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // Quick Actions
  quickActions: {
    marginTop: spacing.md,
  },
  quickActionsTitle: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  quickActionText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.text.secondary,
  },
});
