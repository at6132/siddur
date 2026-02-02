import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassButton } from '../../components/ui/GlassButton';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';
import {
  NotificationPreferences as NotificationPrefsType,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../../src/types/preferences';

const { width, height } = Dimensions.get('window');

interface NotificationOption {
  key: keyof NotificationPrefsType;
  label: string;
  emoji: string;
}

const NOTIFICATION_OPTIONS: NotificationOption[] = [
  { key: 'dailyTehillim', label: 'Daily Tehillim', emoji: '📖' },
  { key: 'minchaTime', label: 'Mincha Time', emoji: '🕐' },
  { key: 'hallelAnenu', label: 'Hallel / Anenu', emoji: '🎵' },
  { key: 'shabbosReminders', label: 'Shabbos Reminders', emoji: '🕯️' },
  { key: 'sefirasHaomer', label: 'Sefiras HaOmer', emoji: '🌾' },
];

interface NotificationPreferencesProps {
  onComplete: (preferences: NotificationPrefsType) => void;
  onSkip?: () => void;
}

const GlassCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.glassCardWeb}>
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.8)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    );
  }
  return (
    <BlurView intensity={120} tint="light" style={styles.glassCardNative}>
      <LinearGradient
        colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.5)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </BlurView>
  );
};

// Enhanced Glass Row with animations
const GlassRow: React.FC<{ 
  children: React.ReactNode; 
  active: boolean;
  index: number;
}> = ({ children, active, index }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 100,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  if (Platform.OS === 'web') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View style={[styles.rowWeb, active && styles.rowActiveWeb]}>
          <LinearGradient
            colors={active 
              ? ['rgba(232,212,165,0.35)', 'rgba(232,212,165,0.2)'] 
              : ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.5)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {children}
        </View>
      </Animated.View>
    );
  }
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <BlurView 
        intensity={active ? 90 : 50} 
        tint="light" 
        style={[styles.rowNative, active && styles.rowActiveNative]}
      >
        <LinearGradient
          colors={active 
            ? ['rgba(232,212,165,0.3)', 'rgba(232,212,165,0.15)'] 
            : ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.3)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </BlurView>
    </Animated.View>
  );
};

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ 
  onComplete, 
  onSkip 
}) => {
  const [preferences, setPreferences] = useState<NotificationPrefsType>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Main card entrance
    Animated.parallel([
      Animated.timing(fadeAnim, { 
        toValue: 1, 
        duration: 800, 
        useNativeDriver: true 
      }),
      Animated.spring(slideAnim, { 
        toValue: 0, 
        tension: 40, 
        friction: 9, 
        useNativeDriver: true 
      }),
    ]).start();

    // Gentle floating orb animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, {
          toValue: 1,
          duration: 9000,
          useNativeDriver: true,
        }),
        Animated.timing(orb1Anim, {
          toValue: 0,
          duration: 9000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Anim, {
          toValue: 1,
          duration: 7000,
          useNativeDriver: true,
        }),
        Animated.timing(orb2Anim, {
          toValue: 0,
          duration: 7000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const togglePreference = (key: keyof NotificationPrefsType) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
    
    // Subtle bounce animation on badge
    Animated.sequence([
      Animated.spring(badgeScale, {
        toValue: 1.1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(badgeScale, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const enabledCount = Object.values(preferences).filter(Boolean).length;

  const orb1TranslateY = orb1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const orb2TranslateY = orb2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });

  return (
    <View style={styles.container}>
      {/* Enhanced Background Gradient */}
      <LinearGradient
        colors={['#E8F0F5', '#FAF9F7', '#F5E6E8', '#FAF9F7']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Floating Orbs with animation */}
      <Animated.View style={[styles.orb1, { transform: [{ translateY: orb1TranslateY }] }]}>
        <LinearGradient 
          colors={['rgba(232,212,165,0.6)', 'rgba(232,212,165,0.25)']} 
          style={StyleSheet.absoluteFill} 
        />
      </Animated.View>
      <Animated.View style={[styles.orb2, { transform: [{ translateY: orb2TranslateY }] }]}>
        <LinearGradient 
          colors={['rgba(212,165,184,0.6)', 'rgba(212,165,184,0.25)']} 
          style={StyleSheet.absoluteFill} 
        />
      </Animated.View>

      {/* Enhanced Progress Dots */}
      <View style={styles.progressContainer}>
        <View style={styles.progressDot} />
        <View style={styles.progressDot} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
      </View>

      <Animated.View 
        style={[
          styles.cardContainer, 
          { 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }] 
          }
        ]}
      >
        <GlassCard>
          <View style={styles.cardContent}>
            <Text style={styles.emoji}>🔔</Text>
            <Text style={styles.title}>Gentle{'\n'}Reminders</Text>
            <Text style={styles.subtitle}>Calm notifications that guide, never guilt</Text>

            {/* Options with staggered entrance */}
            <View style={styles.optionsContainer}>
              {NOTIFICATION_OPTIONS.map((option, index) => (
                <GlassRow 
                  key={option.key} 
                  active={preferences[option.key]}
                  index={index}
                >
                  <View style={styles.rowInner}>
                    <View style={styles.labelContainer}>
                      <Text style={styles.optionEmoji}>{option.emoji}</Text>
                      <Text style={styles.optionLabel}>{option.label}</Text>
                    </View>
                    <Switch
                      value={preferences[option.key]}
                      onValueChange={() => togglePreference(option.key)}
                      trackColor={{ 
                        false: 'rgba(212,165,184,0.3)', 
                        true: colors.accent.gold 
                      }}
                      thumbColor="#fff"
                      ios_backgroundColor="rgba(212,165,184,0.3)"
                      style={styles.switch}
                    />
                  </View>
                </GlassRow>
              ))}
            </View>

            {/* Enhanced badge with animation */}
            {enabledCount > 0 && (
              <Animated.View 
                style={[
                  styles.badge,
                  { transform: [{ scale: badgeScale }] }
                ]}
              >
                <Text style={styles.badgeText}>
                  {enabledCount} reminder{enabledCount !== 1 ? 's' : ''} enabled
                </Text>
              </Animated.View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <GlassButton 
                title="Complete Setup" 
                onPress={() => onComplete(preferences)} 
                variant="primary" 
                size="large" 
              />
              {onSkip && (
                <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                  <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </GlassCard>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    overflow: 'hidden' 
  },
  orb1: { 
    position: 'absolute', 
    width: 210, 
    height: 210, 
    borderRadius: 105, 
    top: height * 0.07, 
    left: -70, 
    overflow: 'hidden' 
  },
  orb2: { 
    position: 'absolute', 
    width: 170, 
    height: 170, 
    borderRadius: 85, 
    bottom: height * 0.08, 
    right: -60, 
    overflow: 'hidden' 
  },
  progressContainer: { 
    position: 'absolute', 
    top: height * 0.08, 
    flexDirection: 'row', 
    gap: spacing.md 
  },
  progressDot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: 'rgba(212,165,184,0.35)' 
  },
  progressDotActive: { 
    width: 32, 
    backgroundColor: colors.accent.gold,
    shadowColor: colors.accent.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  cardContainer: { 
    width: width - spacing.lg * 2, 
    maxWidth: 400 
  },
  glassCardWeb: { 
    borderRadius: borderRadius['3xl'], 
    overflow: 'hidden', 
    borderWidth: 2, 
    borderColor: 'rgba(255,255,255,0.9)', 
    shadowColor: colors.shadow.dark, 
    shadowOffset: { width: 0, height: 24 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 48, 
    elevation: 24 
  },
  glassCardNative: { 
    borderRadius: borderRadius['3xl'], 
    overflow: 'hidden', 
    borderWidth: 2, 
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 16,
  },
  cardContent: { 
    padding: spacing['2xl'], 
    alignItems: 'center' 
  },
  emoji: { 
    fontSize: 52, 
    marginBottom: spacing.lg 
  },
  title: { 
    ...textStyles.h2, 
    color: colors.text.primary, 
    textAlign: 'center', 
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  subtitle: { 
    ...textStyles.body, 
    color: colors.text.secondary, 
    textAlign: 'center', 
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  optionsContainer: { 
    width: '100%', 
    gap: spacing.md, 
    marginBottom: spacing.lg 
  },
  rowWeb: { 
    borderRadius: borderRadius.xl, 
    overflow: 'hidden', 
    borderWidth: 2, 
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  rowActiveWeb: { 
    borderColor: 'rgba(232,212,165,0.7)',
    shadowColor: 'rgba(232,212,165,0.5)',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 6,
  },
  rowNative: { 
    borderRadius: borderRadius.xl, 
    overflow: 'hidden', 
    borderWidth: 2, 
    borderColor: 'rgba(255,255,255,0.6)',
  },
  rowActiveNative: { 
    borderColor: 'rgba(232,212,165,0.6)',
    shadowColor: colors.accent.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  rowInner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: spacing.lg,
    minHeight: 64,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionEmoji: { 
    fontSize: 26, 
    marginRight: spacing.md 
  },
  optionLabel: { 
    ...textStyles.bodyLarge, 
    color: colors.text.primary,
    flex: 1,
  },
  switch: {
    marginLeft: spacing.md,
  },
  badge: { 
    backgroundColor: 'rgba(232,212,165,0.4)', 
    paddingHorizontal: spacing.lg, 
    paddingVertical: spacing.sm, 
    borderRadius: borderRadius.full, 
    marginBottom: spacing.lg,
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  badgeText: { 
    ...textStyles.caption, 
    color: colors.accent.gold, 
    fontWeight: '700',
    fontSize: 13,
  },
  actions: { 
    width: '100%', 
    alignItems: 'center', 
    gap: spacing.lg 
  },
  skipButton: { 
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: { 
    ...textStyles.body, 
    color: colors.text.tertiary 
  },
});
