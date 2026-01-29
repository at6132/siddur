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
          colors={['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.65)', 'rgba(255,255,255,0.75)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    );
  }
  return (
    <BlurView intensity={100} tint="light" style={styles.glassCardNative}>
      <LinearGradient
        colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.4)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </BlurView>
  );
};

const GlassRow: React.FC<{ children: React.ReactNode; active: boolean }> = ({ children, active }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.rowWeb, active && styles.rowActiveWeb]}>
        <LinearGradient
          colors={active ? ['rgba(232,212,165,0.3)', 'rgba(232,212,165,0.15)'] : ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.4)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    );
  }
  return (
    <BlurView intensity={active ? 70 : 40} tint="light" style={[styles.rowNative, active && styles.rowActiveNative]}>
      <LinearGradient
        colors={active ? ['rgba(232,212,165,0.25)', 'rgba(232,212,165,0.1)'] : ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.2)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </BlurView>
  );
};

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ onComplete, onSkip }) => {
  const [preferences, setPreferences] = useState<NotificationPrefsType>(DEFAULT_NOTIFICATION_PREFERENCES);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const togglePreference = (key: keyof NotificationPrefsType) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const enabledCount = Object.values(preferences).filter(Boolean).length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8F0F5', '#FAF9F7', '#F5E6E8', '#FAF9F7']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={styles.orb1}>
        <LinearGradient colors={['rgba(232,212,165,0.5)', 'rgba(232,212,165,0.2)']} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.orb2}>
        <LinearGradient colors={['rgba(212,165,184,0.5)', 'rgba(212,165,184,0.2)']} style={StyleSheet.absoluteFill} />
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressDot} />
        <View style={styles.progressDot} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
      </View>

      <Animated.View style={[styles.cardContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <GlassCard>
          <View style={styles.cardContent}>
            <Text style={styles.emoji}>🔔</Text>
            <Text style={styles.title}>Gentle{'\n'}Reminders</Text>
            <Text style={styles.subtitle}>Calm notifications that guide, never guilt</Text>

            <View style={styles.optionsContainer}>
              {NOTIFICATION_OPTIONS.map((option) => (
                <GlassRow key={option.key} active={preferences[option.key]}>
                  <View style={styles.rowInner}>
                    <Text style={styles.optionEmoji}>{option.emoji}</Text>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    <Switch
                      value={preferences[option.key]}
                      onValueChange={() => togglePreference(option.key)}
                      trackColor={{ false: 'rgba(212,165,184,0.3)', true: colors.primary.main }}
                      thumbColor="#fff"
                      ios_backgroundColor="rgba(212,165,184,0.3)"
                    />
                  </View>
                </GlassRow>
              ))}
            </View>

            {enabledCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{enabledCount} reminder{enabledCount !== 1 ? 's' : ''} enabled</Text>
              </View>
            )}

            <View style={styles.actions}>
              <GlassButton title="Complete Setup" onPress={() => onComplete(preferences)} variant="primary" size="large" />
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
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  orb1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: height * 0.08, left: -60, overflow: 'hidden' },
  orb2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, bottom: height * 0.08, right: -50, overflow: 'hidden' },
  progressContainer: { position: 'absolute', top: height * 0.08, flexDirection: 'row', gap: spacing.sm },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(212,165,184,0.4)' },
  progressDotActive: { width: 28, backgroundColor: colors.accent.gold },
  cardContainer: { width: width - spacing.lg * 2, maxWidth: 380 },
  glassCardWeb: { borderRadius: borderRadius['2xl'], overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)', shadowColor: 'rgba(232,212,165,0.5)', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 1, shadowRadius: 40, elevation: 20 },
  glassCardNative: { borderRadius: borderRadius['2xl'], overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' },
  cardContent: { padding: spacing.xl, alignItems: 'center' },
  emoji: { fontSize: 48, marginBottom: spacing.md },
  title: { ...textStyles.h2, color: colors.text.primary, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { ...textStyles.body, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.lg },
  optionsContainer: { width: '100%', gap: spacing.sm, marginBottom: spacing.md },
  rowWeb: { borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' },
  rowActiveWeb: { borderColor: 'rgba(232,212,165,0.6)' },
  rowNative: { borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  rowActiveNative: { borderColor: 'rgba(232,212,165,0.5)' },
  rowInner: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  optionEmoji: { fontSize: 22, marginRight: spacing.sm },
  optionLabel: { ...textStyles.body, color: colors.text.primary, flex: 1 },
  badge: { backgroundColor: 'rgba(232,212,165,0.3)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, marginBottom: spacing.md },
  badgeText: { ...textStyles.caption, color: colors.accent.gold, fontWeight: '600' },
  actions: { width: '100%', alignItems: 'center', gap: spacing.md },
  skipButton: { paddingVertical: spacing.sm },
  skipText: { ...textStyles.body, color: colors.text.tertiary },
});
