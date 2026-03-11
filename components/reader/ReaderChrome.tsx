/**
 * Shared reader top bar: translucent "liquid glass" bar with back, title, toolbar.
 * Optional compass + hamburger for daily tefilos (Shacharis/Mincha/Maariv).
 * Use for all content readers so they look the same.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/design/theme';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { BackButton } from '../ui/BackButton';
import type { AppTheme } from '../../src/design/theme';

/** Approximate height of the chrome (back row + title + toolbar + padding) for content paddingTop. */
export const READER_CHROME_HEADER_HEIGHT_APPROX = 160;

export interface ReaderChromeProps {
  title: string;
  titleHebrew?: string;
  onBack: () => void;
  topInset: number;
  /** Toolbar row (e.g. ReaderToolbar for text size + English). */
  children: React.ReactNode;
  /** Daily tefilos: show compass button. */
  showCompass?: boolean;
  onCompass?: () => void;
  /** Daily tefilos: show hamburger (section jump) button. */
  showHamburger?: boolean;
  onHamburger?: () => void;
}

export function ReaderChrome({
  title,
  titleHebrew,
  onBack,
  topInset,
  children,
  showCompass,
  onCompass,
  showHamburger,
  onHamburger,
}: ReaderChromeProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const content = (
    <View style={[styles.wrapper, { paddingTop: topInset }]} pointerEvents="box-none">
      <View style={styles.topRow}>
        <BackButton onPress={onBack} style={styles.backButton} />
        <View style={styles.rightSlot}>
          {showCompass && (
            <TouchableOpacity
              onPress={onCompass}
              style={styles.iconButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.compassIcon}>🧭</Text>
            </TouchableOpacity>
          )}
          {showHamburger && (
            <TouchableOpacity
              onPress={onHamburger}
              style={styles.iconButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.hamburgerIcon}>☰</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={[styles.titleRow, titleIsHebrew && styles.titleRowRtl]}>
        <Text style={[styles.title, titleIsHebrew && styles.titleHebrew]} numberOfLines={1}>{title}</Text>
        {titleHebrew ? (
          <Text style={styles.titleHebrewSub} numberOfLines={1}>{titleHebrew}</Text>
        ) : null}
      </View>
      <View style={styles.toolbarRow}>
        {children}
      </View>
    </View>
  );

  return (
    <View style={styles.outer}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={60} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[styles.glassOverlay, Platform.OS === 'web' && styles.glassOverlayWeb]}>
        {Platform.OS === 'web' ? (
          <LinearGradient
            colors={
              theme.isDark
                ? ['rgba(28,26,38,0.88)', 'rgba(24,22,34,0.82)']
                : ['rgba(255,255,255,0.88)', 'rgba(250,249,247,0.82)']
            }
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {content}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    outer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      overflow: 'hidden',
    },
    glassOverlay: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    },
    glassOverlayWeb: {
      backgroundColor: theme.isDark ? 'rgba(28,26,38,0.75)' : 'rgba(255,255,255,0.75)',
    },
    wrapper: {
      minHeight: 4,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    backButton: {},
    rightSlot: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    iconButton: {
      padding: spacing.sm,
    },
    compassIcon: {
      fontSize: 22,
    },
    hamburgerIcon: {
      fontSize: 24,
      color: theme.colors.text.secondary,
    },
    titleRow: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    titleRowRtl: {
      alignItems: 'flex-end',
      direction: 'rtl',
    },
    title: {
      fontFamily: fonts.heading.bold,
      fontSize: 22,
      color: theme.colors.text.primary,
      letterSpacing: -0.5,
    },
    titleHebrew: {
      fontFamily: fonts.hebrew.regular,
      fontSize: 20,
      letterSpacing: 0,
      writingDirection: 'rtl',
      textAlign: 'right',
    },
    titleHebrewSub: {
      fontFamily: fonts.hebrew.regular,
      fontSize: 20,
      color: theme.colors.text.secondary,
      letterSpacing: 0,
    },
    toolbarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
  });
}
