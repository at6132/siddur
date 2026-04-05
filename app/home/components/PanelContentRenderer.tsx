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
  // Calendar
  omerCountedToday: boolean;
  setOmerCountedToday: (v: boolean) => void;
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
    omerCountedToday, setOmerCountedToday, hebrewBirthday, setHebrewBirthdayModalVisible,
    formatTime, formatTimeUntil,
  } = ctx;

  const panelDef = PANEL_DEFINITIONS.find(p => p.type === panel.type);

  switch (panel.type) {
    case 'date':
      if (!dayInfo) return null;
      return (
        <GlassCard style={styles.dateCard}>
          <Text style={styles.hebrewDate}>{JewishCalendarService.getHebrewDateShort(dayInfo.gregorianDate)}</Text>
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
      );

    case 'tehillim_progress': {
      const progressWidth = progressAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
      });
      return (
        <GlassCard style={styles.tehillimCard} onPress={handleTehillimPress}>
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
        <GlassCard onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
          <View style={styles.zmanimRow}>
            <View style={styles.zmanItem}>
              <Text style={styles.zmanLabel}>Sunrise</Text>
              <Text style={styles.zmanTime}>{formatTime(dayInfo.extendedZmanim?.sunrise)}</Text>
            </View>
            <View style={styles.zmanDivider} />
            <View style={styles.zmanItem}>
              <Text style={styles.zmanLabel}>Shema</Text>
              <Text style={styles.zmanTime}>{formatTime(dayInfo.extendedZmanim?.sofZmanShemaGRA)}</Text>
            </View>
            <View style={styles.zmanDivider} />
            <View style={styles.zmanItem}>
              <Text style={styles.zmanLabel}>Sunset</Text>
              <Text style={styles.zmanTime}>{formatTime(dayInfo.extendedZmanim?.sunset)}</Text>
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
          <GlassCard onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
            <View style={styles.daveningNote}>
              <Text style={styles.daveningNoteText}>{message}</Text>
            </View>
          </GlassCard>
        );
      }

    case 'weekly_parsha':
      return (
        <GlassCard onPress={() => !isEditing && (navigation as any).navigate('Parsha')}>
          <View style={styles.parshaPanel}>
            <Text style={styles.parshaLabel}>This Week's Parsha</Text>
            <Text style={styles.parshaName} numberOfLines={2}>
              {dayInfo?.parsha || 'See calendar'}
            </Text>
            {dayInfo?.parshaHebrew ? (
              <Text style={styles.parshaHebrew}>{dayInfo.parshaHebrew}</Text>
            ) : dayInfo?.parsha ? null : (
              <Text style={styles.parshaSubtext}>Tap to open calendar</Text>
            )}
          </View>
        </GlassCard>
      );

    case 'inspiration_quote': {
      const todayQuote = getByDay100(INSPIRATION_QUOTES);
      return (
        <GlassCard>
          <View style={styles.inspirationPanel}>
            <Text style={styles.inspirationIcon}>✨</Text>
            <Text style={styles.inspirationHebrew}>{todayQuote.text}</Text>
            <Text style={styles.inspirationTranslation}>{todayQuote.translation}</Text>
            <Text style={styles.inspirationSource}>— {todayQuote.source}</Text>
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
        return (
          <GlassCard>
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
        <GlassCard>
          <View style={styles.greetingPanel}>
            <Text style={styles.greetingEmoji}>{hour < 12 ? '🌅' : hour < 17 ? '☀️' : hour < 21 ? '🌆' : '🌙'}</Text>
            <Text style={styles.greetingText}>{greetingText}</Text>
            <Text style={styles.greetingSubtext}>May your day be blessed</Text>
          </View>
        </GlassCard>
      );
    }

    case 'shabbos_times':
      return (
        <GlassCard onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
          <View style={styles.shabbosPanel}>
            <Text style={styles.shabbosIcon}>🕯️</Text>
            <Text style={styles.shabbosTitle}>Shabbos Times</Text>
            <View style={styles.shabbosTimesRow}>
              <View style={styles.shabbosTimeItem}>
                <Text style={styles.shabbosTimeLabel}>Candles</Text>
                <Text style={styles.shabbosTimeValue}>{formatTime(dayInfo?.upcomingShabbos?.candleLighting ?? undefined)}</Text>
              </View>
              <View style={styles.shabbosTimeItem}>
                <Text style={styles.shabbosTimeLabel}>Havdalah</Text>
                <Text style={styles.shabbosTimeValue}>{formatTime(dayInfo?.upcomingShabbos?.havdalah ?? undefined)}</Text>
              </View>
            </View>
          </View>
        </GlassCard>
      );

    case 'candle_lighting':
      return (
        <GlassCard onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
          <View style={styles.candlePanel}>
            <Text style={styles.candleIcon}>🕯️</Text>
            <Text style={styles.candleTitle}>Candle Lighting</Text>
            <Text style={styles.candleTime}>{dayInfo?.upcomingShabbos?.candleLighting ? formatTime(dayInfo.upcomingShabbos.candleLighting) : 'Friday'}</Text>
          </View>
        </GlassCard>
      );

    case 'omer_counter': {
      const omerDay = dayInfo?.omerDay ?? null;
      const tzeis = dayInfo?.extendedZmanim?.tzeis;
      const now = new Date();
      const afterTzeis = tzeis && now >= tzeis;
      const waitUntil = tzeis && !afterTzeis ? formatTimeUntil(tzeis) : null;
      const handleOmerPress = async () => {
        if (isEditing || !omerDay) return;
        if (!afterTzeis) return;
        if (omerCountedToday) {
          (navigation as any).navigate('Omer');
          return;
        }
        await StorageService.markOmerDay(omerDay, true);
        setOmerCountedToday(true);
        (navigation as any).navigate('Omer');
      };
      return (
        <GlassCard onPress={handleOmerPress}>
          <View style={styles.omerPanel}>
            <Text style={styles.omerTitle}>Day {omerDay} of Omer</Text>
            {!afterTzeis && waitUntil && tzeis ? (
              <Text style={styles.omerWait}>You can't say it yet – wait {waitUntil} until {formatTime(tzeis)}</Text>
            ) : (
              <TouchableOpacity
                style={styles.omerCheckRow}
                onPress={handleOmerPress}
                activeOpacity={0.7}
                disabled={isEditing}
              >
                <View style={[styles.omerCheckbox, omerCountedToday && styles.omerCheckboxChecked]}>
                  {omerCountedToday && <Text style={styles.omerCheckmark}>✓</Text>}
                </View>
                <Text style={styles.omerCheckLabel}>Have you counted Omer yet?</Text>
              </TouchableOpacity>
            )}
          </View>
        </GlassCard>
      );
    }

    case 'rosh_chodesh':
      return (
        <GlassCard onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
          <View style={styles.roshChodeshPanel}>
            <Text style={styles.roshChodeshIcon}>🌙</Text>
            <Text style={styles.roshChodeshTitle}>Rosh Chodesh</Text>
            <Text style={styles.roshChodeshText}>{dayInfo?.isRoshChodesh ? 'Today!' : 'View calendar'}</Text>
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
        <GlassCard onPress={() => !isEditing && setHebrewBirthdayModalVisible(true)}>
          <View style={styles.birthdayPanel}>
            <Text style={styles.birthdayIcon}>🎂</Text>
            <Text style={styles.birthdayTitle}>Hebrew Birthday</Text>
            <Text style={styles.birthdayText}>{birthdayDisplay}</Text>
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
        <GlassCard onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
          <View style={styles.yahrzeitPanel}>
            <Text style={styles.yahrzeitIcon}>🕯️</Text>
            <Text style={styles.yahrzeitTitle}>Yahrzeit</Text>
            <Text style={styles.yahrzeitText} numberOfLines={3}>{yahrzeitDisplay}</Text>
          </View>
        </GlassCard>
      );
    }

    case 'nach_yomi':
      return (
        <GlassCard>
          <TouchableOpacity
            onPress={() => !isEditing && (navigation as any).navigate('NachReader', { nachYomi: true })}
            activeOpacity={0.75}
            style={styles.dafYomiButton}
          >
            <Text style={styles.dafButtonIcon}>📖</Text>
            <Text style={styles.dafButtonTitle}>Nach Yomi</Text>
            <Text style={styles.dafButtonSubtext} numberOfLines={2} adjustsFontSizeToFit>{nachYomiText ?? "Today's chapter"}</Text>
          </TouchableOpacity>
        </GlassCard>
      );

    case 'mishna_yomis':
      return (
        <GlassCard>
          <TouchableOpacity
            onPress={() => !isEditing && (navigation as any).navigate('MishnaReader', { mishnaYomi: true })}
            activeOpacity={0.75}
            style={styles.dafYomiButton}
          >
            <Text style={styles.dafButtonIcon}>📕</Text>
            <Text style={styles.dafButtonTitle}>Mishna Yomi</Text>
            <Text style={styles.dafButtonSubtext} numberOfLines={2} adjustsFontSizeToFit>{mishnaYomiText ?? "Today's perek"}</Text>
          </TouchableOpacity>
        </GlassCard>
      );

    case 'moon_phase': {
      const jewishDayMatch = dayInfo?.jewishDateShort?.match(/^\d+/);
      const jewishDay = jewishDayMatch ? parseInt(jewishDayMatch[0], 10) : 15;
      return (
        <GlassCard onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
          <View style={styles.moonPanel}>
            <MoonPhaseAnimation jewishDay={jewishDay} isDark={theme.isDark} />
            <Text style={styles.moonTitle}>Moon Phase</Text>
            <Text style={styles.moonText}>Day {jewishDay} of month</Text>
          </View>
        </GlassCard>
      );
    }

    case 'daf_yomi':
      return (
        <GlassCard>
          <TouchableOpacity
            onPress={() => !isEditing && (navigation as any).navigate('GemaraReader', { dafYomi: true })}
            activeOpacity={0.75}
            style={styles.dafYomiButton}
          >
            <Text style={styles.dafButtonIcon}>📚</Text>
            <Text style={styles.dafButtonTitle}>Daf Yomi</Text>
            <Text style={styles.dafButtonSubtext} numberOfLines={2} adjustsFontSizeToFit>{dafYomiText ?? "Today's daf"}</Text>
          </TouchableOpacity>
        </GlassCard>
      );

    case 'parsha_summary': {
      const parshaSummaryLine = getParshaSummary(dayInfo?.parsha);
      return (
        <GlassCard onPress={() => !isEditing && (navigation as any).navigate('Parsha')}>
          <View style={styles.learningPanel}>
            <Text style={styles.learningIcon}>📜</Text>
            <Text style={styles.learningTitle}>{dayInfo?.parsha || 'Parsha'}</Text>
            <Text style={styles.learningText} numberOfLines={3}>{parshaSummaryLine}</Text>
          </View>
        </GlassCard>
      );
    }

    case 'mussar':
      return (
        <GlassCard>
          <View style={styles.mussarPanel}>
            <Text style={styles.mussarIcon}>💎</Text>
            <Text style={styles.mussarTitle}>Daily Mussar</Text>
            <Text style={styles.mussarText}>{getByDay100(MUSSAR_QUOTES)}</Text>
          </View>
        </GlassCard>
      );

    case 'rambam_daily':
      return (
        <GlassCard>
          <TouchableOpacity
            onPress={() => !isEditing && (navigation as any).navigate('RambamReader', { rambamYomi: true })}
            activeOpacity={0.75}
            style={styles.dafYomiButton}
          >
            <Text style={styles.dafButtonIcon}>📕</Text>
            <Text style={styles.dafButtonTitle}>Rambam Daily</Text>
            <Text style={styles.dafButtonSubtext} numberOfLines={2} adjustsFontSizeToFit>{rambamYomiText ?? "Today's 3 chapters"}</Text>
          </TouchableOpacity>
        </GlassCard>
      );

    case 'chumash_daily': {
      const sm = shneyimMikraData;
      const smPercent = sm?.percentComplete ?? 0;
      return (
        <GlassCard onPress={() => !isEditing && (navigation as any).navigate('Chumash')}>
          <View style={styles.chumashPanelCompact}>
            <Text style={styles.learningIcon}>📜</Text>
            <Text style={styles.learningTitle}>Shneyim Mikra</Text>
            <Text style={styles.learningText} numberOfLines={1}>
              {sm ? `${sm.parshaHebrew} • Aliyah ${sm.todayAliyah} (${sm.aliyotCompleted}/7)` : 'Loading...'}
            </Text>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
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
        <GlassCard>
          <View style={styles.wordPanel}>
            <Text style={styles.wordHebrew}>{todayWord.word}</Text>
            <Text style={styles.wordMeaning}>{todayWord.meaning}</Text>
          </View>
        </GlassCard>
      );
    }

    case 'torah_thought':
      return (
        <GlassCard>
          <View style={styles.thoughtPanel}>
            <Text style={styles.thoughtIcon}>💡</Text>
            <Text style={styles.thoughtTitle}>Torah Thought</Text>
            <Text style={styles.thoughtText}>{getByDay100(TORAH_THOUGHTS)}</Text>
          </View>
        </GlassCard>
      );

    case 'zohar':
      return (
        <GlassCard>
          <View style={styles.learningPanel}>
            <Text style={styles.learningIcon}>🌟</Text>
            <Text style={styles.learningTitle}>Daily Zohar</Text>
            <Text style={styles.learningText} numberOfLines={3}>{getByDay100(ZOHAR_CHASSIDUS)}</Text>
          </View>
        </GlassCard>
      );

    case 'jewish_history':
      return (
        <GlassCard>
          <View style={styles.historyPanel}>
            <Text style={styles.historyIcon}>📜</Text>
            <Text style={styles.historyTitle}>On This Day</Text>
            <Text style={styles.historyText} numberOfLines={3}>{getByDay100(JEWISH_HISTORY_ON_THIS_DAY)}</Text>
          </View>
        </GlassCard>
      );

    case 'gedolim_story':
      return (
        <GlassCard>
          <View style={styles.storyPanel}>
            <Text style={styles.storyIcon}>👤</Text>
            <Text style={styles.storyTitle}>Gedolim Story</Text>
            <Text style={styles.storyText} numberOfLines={4}>{getByDay100(GEDOLIM_STORIES)}</Text>
          </View>
        </GlassCard>
      );

    case 'mitzvah_of_day':
      return (
        <GlassCard onPress={() => !isEditing && (navigation as any).navigate('Hub')}>
          <View style={styles.mitzvahPanel}>
            <Text style={styles.mitzvahIcon}>⭐</Text>
            <Text style={styles.mitzvahTitle}>Mitzvah of the Day</Text>
            <Text style={styles.mitzvahText}>Give tzedakah today—even a small amount. "Tzedakah tatzil mimaves."</Text>
          </View>
        </GlassCard>
      );

    case 'middah_of_week': {
      const middos = ['Chesed (Kindness)', 'Gevurah (Strength)', 'Tiferes (Beauty)', 'Netzach (Endurance)', 'Hod (Splendor)', 'Yesod (Foundation)', 'Malchus (Kingship)'];
      return (
        <GlassCard onPress={() => !isEditing && (navigation as any).navigate('Hub')}>
          <View style={styles.middahPanel}>
            <Text style={styles.middahIcon}>💪</Text>
            <Text style={styles.middahTitle}>Middah of the Week</Text>
            <Text style={styles.middahText}>{middos[new Date().getDay()]}</Text>
          </View>
        </GlassCard>
      );
    }

    case 'gratitude':
      return (
        <GlassCard onPress={() => !isEditing && (navigation as any).navigate('Hub', { screen: 'Gratitude' })}>
          <View style={styles.gratitudePanel}>
            <Text style={styles.gratitudeIcon}>🙏</Text>
            <Text style={styles.gratitudeTitle}>Daily Gratitude</Text>
            <Text style={styles.gratitudeText}>What are you thankful for?</Text>
          </View>
        </GlassCard>
      );

    case 'tehillim_stats':
      return (
        <GlassCard onPress={() => !isEditing && (navigation as any).navigate('Hub')}>
          <View style={styles.statsPanel}>
            <Text style={styles.statsIcon}>📊</Text>
            <Text style={styles.statsTitle}>Tehillim Stats</Text>
            <Text style={styles.statsText}>{tehillimProgress.overallPercent}% {tehillimProgress.overallLabel || 'today'}</Text>
            {tehillimStreak > 0 && (
              <Text style={styles.statsSubtext}>{tehillimStreak} day streak</Text>
            )}
            {tehillimAverageWPM != null && (
              <Text style={styles.statsSubtext}>Avg {tehillimAverageWPM} WPM</Text>
            )}
          </View>
        </GlassCard>
      );

    case 'brachos_counter':
      return (
        <GlassCard onPress={() => !isEditing && (navigation as any).navigate('Hub')}>
          <View style={styles.counterPanel}>
            <Text style={styles.counterIcon}>💯</Text>
            <Text style={styles.counterNumber}>{brachosCount}/100</Text>
            <Text style={styles.counterText}>Brachos • Tap for today</Text>
          </View>
        </GlassCard>
      );

    case 'tzedakah_tracker':
      return (
        <GlassCard onPress={() => !isEditing && (navigation as any).navigate('Hub')}>
          <View style={styles.tzedakahPanel}>
            <Text style={styles.tzedakahIcon}>💰</Text>
            <Text style={styles.tzedakahTitle}>Tzedakah</Text>
            <Text style={styles.tzedakahText}>
              Past month: {tzedakahPastMonthTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, style: 'currency', currency: 'USD' })}
            </Text>
          </View>
        </GlassCard>
      );

    case 'habits':
      return (
        <GlassCard onPress={() => !isEditing && (navigation as any).navigate('Hub', { screen: 'DailyGoals' })}>
          <View style={styles.habitsPanel}>
            <Text style={styles.habitsIcon}>✓</Text>
            <Text style={styles.habitsTitle}>Habit Tracker</Text>
            <Text style={styles.habitsText}>
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
        <GlassCard>
          <View style={styles.communityPanel}>
            <Text style={styles.communityIcon}>{panelDef?.icon || '👥'}</Text>
            <Text style={styles.communityTitle}>{panelDef?.name || 'Community'}</Text>
            <Text style={styles.communityText}>Coming soon</Text>
          </View>
        </GlassCard>
      );

    default:
      return (
        <GlassCard>
          <View style={styles.placeholderPanel}>
            <Text style={styles.placeholderIcon}>{panelDef?.icon || '📦'}</Text>
            <Text style={styles.placeholderText}>{panelDef?.name || panel.type}</Text>
          </View>
        </GlassCard>
      );
  }
}
