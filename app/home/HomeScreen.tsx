import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassButton } from '../../components/ui/GlassButton';
import { FadeIn } from '../../components/animations/FadeIn';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorView } from '../../components/ui/ErrorView';
import { NotificationBanner } from '../../components/ui/NotificationBanner';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';
import { CalendarEngine } from '../../src/core/calendar/CalendarEngine';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { DayInfo } from '../../src/types/calendar';
import { CalendarContext } from '../../src/types/calendar';
import { OmerCalculator } from '../../src/core/omer/OmerCalculator';

const { width, height } = Dimensions.get('window');

// Liquid Glass Card Component
const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: any;
  intensity?: number;
  gradient?: boolean;
}> = ({ children, style, intensity = 60, gradient = false }) => (
  <View style={[styles.glassCardOuter, style]}>
    <BlurView intensity={intensity} style={styles.glassCardBlur}>
      {gradient && (
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      <View style={styles.glassCardInner}>{children}</View>
    </BlurView>
  </View>
);

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

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [dayInfo, setDayInfo] = useState<DayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDayInfo();
  }, []);

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
    } catch (err) {
      console.error('Error loading day info:', err);
      setError('Failed to load day information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDayInfo();
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

  if (!dayInfo) {
    return null;
  }

  const minchaTime = dayInfo.zmanim.mincha.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const greeting = getGreeting();

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5', '#FAF9F7']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Orbs */}
      <FloatingOrb
        size={180}
        color="rgba(212, 165, 184, 0.25)"
        style={{ top: height * 0.05, left: -60 }}
        duration={5000}
      />
      <FloatingOrb
        size={140}
        color="rgba(165, 196, 212, 0.25)"
        style={{ top: height * 0.25, right: -40 }}
        duration={6000}
      />
      <FloatingOrb
        size={100}
        color="rgba(212, 196, 232, 0.2)"
        style={{ bottom: height * 0.2, left: width * 0.1 }}
        duration={4500}
      />

      {/* Notification Setup Banner */}
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
        {/* Header Greeting */}
        <FadeIn delay={100}>
          <Text style={styles.greeting}>{greeting}</Text>
        </FadeIn>

        {/* Main Date Card */}
        <FadeIn delay={200}>
          <GlassCard gradient style={styles.mainCard}>
            <Text style={styles.hebrewDate}>{dayInfo.jewishDateShort}</Text>
            <View style={styles.dateDivider} />
            <Text style={styles.gregorianDate}>
              {dayInfo.gregorianDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            {dayInfo.isShabbos && (
              <View style={styles.shabbosTag}>
                <Text style={styles.shabbosTagText}>✨ Shabbos Shalom</Text>
              </View>
            )}
          </GlassCard>
        </FadeIn>

        {/* Spiritual Cue */}
        {dayInfo.spiritualCue && (
          <FadeIn delay={300}>
            <GlassCard style={styles.cueCard}>
              <Text style={styles.cueEmoji}>💫</Text>
              <Text style={styles.cueText}>{dayInfo.spiritualCue.text}</Text>
            </GlassCard>
          </FadeIn>
        )}

        {/* Quick Info Row */}
        <FadeIn delay={400}>
          <View style={styles.infoRow}>
            <GlassCard style={styles.infoCard}>
              <Text style={styles.infoLabel}>Mincha</Text>
              <Text style={styles.infoValue}>{minchaTime}</Text>
            </GlassCard>

            {dayInfo.daveningChanges.hallel && (
              <GlassCard style={styles.infoCard}>
                <Text style={styles.infoEmoji}>🎵</Text>
                <Text style={styles.infoLabel}>Hallel Today</Text>
              </GlassCard>
            )}

            {dayInfo.daveningChanges.anenu && (
              <GlassCard style={styles.infoCard}>
                <Text style={styles.infoEmoji}>🕯️</Text>
                <Text style={styles.infoLabel}>Fast Day</Text>
              </GlassCard>
            )}
          </View>
        </FadeIn>

        {/* Omer Card */}
        {dayInfo.omerDay && (
          <FadeIn delay={500}>
            <GlassCard gradient style={styles.omerCard}>
              <View style={styles.omerHeader}>
                <Text style={styles.omerEmoji}>✨</Text>
                <Text style={styles.omerTitle}>Sefiras HaOmer</Text>
              </View>
              <Text style={styles.omerDay}>Day {dayInfo.omerDay}</Text>
              <Text style={styles.omerSubtitle}>
                {OmerCalculator.getOmerDescription(dayInfo.omerDay)}
              </Text>
              <GlassButton
                title="Count Tonight"
                onPress={() => navigation.navigate('Omer' as never)}
                variant="primary"
                size="md"
                style={styles.omerButton}
              />
            </GlassCard>
          </FadeIn>
        )}

        {/* Quick Actions */}
        <FadeIn delay={600}>
          <View style={styles.actionsContainer}>
            <Text style={styles.actionsTitle}>Quick Actions</Text>
            <View style={styles.actionsRow}>
              <GlassCard style={styles.actionCard}>
                <GlassButton
                  title="📖 Tehillim"
                  onPress={() => navigation.navigate('Tehillim' as never)}
                  variant="ghost"
                  size="sm"
                />
              </GlassCard>
              <GlassCard style={styles.actionCard}>
                <GlassButton
                  title="📅 Calendar"
                  onPress={() => navigation.navigate('Calendar' as never)}
                  variant="ghost"
                  size="sm"
                />
              </GlassCard>
              <GlassCard style={styles.actionCard}>
                <GlassButton
                  title="✓ Habits"
                  onPress={() => navigation.navigate('Habits' as never)}
                  variant="ghost"
                  size="sm"
                />
              </GlassCard>
            </View>
          </View>
        </FadeIn>

        {/* Bottom Spacer */}
        <View style={{ height: spacing['2xl'] }} />
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
    paddingTop: spacing['3xl'],
  },
  greeting: {
    ...textStyles.h2,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },

  // Glass Card Styles
  glassCardOuter: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  glassCardBlur: {
    overflow: 'hidden',
  },
  glassCardInner: {
    padding: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },

  // Main Date Card
  mainCard: {
    marginBottom: spacing.lg,
  },
  hebrewDate: {
    ...textStyles.h2,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  dateDivider: {
    width: 60,
    height: 2,
    backgroundColor: colors.primary.main,
    alignSelf: 'center',
    marginVertical: spacing.md,
    borderRadius: 1,
    opacity: 0.6,
  },
  gregorianDate: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  shabbosTag: {
    backgroundColor: 'rgba(212, 165, 184, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  shabbosTagText: {
    ...textStyles.bodySmall,
    color: colors.primary.dark,
    fontWeight: '600',
  },

  // Spiritual Cue Card
  cueCard: {
    marginBottom: spacing.lg,
  },
  cueEmoji: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  cueText: {
    ...textStyles.bodyLarge,
    color: colors.text.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 26,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  infoCard: {
    flex: 1,
    minWidth: 100,
  },
  infoLabel: {
    ...textStyles.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  infoValue: {
    ...textStyles.h4,
    color: colors.primary.main,
    textAlign: 'center',
  },
  infoEmoji: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },

  // Omer Card
  omerCard: {
    marginBottom: spacing.lg,
  },
  omerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  omerEmoji: {
    fontSize: 18,
    marginRight: spacing.xs,
  },
  omerTitle: {
    ...textStyles.label,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  omerDay: {
    ...textStyles.h1,
    color: colors.primary.main,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  omerSubtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  omerButton: {
    alignSelf: 'center',
  },

  // Quick Actions
  actionsContainer: {
    marginTop: spacing.md,
  },
  actionsTitle: {
    ...textStyles.label,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionCard: {
    flex: 1,
  },
});
