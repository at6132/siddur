import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { GlassCard } from './GlassCard';
import { MoonPhaseAnimation } from '../../../components/ui/MoonPhaseAnimation';
import { HomePanel, PANEL_DEFINITIONS } from '../../../src/storage/HomePanelsService';
import { JewishCalendarService } from '../../../src/core/calendar/JewishCalendar';
import { OmerCalculator } from '../../../src/core/omer/OmerCalculator';
import { StorageService } from '../../../src/storage/StorageService';
import { getGedolimForDate } from '../../../src/content/GedolimYahrzeits';
import {
  HEBREW_WORDS,
  INSPIRATION_QUOTES,
  MUSSAR_QUOTES,
  TORAH_THOUGHTS,
  GEDOLIM_STORIES,
  JEWISH_HISTORY_ON_THIS_DAY,
  ZOHAR_CHASSIDUS,
  getByDay100,
  getParshaSummary,
} from '../../../src/content/HomeWidgetContent';
import type { DayInfo, DaveningChanges } from '../../../src/types/calendar';
import { spacing } from '../../../src/design/spacing';

function coerceDate(d: unknown): Date | null {
  if (d instanceof Date && !Number.isNaN(d.getTime())) return d;
  if (typeof d === 'string' || typeof d === 'number') {
    const t = new Date(d);
    return Number.isNaN(t.getTime()) ? null : t;
  }
  return null;
}

function hasNotableDaveningChanges(dc: DaveningChanges | null | undefined): boolean {
  if (!dc) return false;
  return (
    dc.hallel === 'full' ||
    dc.hallel === 'half' ||
    dc.tachanun === false ||
    !!dc.musafType ||
    !!dc.reason
  );
}

export interface PanelRenderContext {
  dayInfo: DayInfo | null;
  isEditing: boolean;
  navigation: any;
  styles: any;
  theme: any;
  // Tehillim
  tehillimProgress: {
    percentComplete: number;
    chaptersRemaining: number[];
    totalChapters: number[];
    message: string;
    dayName: string;
    goalType: string;
    overallCompleted: number;
    overallTotal: number;
    overallLabel: string;
    overallPercent: number;
  };
  progressAnim: Animated.Value;
  handleTehillimPress: () => void;
  // Fast day
  fastDayProgress: {
    isFastDay: boolean;
    fastName: string;
    startTime: Date | null;
    endTime: Date | null;
    percentComplete: number;
    timeRemaining: string;
  } | null;
  fastProgressAnim: Animated.Value;
  // Learning
  dafYomiText: string | null;
  nachYomiText: string | null;
  mishnaYomiText: string | null;
  rambamYomiText: string | null;
  shneyimMikraData: {
    parsha: string;
    parshaHebrew: string;
    todayAliyah: number;
    todayRef: string | null;
    percentComplete: number;
    aliyotCompleted: number;
  } | null;
  // Tracking
  brachosCount: number;
  habitsTodayMarked: boolean;
  tehillimStreak: number;
  tehillimAverageWPM: number | null;
  tzedakahPastMonthTotal: number;
  // Calendar / Omer widget (live zmanim + raw counts from HomeScreen — not isOmerCaughtUp)
  omerPanelSunset: Date | null;
  omerPanelTzeis: Date | null;
  omerCountsRecord: Record<number, boolean> | null;
  setOmerCountsRecord: React.Dispatch<React.SetStateAction<Record<number, boolean> | null>>;
  omerCountdownAfterNight: number | null;
  setOmerCountdownAfterNight: (n: number | null) => void;
  hebrewBirthday: { day: number; month: number } | null;
  setHebrewBirthdayModalVisible: (v: boolean) => void;
  // Helpers
  formatTime: (date: Date | undefined) => string;
  formatTimeUntil: (until: Date) => string | null;
}

