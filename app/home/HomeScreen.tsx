import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FadeIn } from '../../components/animations/FadeIn';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorView } from '../../components/ui/ErrorView';
import { NotificationBanner } from '../../components/ui/NotificationBanner';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { CalendarEngine } from '../../src/core/calendar/CalendarEngine';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { DailyTehillimTracker } from '../../src/storage/DailyTehillimTracker';
import { DayInfo, CalendarContext } from '../../src/types/calendar';

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
  const [error, setError] = useState<string | null>(null);
  const [tehillimProgress, setTehillimProgress] = useState({
    percentComplete: 0,
    chaptersRemaining: [] as number[],
    totalChapters: [] as number[],
    message: '',
  });

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadDayInfo();
  }, []);

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
        style={{ top: height * 0.15, right: -40 }}
        duration={6000}
      />

      {/* Notification Banner */}
      <NotificationBanner onSetup={() => navigation.navigate('Settings' as never)} />

      {/* Main Content - Fixed Layout */}
      <View style={styles.content}>
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
                  style={[styles.progressBarFill, { width: progressWidth }]} 
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

        {/* Zmanim Row */}
        <FadeIn delay={200}>
          <View style={styles.zmanimRow}>
            <View style={styles.zmanItem}>
              <Text style={styles.zmanLabel}>Sunrise</Text>
              <Text style={styles.zmanTime}>{formatTime(dayInfo.zmanim.sunrise)}</Text>
            </View>
            <View style={styles.zmanDivider} />
            <View style={styles.zmanItem}>
              <Text style={styles.zmanLabel}>Sunset</Text>
              <Text style={styles.zmanTime}>{formatTime(dayInfo.zmanim.sunset)}</Text>
            </View>
            <View style={styles.zmanDivider} />
            <View style={styles.zmanItem}>
              <Text style={styles.zmanLabel}>Shema</Text>
              <Text style={styles.zmanTime}>{formatTime(dayInfo.extendedZmanim?.sofZmanShma)}</Text>
            </View>
          </View>
        </FadeIn>

        {/* Quick Actions */}
        <FadeIn delay={250}>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => navigation.navigate('Calendar' as never)}
            >
              <Text style={styles.quickActionIcon}>📅</Text>
              <Text style={styles.quickActionText}>Calendar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => navigation.navigate('Tehillim' as never)}
            >
              <Text style={styles.quickActionIcon}>📖</Text>
              <Text style={styles.quickActionText}>Tehillim</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => navigation.navigate('Settings' as never)}
            >
              <Text style={styles.quickActionIcon}>⚙️</Text>
              <Text style={styles.quickActionText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </FadeIn>

        {/* Davening Note - Only show if there's something special */}
        {(dayInfo.daveningChanges.hallel || !dayInfo.daveningChanges.tachanun) && (
          <FadeIn delay={300}>
            <View style={styles.daveningNote}>
              <Text style={styles.daveningNoteText}>
                {dayInfo.daveningChanges.hallel 
                  ? `${dayInfo.daveningChanges.hallel === 'full' ? 'Full' : 'Half'} Hallel today` 
                  : 'No Tachanun today'}
              </Text>
            </View>
          </FadeIn>
        )}
      </View>
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
  content: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing['2xl'],
    paddingBottom: 100, // Space for tab bar
    justifyContent: 'flex-start',
  },
  greeting: {
    fontFamily: fonts.heading.bold,
    fontSize: 36,
    color: colors.text.primary,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
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
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },

  // Date Card
  dateCard: {},
  hebrewDate: {
    fontFamily: fonts.heading.bold,
    fontSize: 26,
    color: colors.text.primary,
    textAlign: 'center',
  },
  dateDivider: {
    width: 40,
    height: 2,
    backgroundColor: colors.primary.main,
    alignSelf: 'center',
    marginVertical: spacing.xs,
    borderRadius: 1,
    opacity: 0.6,
  },
  gregorianDate: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  specialBadge: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.xs,
  },
  specialBadgeText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 11,
    color: '#fff',
  },

  // Tehillim Card
  tehillimCard: {},
  tehillimHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tehillimIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 165, 184, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tehillimIconText: {
    fontSize: 18,
  },
  tehillimInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  tehillimTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 15,
    color: colors.text.primary,
  },
  tehillimMessage: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
  },
  tehillimPercentContainer: {
    backgroundColor: 'rgba(212, 165, 184, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  tehillimPercent: {
    fontFamily: fonts.body.bold,
    fontSize: 14,
    color: colors.primary.dark,
  },
  progressBarContainer: {
    marginTop: spacing.sm,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: 3,
  },
  tehillimFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  tehillimFooterText: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.text.tertiary,
  },
  tehillimContinue: {
    fontFamily: fonts.body.semiBold,
    fontSize: 12,
    color: colors.primary.main,
  },

  // Zmanim Row
  zmanimRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  zmanItem: {
    flex: 1,
    alignItems: 'center',
  },
  zmanDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.1)',
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

  // Quick Actions
  quickActions: {
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
    fontSize: 22,
    marginBottom: 4,
  },
  quickActionText: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.text.secondary,
  },

  // Davening Note
  daveningNote: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(212, 165, 184, 0.15)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  daveningNoteText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.primary.dark,
  },
});
