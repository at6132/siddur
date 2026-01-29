import React, { useState, useEffect, useRef } from 'react';
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
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';

const BANNER_DISMISSED_KEY = '@notification_banner_dismissed';

interface NotificationBannerProps {
  onSetup: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ onSetup }) => {
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;

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
            colors={['rgba(212, 165, 184, 0.95)', 'rgba(212, 165, 184, 0.85)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {BannerContent}
        </View>
      ) : (
        <BlurView intensity={90} tint="light" style={styles.bannerNative}>
          <LinearGradient
            colors={['rgba(212, 165, 184, 0.8)', 'rgba(212, 165, 184, 0.6)']}
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

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: spacing['3xl'],
    paddingHorizontal: spacing.md,
  },
  bannerWeb: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  bannerNative: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  content: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...textStyles.bodyBold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  subtitle: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  setupButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  setupText: {
    ...textStyles.label,
    color: colors.primary.dark,
  },
  dismissButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dismissText: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
});
