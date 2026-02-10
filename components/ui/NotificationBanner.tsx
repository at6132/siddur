import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';

const BANNER_DISMISSED_KEY = '@notification_banner_dismissed';

interface NotificationBannerProps {
  onSetup: () => void;
}

function createStyles(theme: AppTheme) {
  return {
    container: { position: 'absolute' as const, top: 0, left: 0, right: 0, zIndex: 100, paddingTop: spacing['3xl'], paddingHorizontal: spacing.md },
    bannerWeb: { borderRadius: borderRadius.xl, overflow: 'hidden' as const, borderWidth: 1, borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.5)', shadowColor: theme.colors.primary.main, shadowOffset: { width: 0, height: 8 }, shadowOpacity: theme.isDark ? 0.45 : 0.3, shadowRadius: 16 },
    bannerNative: { borderRadius: borderRadius.xl, overflow: 'hidden' as const, borderWidth: 1, borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.5)' },
    content: { padding: spacing.md, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
    textContainer: { flex: 1 },
    title: { ...textStyles.bodyBold, color: theme.colors.text.primary, marginBottom: 2 },
    subtitle: { ...textStyles.caption, color: theme.colors.text.secondary },
    actions: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.sm },
    setupButton: { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.9)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: theme.isDark ? 1 : 0, borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.25)' : 'transparent' },
    setupText: { ...textStyles.label, color: theme.isDark ? theme.colors.text.primary : theme.colors.primary.dark },
    dismissButton: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
    dismissText: { ...textStyles.caption, color: theme.colors.text.secondary },
  };
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ onSetup }) => {
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const { theme } = useTheme();
  const styles = useMemo(() => {
    try {
      return StyleSheet.create(createStyles(theme));
    } catch (e) {
      console.warn('NotificationBanner styles error:', e);
      return StyleSheet.create({ container: {}, content: {}, title: {}, subtitle: {}, setupButton: {}, dismissButton: {}, setupText: {}, dismissText: {} });
    }
  }, [theme]);

  useEffect(() => {
    checkIfDismissed();
  }, []);

  const checkIfDismissed = async () => {
    try {
      const dismissed = await AsyncStorage.getItem(BANNER_DISMISSED_KEY);
      if (!dismissed) {
        setVisible(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }
    } catch (e) {
      console.warn('Error checking banner state:', e);
    }
  };

  const handleDismiss = async () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      setVisible(false);
      await AsyncStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    });
  };

  const handleSetup = () => {
    handleDismiss();
    onSetup();
  };

  if (!visible) return null;

  const BannerContent = (
    <View style={styles.content}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>🔔 Set up notifications</Text>
        <Text style={styles.subtitle}>Get gentle reminders for davening times</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleSetup} style={styles.setupButton}>
          <Text style={styles.setupText}>Set up</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
          <Text style={styles.dismissText}>Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      {Platform.OS === 'web' ? (
        <View style={styles.bannerWeb}>
          <LinearGradient
            colors={
              theme.isDark
                ? ['rgba(217, 136, 185, 0.45)', 'rgba(120, 130, 190, 0.4)']
                : ['rgba(212, 165, 184, 0.95)', 'rgba(212, 165, 184, 0.85)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {BannerContent}
        </View>
      ) : (
        <BlurView intensity={90} tint={theme.isDark ? 'dark' : 'light'} style={styles.bannerNative}>
          <LinearGradient
            colors={
              theme.isDark
                ? ['rgba(217, 136, 185, 0.35)', 'rgba(120, 130, 190, 0.3)']
                : ['rgba(212, 165, 184, 0.8)', 'rgba(212, 165, 184, 0.6)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {BannerContent}
        </BlurView>
      )}
    </Animated.View>
  );
};

