/**
 * Shared reader top bar: translucent "liquid glass" bar with back, title, toolbar.
 * Optional compass + hamburger for daily tefilos (Shacharis/Mincha/Maariv).
 * Use for all content readers so they look the same.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/design/theme';
import { spacing } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { BackButton } from '../ui/BackButton';
import type { AppTheme } from '../../src/design/theme';

/** Approximate height of the chrome (back row + title + toolbar + padding) for content paddingTop. */
export const READER_CHROME_HEADER_HEIGHT_APPROX = 160;

export interface ReaderChromeProps {
  title: string;
  titleHebrew?: string;
  titleIsHebrew?: boolean;
  /** Smaller English line under the title (e.g. Nach/Mishna: transliteration + chapter). */
  subtitleEnglish?: string;
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
  titleIsHebrew,
  subtitleEnglish,
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
  const rose = theme.colors.primary;
  const dialFill = theme.isDark ? 'rgba(255,210,228,0.14)' : rose.light;
  const bezelStroke = theme.isDark ? rose.main : rose.dark;
  const tickStrong = theme.isDark ? 'rgba(255,245,250,0.55)' : rose.dark;
  const tickSoft = theme.isDark ? 'rgba(255,245,250,0.28)' : rose.main;
  const northFill = theme.isDark ? rose.light : rose.dark;
  const southFill = theme.isDark ? 'rgba(180,120,150,0.45)' : theme.colors.background.primary;
  const pivotRing = theme.isDark ? theme.colors.background.secondary : theme.colors.background.primary;
  const pivotDot = theme.isDark ? rose.main : rose.main;

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
              accessibilityLabel="Open Mizrach compass"
            >
              <View style={styles.compassIconWrap}>
                <Svg width={28} height={28} viewBox="0 0 28 28">
                  <Circle cx={14} cy={14} r={12.75} fill={dialFill} stroke={bezelStroke} strokeOpacity={0.55} strokeWidth={1} />
                  <Circle cx={14} cy={14} r={11.25} fill="none" stroke={rose.main} strokeOpacity={theme.isDark ? 0.2 : 0.22} strokeWidth={0.75} />
                  {[0, 90, 180, 270].map((deg) => {
                    const long = deg === 0 || deg === 180;
                    return (
                      <G key={deg} transform={`rotate(${deg}, 14, 14)`}>
                        <Line
                          x1={14}
                          y1={long ? 2.6 : 3.4}
                          x2={14}
                          y2={long ? 5.8 : 5.1}
                          stroke={long ? tickStrong : tickSoft}
                          strokeWidth={long ? 1.65 : 1.15}
                          strokeLinecap="round"
                          strokeOpacity={long ? 0.95 : 0.75}
                        />
                      </G>
                    );
                  })}
                  <Path d="M 14 4.35 L 16.15 14 L 14 14 L 11.85 14 Z" fill={northFill} fillOpacity={0.98} />
                  <Path
                    d="M 14 23.65 L 16.15 14 L 14 14 L 11.85 14 Z"
                    fill={southFill}
                    stroke={bezelStroke}
                    strokeOpacity={0.18}
                    strokeWidth={0.35}
                  />
                  <Circle cx={14} cy={14} r={2.35} fill={pivotRing} stroke={bezelStroke} strokeOpacity={0.35} strokeWidth={0.85} />
                  <Circle cx={14} cy={14} r={1.05} fill={pivotDot} fillOpacity={0.92} />
                </Svg>
              </View>
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
      <View style={styles.titleRow}>
        <Text
          style={[styles.title, titleIsHebrew && styles.titleHebrewPrimary]}
          numberOfLines={titleIsHebrew ? 2 : 1}
        >
          {title}
        </Text>
        {subtitleEnglish ? (
          <Text style={styles.titleSubtitleEnglish} numberOfLines={2}>
            {subtitleEnglish}
          </Text>
        ) : titleHebrew ? (
          <Text style={styles.titleHebrewSub} numberOfLines={1}>
            {titleHebrew}
          </Text>
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
      direction: 'ltr',
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
      direction: 'ltr',
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
    compassIconWrap: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hamburgerIcon: {
      fontSize: 24,
      color: theme.colors.text.secondary,
    },
    titleRow: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      alignSelf: 'stretch',
      gap: 2,
      marginBottom: spacing.md,
      direction: 'ltr',
    },
    title: {
      fontFamily: fonts.heading.bold,
      fontSize: 22,
      color: theme.colors.text.primary,
      letterSpacing: -0.5,
      alignSelf: 'stretch',
    },
    titleHebrewPrimary: {
      fontFamily: fonts.hebrew.semibold,
      fontSize: 24,
      color: theme.colors.text.primary,
      letterSpacing: 0,
      writingDirection: 'rtl',
      textAlign: 'left',
    },
    titleHebrewSub: {
      fontFamily: fonts.hebrew.regular,
      fontSize: 18,
      color: theme.colors.text.secondary,
      letterSpacing: 0,
      writingDirection: 'rtl',
      textAlign: 'left',
      alignSelf: 'stretch',
    },
    titleSubtitleEnglish: {
      fontFamily: fonts.body.regular,
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.text.tertiary,
      alignSelf: 'stretch',
    },
    toolbarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
      direction: 'ltr',
    },
  });
}