export function renderPanelContent(
  panel: HomePanel,
  _index: number,
  ctx: PanelRenderContext,
): React.ReactNode {
  const {
    dayInfo, isEditing, navigation, styles, theme,
    tehillimProgress, progressAnim, handleTehillimPress,
    fastDayProgress, fastProgressAnim,
    dafYomiText, nachYomiText, mishnaYomiText, rambamYomiText, shneyimMikraData,
    brachosCount, habitsTodayMarked, tehillimStreak, tehillimAverageWPM, tzedakahPastMonthTotal,
    omerPanelSunset,
    omerPanelTzeis,
    omerCountsRecord,
    setOmerCountsRecord,
    omerCountdownAfterNight,
    setOmerCountdownAfterNight,
    hebrewBirthday,
    setHebrewBirthdayModalVisible,
    formatTime, formatTimeUntil,
  } = ctx;

  const panelDef = PANEL_DEFINITIONS.find(p => p.type === panel.type);
  const half = panel.size === 'half';

  switch (panel.type) {
    case 'date':
      if (!dayInfo) return null;
      return (
        <GlassCard compact={half} style={styles.dateCard}>
          <View style={half ? styles.halfPanelInner : undefined}>
            <Text style={[styles.hebrewDate, half && { fontSize: 18 }]}>
              {JewishCalendarService.getHebrewDateShort(dayInfo.gregorianDate)}
            </Text>
            <View style={[styles.dateDivider, half && { marginVertical: spacing.xs }]} />
            <Text
              style={[styles.gregorianDate, half && { fontSize: 11 }]}
              numberOfLines={half ? 2 : undefined}
            >
              {dayInfo.gregorianDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            {dayInfo.specialDays && dayInfo.specialDays.length > 0 && (
              <View style={[styles.specialBadge, half && { marginTop: 2, paddingVertical: 2 }]}>
                <Text style={[styles.specialBadgeText, half && { fontSize: 10 }]} numberOfLines={1}>
                  {dayInfo.specialDays[0].name}
                </Text>
              </View>
            )}
          </View>
        </GlassCard>
      );

    case 'tehillim_progress': {
      const progressWidth = progressAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
      });
      if (half) {
        const doneToday =
          (tehillimProgress.totalChapters ?? []).length - (tehillimProgress.chaptersRemaining ?? []).length;
        const totalToday = (tehillimProgress.totalChapters ?? []).length;
        const footerMain =
          tehillimProgress.goalType === 'whenever'
            ? `${tehillimProgress.overallCompleted}/150`
            : `${doneToday}/${totalToday} today`;
        const footerExtra =
          tehillimProgress.goalType !== 'whenever' && tehillimProgress.overallLabel
            ? ` · ${tehillimProgress.overallCompleted}/${tehillimProgress.overallTotal}`
            : '';
        const continueLabel =
          tehillimProgress.percentComplete === 100 && tehillimProgress.goalType !== 'whenever'
            ? 'Done ✓'
            : tehillimProgress.overallPercent === 100
              ? '✓'
              : tehillimProgress.goalType === 'whenever'
                ? 'Open →'
                : 'Go →';
        return (
          <GlassCard compact={half} style={styles.tehillimCard} onPress={handleTehillimPress}>
            <View style={styles.halfPanelInner}>
              <View style={styles.tehillimHalfHeader}>
                <View style={styles.tehillimHalfIcon}>
                  <Text style={styles.tehillimHalfIconText}>📖</Text>
                </View>
                <View style={styles.tehillimHalfInfo}>
                  <Text style={styles.tehillimHalfTitle} numberOfLines={1}>
                    {tehillimProgress.goalType === 'whenever'
                      ? 'Tehillim'
                      : `${tehillimProgress.dayName || 'Daily'} Tehillim`}
                  </Text>
                  <Text style={styles.tehillimHalfMessage} numberOfLines={1}>
                    {tehillimProgress.message}
                  </Text>
                </View>
                <View style={styles.tehillimHalfPercentWrap}>
                  <Text style={styles.tehillimHalfPercent}>{tehillimProgress.overallPercent}%</Text>
                </View>
              </View>
              <View style={styles.tehillimHalfProgressWrap}>
                <View style={styles.tehillimHalfProgressBg}>
                  <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
                </View>
              </View>
              <View style={styles.tehillimHalfFooter}>
                <Text style={styles.tehillimHalfFooterText} numberOfLines={1}>
                  {footerMain}
                  {footerExtra}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  {!isEditing && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('TehillimSettings' as never)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[styles.tehillimEdit, { fontSize: 10 }]}>Edit</Text>
                    </TouchableOpacity>
                  )}
                  {!isEditing && <Text style={styles.tehillimHalfContinue}>{continueLabel}</Text>}
                </View>
              </View>
            </View>
          </GlassCard>
        );
      }
      return (
        <GlassCard compact={half} style={styles.tehillimCard} onPress={handleTehillimPress}>
          <View style={styles.tehillimHeader}>
            <View style={styles.tehillimIcon}>
              <Text style={styles.tehillimIconText}>📖</Text>
            </View>
            <View style={styles.tehillimInfo}>
              <Text style={styles.tehillimTitle}>
                {tehillimProgress.goalType === 'whenever'
                  ? 'Tehillim'
                  : `${tehillimProgress.dayName || 'Daily'} Tehillim`}
              </Text>
              <Text style={styles.tehillimMessage}>{tehillimProgress.message}</Text>
            </View>
            <View style={styles.tehillimPercentContainer}>
              <Text style={styles.tehillimPercent}>{tehillimProgress.overallPercent}%</Text>
            </View>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
            </View>
          </View>
          <View style={styles.tehillimFooter}>
            <View style={styles.tehillimFooterLeft}>
              <View>
                <Text style={styles.tehillimFooterText}>
                  {tehillimProgress.goalType === 'whenever'
                    ? `${tehillimProgress.overallCompleted} of 150 perakim`
                    : `${(tehillimProgress.totalChapters ?? []).length - (tehillimProgress.chaptersRemaining ?? []).length} of ${(tehillimProgress.totalChapters ?? []).length} today`}
                </Text>
                {tehillimProgress.goalType !== 'whenever' && tehillimProgress.overallLabel ? (
                  <Text style={styles.tehillimFooterSubtext}>
                    {tehillimProgress.overallCompleted} of {tehillimProgress.overallTotal} {tehillimProgress.overallLabel}
                  </Text>
                ) : null}
              </View>
              {!isEditing && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('TehillimSettings' as never)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.tehillimEdit}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
            {!isEditing && (
              <Text style={styles.tehillimContinue}>
                {tehillimProgress.percentComplete === 100 && tehillimProgress.goalType !== 'whenever'
                  ? 'Today done ✓'
                  : tehillimProgress.overallPercent === 100
                    ? 'Complete ✓'
                    : tehillimProgress.goalType === 'whenever'
                      ? 'Open any perek →'
                      : 'Continue →'}
              </Text>
            )}
          </View>
        </GlassCard>
      );
    }

    case 'zmanim':
      if (!dayInfo) return null;
      return (
        <GlassCard compact={half} onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
          <View style={[styles.zmanimRow, half && styles.zmanimRowHalf]}>
            <View style={styles.zmanItem}>
              <Text style={[styles.zmanLabel, half && { fontSize: 10, marginBottom: 0 }]}>Sunrise</Text>
              <Text style={[styles.zmanTime, half && { fontSize: 12 }]}>{formatTime(dayInfo.extendedZmanim?.sunrise)}</Text>
            </View>
            <View style={[styles.zmanDivider, half && { height: 22 }]} />
            <View style={styles.zmanItem}>
              <Text style={[styles.zmanLabel, half && { fontSize: 10, marginBottom: 0 }]}>Shema</Text>
              <Text style={[styles.zmanTime, half && { fontSize: 12 }]}>{formatTime(dayInfo.extendedZmanim?.sofZmanShemaGRA)}</Text>
            </View>
            <View style={[styles.zmanDivider, half && { height: 22 }]} />
            <View style={styles.zmanItem}>
              <Text style={[styles.zmanLabel, half && { fontSize: 10, marginBottom: 0 }]}>Sunset</Text>
              <Text style={[styles.zmanTime, half && { fontSize: 12 }]}>{formatTime(dayInfo.extendedZmanim?.sunset)}</Text>
            </View>
          </View>
        </GlassCard>
      );

    case 'davening_note':
      if (!dayInfo || !hasNotableDaveningChanges(dayInfo.daveningChanges)) return null;
      {
        const hasHallel = !!dayInfo.daveningChanges?.hallel;
        const noTachanun = dayInfo.daveningChanges?.tachanun === false;
        const message = hasHallel
          ? `${dayInfo.daveningChanges!.hallel === 'full' ? 'Full' : 'Half'} Hallel today`
          : noTachanun
            ? 'No Tachanun today'
            : dayInfo.daveningChanges?.reason || 'Special davening today';
        return (
          <GlassCard compact={half} onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
            <View style={[styles.daveningNote, half && { paddingVertical: spacing.xs }]}>
              <Text style={[styles.daveningNoteText, half && { fontSize: 11 }]} numberOfLines={half ? 2 : undefined}>
                {message}
              </Text>
            </View>
          </GlassCard>
        );
      }

    case 'weekly_parsha':
      return (
        <GlassCard compact={half} onPress={() => !isEditing && (navigation as any).navigate('Parsha')}>
          <View style={[styles.parshaPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.parshaLabel, half && styles.halfHeading]}>This Week's Parsha</Text>
            <Text style={[styles.parshaName, half && { fontSize: 13 }]} numberOfLines={half ? 1 : 2}>
              {dayInfo?.parsha || 'See calendar'}
            </Text>
            {dayInfo?.parshaHebrew ? (
              <Text style={[styles.parshaHebrew, half && styles.halfBody]} numberOfLines={1}>
                {dayInfo.parshaHebrew}
              </Text>
            ) : dayInfo?.parsha ? null : (
              <Text style={[styles.parshaSubtext, half && styles.halfBody]}>Tap calendar</Text>
            )}
          </View>
        </GlassCard>
      );

    case 'inspiration_quote': {
      const todayQuote = getByDay100(INSPIRATION_QUOTES);
      return (
        <GlassCard compact={half}>
          <View style={[styles.inspirationPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.inspirationIcon, half && styles.halfEmoji]}>✨</Text>
            <Text
              style={[styles.inspirationHebrew, half && { fontSize: 13, marginBottom: 2 }]}
              numberOfLines={half ? 2 : undefined}
            >
              {todayQuote.text}
            </Text>
            <Text
              style={[styles.inspirationTranslation, half && { fontSize: 10, lineHeight: 13, marginBottom: 2 }]}
              numberOfLines={half ? 2 : undefined}
            >
              {todayQuote.translation}
            </Text>
            <Text style={[styles.inspirationSource, half && { fontSize: 9 }]} numberOfLines={1}>
              — {todayQuote.source}
            </Text>
          </View>
        </GlassCard>
      );
    }

    case 'fast_day_info':
      if (!fastDayProgress?.isFastDay) return null;
      {
        const fastProgressWidth = fastProgressAnim.interpolate({
          inputRange: [0, 100],
          outputRange: ['0%', '100%'],
        });
        const formatFastTime = (date: Date | null) => {
          if (!date) return '--:--';
          return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        };
        if (half) {
          return (
            <GlassCard compact={half}>
              <View style={[styles.fastDayPanel, styles.halfPanelInner]}>
                <View style={[styles.fastDayHeader, styles.fastDayHalfHeader]}>
                  <Text style={[styles.fastDayIcon, styles.fastDayHalfIcon]}>🕯️</Text>
                  <View style={styles.fastDayTitleContainer}>
                    <Text style={[styles.fastDayTitle, styles.fastDayHalfTitle]} numberOfLines={1}>
                      {fastDayProgress.fastName}
                    </Text>
                    <Text style={[styles.fastDaySubtitle, styles.fastDayHalfSubtitle]} numberOfLines={1}>
                      {fastDayProgress.percentComplete >= 100 ? 'Fast over — eat' : fastDayProgress.timeRemaining}
                    </Text>
                  </View>
                </View>
                <View style={[styles.fastProgressContainer, styles.fastDayHalfProgressRow]}>
                  <View style={[styles.fastProgressBar, styles.fastProgressBarHalf]}>
                    <Animated.View style={[styles.fastProgressFill, { width: fastProgressWidth }]} />
                  </View>
                  <Text style={[styles.fastProgressPercent, { fontSize: 11 }]}>
                    {Math.round(fastDayProgress.percentComplete)}%
                  </Text>
                </View>
                <View style={[styles.fastTimesRow, styles.fastTimesRowHalf]}>
                  <View style={styles.fastTimeItem}>
                    <Text style={[styles.fastTimeLabel, { fontSize: 10 }]}>Began</Text>
                    <Text style={[styles.fastTimeValue, styles.fastTimeValueHalf]}>{formatFastTime(fastDayProgress.startTime)}</Text>
                  </View>
                  <View style={styles.fastTimeItem}>
                    <Text style={[styles.fastTimeLabel, { fontSize: 10 }]}>Ends</Text>
                    <Text style={[styles.fastTimeValue, styles.fastTimeValueHalf]}>{formatFastTime(fastDayProgress.endTime)}</Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          );
        }
        return (
          <GlassCard compact={half}>
            <View style={styles.fastDayPanel}>
              <View style={styles.fastDayHeader}>
                <Text style={styles.fastDayIcon}>🕯️</Text>
                <View style={styles.fastDayTitleContainer}>
                  <Text style={styles.fastDayTitle}>{fastDayProgress.fastName}</Text>
                  <Text style={styles.fastDaySubtitle}>
                    {fastDayProgress.percentComplete >= 100
                      ? 'The fast is over - you may eat!'
                      : fastDayProgress.timeRemaining}
                  </Text>
                </View>
              </View>
              <View style={styles.fastProgressContainer}>
                <View style={styles.fastProgressBar}>
                  <Animated.View style={[styles.fastProgressFill, { width: fastProgressWidth }]} />
                </View>
                <Text style={styles.fastProgressPercent}>
                  {Math.round(fastDayProgress.percentComplete)}%
                </Text>
              </View>
              <View style={styles.fastTimesRow}>
                <View style={styles.fastTimeItem}>
                  <Text style={styles.fastTimeLabel}>Fast began</Text>
                  <Text style={styles.fastTimeValue}>{formatFastTime(fastDayProgress.startTime)}</Text>
                </View>
                <View style={styles.fastTimeItem}>
                  <Text style={styles.fastTimeLabel}>Can eat at</Text>
                  <Text style={styles.fastTimeValue}>{formatFastTime(fastDayProgress.endTime)}</Text>
                </View>
              </View>
              {fastDayProgress.percentComplete >= 100 && (
                <View style={styles.fastCompleteMessage}>
                  <Text style={styles.fastCompleteText}>✨ Tzom kal! May it be a meaningful fast ✨</Text>
                </View>
              )}
            </View>
          </GlassCard>
        );
      }

    case 'greeting': {
      const hour = new Date().getHours();
      const greetingText = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : hour < 21 ? 'Good Evening' : 'Good Night';
      return (
        <GlassCard compact={half}>
          <View style={[styles.greetingPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.greetingEmoji, half && styles.halfEmoji]}>{hour < 12 ? '🌅' : hour < 17 ? '☀️' : hour < 21 ? '🌆' : '🌙'}</Text>
            <Text style={[styles.greetingText, half && { fontSize: 13 }]} numberOfLines={1}>{greetingText}</Text>
            <Text style={[styles.greetingSubtext, half && styles.halfBody]} numberOfLines={1}>
              May your day be blessed
            </Text>
          </View>
        </GlassCard>
      );
    }

    case 'shabbos_times':
      return (
        <GlassCard compact={half} onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
          <View style={[styles.shabbosPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.shabbosIcon, half && styles.halfEmoji]}>🕯️</Text>
            <Text style={[styles.shabbosTitle, half && { fontSize: 12, marginBottom: spacing.xs }]} numberOfLines={1}>
              Shabbos Times
            </Text>
            <View style={styles.shabbosTimesRow}>
              <View style={styles.shabbosTimeItem}>
                <Text style={[styles.shabbosTimeLabel, half && { fontSize: 10 }]}>Candles</Text>
                <Text style={[styles.shabbosTimeValue, half && { fontSize: 12 }]}>{formatTime(dayInfo?.upcomingShabbos?.candleLighting ?? undefined)}</Text>
              </View>
              <View style={styles.shabbosTimeItem}>
                <Text style={[styles.shabbosTimeLabel, half && { fontSize: 10 }]}>Havdalah</Text>
                <Text style={[styles.shabbosTimeValue, half && { fontSize: 12 }]}>{formatTime(dayInfo?.upcomingShabbos?.havdalah ?? undefined)}</Text>
              </View>
            </View>
          </View>
        </GlassCard>
      );

    case 'candle_lighting':
      return (
        <GlassCard compact={half} onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
          <View style={[styles.candlePanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.candleIcon, half && styles.halfEmoji]}>🕯️</Text>
            <Text style={[styles.candleTitle, half && styles.halfHeading]} numberOfLines={1}>
              Candle Lighting
            </Text>
            <Text style={[styles.candleTime, half && { fontSize: 14 }]} numberOfLines={1}>
              {dayInfo?.upcomingShabbos?.candleLighting ? formatTime(dayInfo.upcomingShabbos.candleLighting) : 'Friday'}
            </Text>
          </View>
        </GlassCard>
      );

    case 'omer_counter': {
      const displayNight = dayInfo?.omerDay ?? null;
      const sunset =
        coerceDate(omerPanelSunset) ?? coerceDate(dayInfo?.extendedZmanim?.sunset);
      const tzeis = coerceDate(omerPanelTzeis) ?? coerceDate(dayInfo?.extendedZmanim?.tzeis);
      const counts = omerCountsRecord ?? {};
      const now = new Date();
      const afterTzeis = !tzeis || now >= tzeis;
      const waitUntil = tzeis && !afterTzeis ? formatTimeUntil(tzeis) : null;
      const countNight =
        displayNight != null
          ? OmerCalculator.getOmerNightToCount(now, sunset, tzeis)
          : null;

      const openOmer = () => {
        if (isEditing || !displayNight) return;
        (navigation as any).navigate('Omer');
      };

      /** Storage key: on-screen day before tzeit, halachic "count night" after tzeit. */
      const markNightKey =
        (afterTzeis ? countNight : displayNight) ?? countNight ?? displayNight;

      const markedThisNightAfterTzeit =
        afterTzeis && countNight != null && !!counts[countNight];
      const waitingNextAfterMark =
        !afterTzeis &&
        countNight != null &&
        omerCountdownAfterNight != null &&
        omerCountdownAfterNight + 1 === countNight &&
        !!counts[omerCountdownAfterNight];
      const markedDisplayDayEarly =
        !afterTzeis && displayNight != null && !!counts[displayNight];
      const widgetOmerChecked =
        markedThisNightAfterTzeit || waitingNextAfterMark || markedDisplayDayEarly;

      const handleMarkComplete = async () => {
        if (isEditing || markNightKey == null || widgetOmerChecked) return;
        await StorageService.markOmerDay(markNightKey, true);
        await StorageService.setOmerWidgetCountdownAfterNight(markNightKey);
        setOmerCountsRecord((prev) => ({ ...(prev ?? {}), [markNightKey]: true }));
        setOmerCountdownAfterNight(markNightKey);
      };

      const completeRowDisabled = isEditing || widgetOmerChecked;
      const checkedTonight = markedThisNightAfterTzeit;
      const countedWaitingNext = !afterTzeis && widgetOmerChecked;
      const emptyBeforeTzeis = !afterTzeis && !widgetOmerChecked;

      /** Countdown only if user marked a night that exists in storage and matches the next count. */
      const showOmerNextCountdown =
        !afterTzeis &&
        tzeis &&
        countNight != null &&
        omerCountdownAfterNight != null &&
        omerCountdownAfterNight + 1 === countNight &&
        !!counts[omerCountdownAfterNight];

      const omerWaitLong = showOmerNextCountdown
        ? `Today is day ${displayNight}. ${waitUntil ? `In ${waitUntil}: day ${countNight}` : `Next: day ${countNight}`} (after nightfall ${formatTime(tzeis)}).`
        : null;
      const omerWaitShort = showOmerNextCountdown
        ? waitUntil && countNight != null
          ? `Next: day ${countNight} in ${waitUntil}`
          : countNight != null
            ? `Next: day ${countNight}`
            : null
        : null;

      const checkLabelLong = !afterTzeis
        ? widgetOmerChecked
          ? 'Counted ✓'
          : 'Mark as complete'
        : widgetOmerChecked
          ? 'Counted for tonight'
          : 'Mark as complete';
      const checkLabelShort = !afterTzeis
        ? widgetOmerChecked
          ? 'Counted ✓'
          : 'Mark complete'
        : widgetOmerChecked
          ? 'Counted ✓'
          : 'Mark complete';

      const omerWaitDisplay = half ? (omerWaitShort ?? omerWaitLong) : omerWaitLong;

      return (
        <GlassCard compact={half} onPress={openOmer}>
          <View style={[styles.omerPanel, half && styles.halfPanelInner]}>
            <Text style={[styles.omerTitle, half && { fontSize: 12 }]} numberOfLines={1}>
              Today · day {displayNight}
            </Text>
            {omerWaitDisplay != null ? (
              <Text style={[styles.omerWait, half && styles.omerWaitHalf]} numberOfLines={half ? 2 : undefined}>
                {omerWaitDisplay}
              </Text>
            ) : null}
            <TouchableOpacity
              style={[
                styles.omerCheckRow,
                half && styles.omerCheckRowHalf,
                completeRowDisabled && styles.omerCheckRowDisabled,
              ]}
              onPress={handleMarkComplete}
              activeOpacity={completeRowDisabled ? 1 : 0.7}
              disabled={completeRowDisabled}
            >
              <View
                style={[
                  styles.omerCheckbox,
                  half && { width: 20, height: 20, borderRadius: 5 },
                  checkedTonight && styles.omerCheckboxChecked,
                  countedWaitingNext && styles.omerCheckboxCheckedWaiting,
                  emptyBeforeTzeis && styles.omerCheckboxDisabled,
                ]}
              >
                {widgetOmerChecked && <Text style={[styles.omerCheckmark, half && { fontSize: 12 }]}>✓</Text>}
              </View>
              <Text
                style={[
                  styles.omerCheckLabel,
                  half && styles.omerCheckLabelHalf,
                  completeRowDisabled && styles.omerCheckLabelMuted,
                ]}
                numberOfLines={half ? 2 : undefined}
              >
                {half ? checkLabelShort : checkLabelLong}
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      );
    }

    case 'rosh_chodesh':
      return (
        <GlassCard compact={half} onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
          <View style={[styles.roshChodeshPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.roshChodeshIcon, half && styles.halfEmoji]}>🌙</Text>
            <Text style={[styles.roshChodeshTitle, half && styles.halfHeading]} numberOfLines={1}>
              Rosh Chodesh
            </Text>
            <Text style={[styles.roshChodeshText, half && styles.halfBody]} numberOfLines={1}>
              {dayInfo?.isRoshChodesh ? 'Today!' : 'View calendar'}
            </Text>
          </View>
        </GlassCard>
      );

    case 'hebrew_birthday': {
      const daysUntil = hebrewBirthday ? JewishCalendarService.daysUntilHebrewDate(hebrewBirthday.day, hebrewBirthday.month) : null;
      const birthdayDisplay = hebrewBirthday
        ? daysUntil === 0
          ? "Today! 🎂"
          : daysUntil === 1
            ? "Tomorrow!"
            : `${daysUntil} days`
        : "Add your birthday";
      return (
        <GlassCard compact={half} onPress={() => !isEditing && setHebrewBirthdayModalVisible(true)}>
          <View style={[styles.birthdayPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.birthdayIcon, half && styles.halfEmoji]}>🎂</Text>
            <Text style={[styles.birthdayTitle, half && styles.halfHeading]} numberOfLines={1}>
              Hebrew Birthday
            </Text>
            <Text style={[styles.birthdayText, half && styles.halfBody]} numberOfLines={1}>
              {birthdayDisplay}
            </Text>
          </View>
        </GlassCard>
      );
    }

    case 'yahrzeit': {
      const hdate = dayInfo ? JewishCalendarService.getJewishDate(dayInfo.gregorianDate) : null;
      const gedolimRabbi = hdate ? getGedolimForDate(hdate.getDate(), hdate.getMonth(), hdate.getFullYear()) : null;
      const yahrzeitDisplay = gedolimRabbi
        ? `Yahrzeit: ${gedolimRabbi}`
        : 'No gedolim yahrzeit today';
      return (
        <GlassCard compact={half} onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
          <View style={[styles.yahrzeitPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.yahrzeitIcon, half && styles.halfEmoji]}>🕯️</Text>
            <Text style={[styles.yahrzeitTitle, half && styles.halfHeading]} numberOfLines={1}>
              Yahrzeit
            </Text>
            <Text style={[styles.yahrzeitText, half && styles.halfBody]} numberOfLines={half ? 2 : 3}>
              {yahrzeitDisplay}
            </Text>
          </View>
        </GlassCard>
      );
    }

    case 'nach_yomi':
      return (
        <GlassCard compact={half}>
          <TouchableOpacity
            onPress={() => !isEditing && (navigation as any).navigate('NachReader', { nachYomi: true })}
            activeOpacity={0.75}
            style={[styles.dafYomiButton, half && styles.dafYomiButtonHalf, half && styles.halfPanelInner]}
          >
            <Text style={[styles.dafButtonIcon, half && styles.dafButtonIconHalf]}>📖</Text>
            <Text style={[styles.dafButtonTitle, half && styles.dafButtonTitleHalf]}>Nach Yomi</Text>
            <Text style={[styles.dafButtonSubtext, half && styles.dafButtonSubtextHalf]} numberOfLines={2} adjustsFontSizeToFit>
              {nachYomiText ?? "Today's chapter"}
            </Text>
          </TouchableOpacity>
        </GlassCard>
      );

    case 'mishna_yomis':
      return (
        <GlassCard compact={half}>
          <TouchableOpacity
            onPress={() => !isEditing && (navigation as any).navigate('MishnaReader', { mishnaYomi: true })}
            activeOpacity={0.75}
            style={[styles.dafYomiButton, half && styles.dafYomiButtonHalf, half && styles.halfPanelInner]}
          >
            <Text style={[styles.dafButtonIcon, half && styles.dafButtonIconHalf]}>📕</Text>
            <Text style={[styles.dafButtonTitle, half && styles.dafButtonTitleHalf]}>Mishna Yomi</Text>
            <Text style={[styles.dafButtonSubtext, half && styles.dafButtonSubtextHalf]} numberOfLines={2} adjustsFontSizeToFit>
              {mishnaYomiText ?? "Today's perek"}
            </Text>
          </TouchableOpacity>
        </GlassCard>
      );

    case 'moon_phase': {
      const jewishDayMatch = dayInfo?.jewishDateShort?.match(/^\d+/);
      const jewishDay = jewishDayMatch ? parseInt(jewishDayMatch[0], 10) : 15;
      return (
        <GlassCard compact={half} onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
          <View style={[styles.moonPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <MoonPhaseAnimation jewishDay={jewishDay} isDark={theme.isDark} compact={half} />
            <Text style={[styles.moonTitle, half && { fontSize: 11 }]} numberOfLines={1}>
              Moon Phase
            </Text>
            <Text style={[styles.moonText, half && { fontSize: 10, marginTop: 0 }]} numberOfLines={1}>
              Day {jewishDay} of month
            </Text>
          </View>
        </GlassCard>
      );
    }

    case 'daf_yomi':
      return (
        <GlassCard compact={half}>
          <TouchableOpacity
            onPress={() => !isEditing && (navigation as any).navigate('GemaraReader', { dafYomi: true })}
            activeOpacity={0.75}
            style={[styles.dafYomiButton, half && styles.dafYomiButtonHalf, half && styles.halfPanelInner]}
          >
            <Text style={[styles.dafButtonIcon, half && styles.dafButtonIconHalf]}>📚</Text>
            <Text style={[styles.dafButtonTitle, half && styles.dafButtonTitleHalf]}>Daf Yomi</Text>
            <Text
              style={[styles.dafButtonSubtext, half && styles.dafButtonSubtextHalf]}
              numberOfLines={2}
              adjustsFontSizeToFit
            >
              {dafYomiText ?? "Today's daf"}
            </Text>
          </TouchableOpacity>
        </GlassCard>
      );

    case 'parsha_summary': {
      const parshaSummaryLine = getParshaSummary(dayInfo?.parsha);
      return (
        <GlassCard compact={half} onPress={() => !isEditing && (navigation as any).navigate('Parsha')}>
          <View style={[styles.learningPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.learningIcon, half && styles.halfEmoji]}>📜</Text>
            <Text style={[styles.learningTitle, half && styles.halfHeading]} numberOfLines={1}>
              {dayInfo?.parsha || 'Parsha'}
            </Text>
            <Text style={[styles.learningText, half && styles.halfBody]} numberOfLines={3}>
              {parshaSummaryLine}
            </Text>
          </View>
        </GlassCard>
      );
    }

    case 'mussar':
      return (
        <GlassCard compact={half}>
          <View style={[styles.mussarPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.mussarIcon, half && styles.halfEmoji]}>💎</Text>
            <Text style={[styles.mussarTitle, half && styles.halfHeading]} numberOfLines={1}>
              Daily Mussar
            </Text>
            <Text style={[styles.mussarText, half && { fontSize: 10, lineHeight: 13, marginTop: 2 }]} numberOfLines={half ? 3 : undefined}>
              {getByDay100(MUSSAR_QUOTES)}
            </Text>
          </View>
        </GlassCard>
      );

    case 'rambam_daily':
      return (
        <GlassCard compact={half}>
          <TouchableOpacity
            onPress={() => !isEditing && (navigation as any).navigate('RambamReader', { rambamYomi: true })}
            activeOpacity={0.75}
            style={[styles.dafYomiButton, half && styles.dafYomiButtonHalf, half && styles.halfPanelInner]}
          >
            <Text style={[styles.dafButtonIcon, half && styles.dafButtonIconHalf]}>📕</Text>
            <Text style={[styles.dafButtonTitle, half && styles.dafButtonTitleHalf]}>Rambam Daily</Text>
            <Text
              style={[styles.dafButtonSubtext, half && styles.dafButtonSubtextHalf]}
              numberOfLines={2}
              adjustsFontSizeToFit
            >
              {rambamYomiText ?? "Today's 3 chapters"}
            </Text>
          </TouchableOpacity>
        </GlassCard>
      );

    case 'chumash_daily': {
      const sm = shneyimMikraData;
      const smPercent = sm?.percentComplete ?? 0;
      return (
        <GlassCard compact={half} onPress={() => !isEditing && (navigation as any).navigate('Chumash')}>
          <View style={[styles.chumashPanelCompact, half && styles.halfPanelInner]}>
            <Text style={[styles.learningIcon, half && styles.halfEmoji]}>📜</Text>
            <Text style={[styles.learningTitle, half && styles.halfHeading]} numberOfLines={1}>
              Shneyim Mikra
            </Text>
            <Text style={[styles.learningText, half && styles.halfBody]} numberOfLines={1}>
              {sm ? `${sm.parshaHebrew} • Aliyah ${sm.todayAliyah} (${sm.aliyotCompleted}/7)` : 'Loading...'}
            </Text>
            <View style={[styles.progressBarContainer, half && { marginTop: 4 }]}>
              <View style={[styles.progressBarBg, half && { height: 4 }]}>
                <View style={[styles.progressBarFill, { width: `${smPercent}%` }]} />
              </View>
            </View>
          </View>
        </GlassCard>
      );
    }

    case 'word_of_day': {
      const todayWord = getByDay100(HEBREW_WORDS);
      return (
        <GlassCard compact={half}>
          <View style={[styles.wordPanel, half && styles.wordPanelHalf, half && styles.halfPanelInner]}>
            <Text style={[styles.wordHebrew, half && styles.wordHebrewHalf]} numberOfLines={1}>
              {todayWord.word}
            </Text>
            <Text style={[styles.wordMeaning, half && styles.wordMeaningHalf]} numberOfLines={half ? 2 : undefined}>
              {todayWord.meaning}
            </Text>
          </View>
        </GlassCard>
      );
    }

    case 'torah_thought':
      return (
        <GlassCard compact={half}>
          <View style={[styles.thoughtPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.thoughtIcon, half && styles.halfEmoji]}>💡</Text>
            <Text style={[styles.thoughtTitle, half && styles.halfHeading]} numberOfLines={1}>
              Torah Thought
            </Text>
            <Text style={[styles.thoughtText, half && styles.halfBody]} numberOfLines={half ? 3 : undefined}>
              {getByDay100(TORAH_THOUGHTS)}
            </Text>
          </View>
        </GlassCard>
      );

    case 'zohar':
      return (
        <GlassCard compact={half}>
          <View style={[styles.learningPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.learningIcon, half && styles.halfEmoji]}>🌟</Text>
            <Text style={[styles.learningTitle, half && styles.halfHeading]} numberOfLines={1}>
              Daily Zohar
            </Text>
            <Text style={[styles.learningText, half && styles.halfBody]} numberOfLines={3}>
              {getByDay100(ZOHAR_CHASSIDUS)}
            </Text>
          </View>
        </GlassCard>
      );

    case 'jewish_history':
      return (
        <GlassCard compact={half}>
          <View style={[styles.historyPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.historyIcon, half && styles.halfEmoji]}>📜</Text>
            <Text style={[styles.historyTitle, half && styles.halfHeading]} numberOfLines={1}>
              On This Day
            </Text>
            <Text style={[styles.historyText, half && styles.halfBody]} numberOfLines={3}>
              {getByDay100(JEWISH_HISTORY_ON_THIS_DAY)}
            </Text>
          </View>
        </GlassCard>
      );

    case 'gedolim_story':
      return (
        <GlassCard compact={half}>
          <View style={[styles.storyPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.storyIcon, half && styles.halfEmoji]}>👤</Text>
            <Text style={[styles.storyTitle, half && styles.halfHeading]} numberOfLines={1}>
              Gedolim Story
            </Text>
            <Text style={[styles.storyText, half && styles.halfBody]} numberOfLines={half ? 3 : 4}>
              {getByDay100(GEDOLIM_STORIES)}
            </Text>
          </View>
        </GlassCard>
      );

    case 'mitzvah_of_day':
      return (
        <GlassCard compact={half} onPress={() => !isEditing && (navigation as any).navigate('Hub')}>
          <View style={[styles.mitzvahPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.mitzvahIcon, half && styles.halfEmoji]}>⭐</Text>
            <Text style={[styles.mitzvahTitle, half && { fontSize: 11 }]} numberOfLines={2}>
              Mitzvah of the Day
            </Text>
            <Text style={[styles.mitzvahText, half && styles.halfBody]} numberOfLines={half ? 3 : undefined}>
              Give tzedakah today—even a small amount. "Tzedakah tatzil mimaves."
            </Text>
          </View>
        </GlassCard>
      );

    case 'middah_of_week': {
      const middos = ['Chesed (Kindness)', 'Gevurah (Strength)', 'Tiferes (Beauty)', 'Netzach (Endurance)', 'Hod (Splendor)', 'Yesod (Foundation)', 'Malchus (Kingship)'];
      return (
        <GlassCard compact={half} onPress={() => !isEditing && (navigation as any).navigate('Hub')}>
          <View style={[styles.middahPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.middahIcon, half && styles.halfEmoji]}>💪</Text>
            <Text style={[styles.middahTitle, half && styles.halfHeading]} numberOfLines={1}>
              Middah of the Week
            </Text>
            <Text style={[styles.middahText, half && { fontSize: 12, marginTop: 2 }]} numberOfLines={2}>
              {middos[new Date().getDay()]}
            </Text>
          </View>
        </GlassCard>
      );
    }

    case 'gratitude':
      return (
        <GlassCard compact={half} onPress={() => !isEditing && (navigation as any).navigate('Hub', { screen: 'Gratitude' })}>
          <View style={[styles.gratitudePanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.gratitudeIcon, half && styles.halfEmoji]}>🙏</Text>
            <Text style={[styles.gratitudeTitle, half && styles.halfHeading]} numberOfLines={1}>
              Daily Gratitude
            </Text>
            <Text style={[styles.gratitudeText, half && styles.halfBody]} numberOfLines={2}>
              What are you thankful for?
            </Text>
          </View>
        </GlassCard>
      );

    case 'tehillim_stats':
      return (
        <GlassCard compact={half} onPress={() => !isEditing && (navigation as any).navigate('Hub')}>
          <View style={[styles.statsPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.statsIcon, half && styles.halfEmoji]}>📊</Text>
            <Text style={[styles.statsTitle, half && styles.halfHeading]} numberOfLines={1}>
              Tehillim Stats
            </Text>
            <Text style={[styles.statsText, half && { fontSize: 11, marginTop: 2 }]} numberOfLines={1}>
              {tehillimProgress.overallPercent}% {tehillimProgress.overallLabel || 'today'}
            </Text>
            {half ? (
              (tehillimStreak > 0 || tehillimAverageWPM != null) ? (
                <Text style={[styles.statsSubtext, styles.statsSubtextHalf]} numberOfLines={2}>
                  {[tehillimStreak > 0 ? `${tehillimStreak}d streak` : null, tehillimAverageWPM != null ? `Avg ${tehillimAverageWPM} WPM` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              ) : null
            ) : (
              <>
                {tehillimStreak > 0 && (
                  <Text style={styles.statsSubtext}>{tehillimStreak} day streak</Text>
                )}
                {tehillimAverageWPM != null && (
                  <Text style={styles.statsSubtext}>Avg {tehillimAverageWPM} WPM</Text>
                )}
              </>
            )}
          </View>
        </GlassCard>
      );

    case 'brachos_counter':
      return (
        <GlassCard compact={half} onPress={() => !isEditing && (navigation as any).navigate('Hub')}>
          <View style={[styles.counterPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.counterIcon, half && { fontSize: 18, marginBottom: 2 }]}>💯</Text>
            <Text style={[styles.counterNumber, half && styles.counterNumberHalf]} numberOfLines={1}>
              {brachosCount}/100
            </Text>
            <Text style={[styles.counterText, half && styles.counterTextHalf]} numberOfLines={2}>
              Brachos • Tap for today
            </Text>
          </View>
        </GlassCard>
      );

    case 'tzedakah_tracker':
      return (
        <GlassCard compact={half} onPress={() => !isEditing && (navigation as any).navigate('Hub')}>
          <View style={[styles.tzedakahPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.tzedakahIcon, half && styles.halfEmoji]}>💰</Text>
            <Text style={[styles.tzedakahTitle, half && styles.halfHeading]} numberOfLines={1}>
              Tzedakah
            </Text>
            <Text style={[styles.tzedakahText, half && styles.tzedakahTextHalf]} numberOfLines={half ? 2 : undefined}>
              Past month:{' '}
              {tzedakahPastMonthTotal.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                style: 'currency',
                currency: 'USD',
              })}
            </Text>
          </View>
        </GlassCard>
      );

    case 'habits':
      return (
        <GlassCard compact={half} onPress={() => !isEditing && (navigation as any).navigate('Hub', { screen: 'DailyGoals' })}>
          <View style={[styles.habitsPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.habitsIcon, half && styles.halfEmoji]}>✓</Text>
            <Text style={[styles.habitsTitle, half && styles.halfHeading]} numberOfLines={1}>
              Habit Tracker
            </Text>
            <Text style={[styles.habitsText, half && styles.halfBody]} numberOfLines={2}>
              {habitsTodayMarked ? 'Done today ✓' : 'Tap to mark today'}
            </Text>
          </View>
        </GlassCard>
      );

    case 'minyan_times':
    case 'shul_announcements':
    case 'shiurim':
    case 'tehillim_group':
    case 'simchas':
    case 'chesed_opportunities':
    case 'dvar_torah_share':
    case 'prayer_request':
      return (
        <GlassCard compact={half}>
          <View style={[styles.communityPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.communityIcon, half && styles.halfEmoji]}>{panelDef?.icon || '👥'}</Text>
            <Text style={[styles.communityTitle, half && styles.halfHeading]} numberOfLines={2}>
              {panelDef?.name || 'Community'}
            </Text>
            <Text style={[styles.communityText, half && styles.halfBody]} numberOfLines={1}>
              Coming soon
            </Text>
          </View>
        </GlassCard>
      );

    default:
      return (
        <GlassCard compact={half}>
          <View style={[styles.placeholderPanel, half && styles.halfCenterStack, half && styles.halfPanelInner]}>
            <Text style={[styles.placeholderIcon, half && styles.halfEmoji]}>{panelDef?.icon || '📦'}</Text>
            <Text style={[styles.placeholderText, half && styles.halfBody]} numberOfLines={2}>
              {panelDef?.name || panel.type}
            </Text>
          </View>
        </GlassCard>
      );
  }
}
