import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/core';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorView } from '../../components/ui/ErrorView';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { CalendarEngine } from '../../src/core/calendar/CalendarEngine';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { DailyTehillimTracker } from '../../src/storage/DailyTehillimTracker';
import { HomePanelsService, HomePanel } from '../../src/storage/HomePanelsService';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';
import { OmerCalculator } from '../../src/core/omer/OmerCalculator';
import { recordAppOpen, getAppStreak } from '../../src/storage/StreakService';
import { getDaveningStreak } from '../../src/storage/DaveningStreakService';
import { getBrachosCount } from '../../src/storage/BrachosCounterService';
import { HabitTracker } from '../../src/storage/HabitTracker';
import { TzedakahTracker } from '../../src/storage/TzedakahTracker';
import { StorageService } from '../../src/storage/StorageService';
import { ZmanimService } from '../../src/core/zmanim/ZmanimService';
import { DayInfo, CalendarContext, DaveningChanges } from '../../src/types/calendar';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { getTodayNachYomi } from '../../src/services/NachYomiService';
import { getTodayMishnaYomi } from '../../src/services/MishnaYomiService';
import { getTodayRambamYomi } from '../../src/services/RambamYomiService';
import { getShneyimMikraData } from '../../src/services/ShneyimMikraService';
import { ShneyimMikraTracker } from '../../src/storage/ShneyimMikraTracker';
import { DraggableGrid } from './components/DraggableGrid';
import { renderPanelContent, type PanelRenderContext } from './components/PanelContentRenderer';

function toHebrewNumeral(n: number): string {
  if (n <= 0) return String(n);
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];
  let result = '';
  let num = n;
  if (num >= 400) {
    const count400 = Math.floor(num / 400);
    for (let i = 0; i < count400; i++) result += 'ת';
    num %= 400;
  }
  if (num >= 100) {
    result += hundreds[Math.floor(num / 100)];
    num %= 100;
  }
  if (num === 15) {
    result += 'טו';
  } else if (num === 16) {
    result += 'טז';
  } else {
    if (num >= 10) {
      result += tens[Math.floor(num / 10)];
      num %= 10;
    }
    result += ones[num];
  }
  if (result.length === 1) {
    result += '׳';
  } else if (result.length > 1) {
    result = result.slice(0, -1) + '״' + result.slice(-1);
  }
  return result;
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


export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useHomeStyles();
  const [dayInfo, setDayInfo] = useState<DayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [panels, setPanels] = useState<HomePanel[]>([]);
  const [fastDayProgress, setFastDayProgress] = useState<{
    isFastDay: boolean;
    fastName: string;
    startTime: Date | null;
    endTime: Date | null;
    percentComplete: number;
    timeRemaining: string;
  } | null>(null);
  const [tehillimProgress, setTehillimProgress] = useState({
    percentComplete: 0,
    chaptersRemaining: [] as number[],
    totalChapters: [] as number[],
    message: '',
    dayName: '',
    goalType: 'weekly' as string,
    overallCompleted: 0,
    overallTotal: 150,
    overallLabel: '',
    overallPercent: 0,
  });
  const [appStreak, setAppStreak] = useState(0);
  const [daveningStreak, setDaveningStreak] = useState(0);
  const [tehillimStreak, setTehillimStreak] = useState(0);
  const [tehillimAverageWPM, setTehillimAverageWPM] = useState<number | null>(null);
  const [brachosCount, setBrachosCount] = useState(0);
  const [habitsTodayMarked, setHabitsTodayMarked] = useState(false);
  const [dafYomiText, setDafYomiText] = useState<string | null>(null);
  const [nachYomiText, setNachYomiText] = useState<string | null>(null);
  const [mishnaYomiText, setMishnaYomiText] = useState<string | null>(null);
  const [rambamYomiText, setRambamYomiText] = useState<string | null>(null);
  const [shneyimMikraData, setShneyimMikraData] = useState<{
    parsha: string;
    parshaHebrew: string;
    todayAliyah: number;
    todayRef: string | null;
    percentComplete: number;
    aliyotCompleted: number;
  } | null>(null);
  const [tzedakahPastMonthTotal, setTzedakahPastMonthTotal] = useState<number>(0);
  const [omerCountedToday, setOmerCountedToday] = useState(false);
  const [hebrewBirthday, setHebrewBirthday] = useState<{ day: number; month: number } | null>(null);
  const [hebrewBirthdayModalVisible, setHebrewBirthdayModalVisible] = useState(false);
  const [birthdayForm, setBirthdayForm] = useState({ day: 15, month: 1 }); // 15 Nisan default

  const gradientColors = useMemo(() => {
    const base = theme.backgroundGradient;
    return [base[0], base[1], base[2], base[0]];
  }, [theme.mode]);

  const orbPalette = useMemo(
    () =>
      theme.isDark
        ? ['rgba(72, 65, 103, 0.35)', 'rgba(44, 68, 105, 0.28)']
        : ['rgba(212, 165, 184, 0.2)', 'rgba(165, 196, 212, 0.2)'],
    [theme.isDark]
  );

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fastProgressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadDayInfo();
    loadPanels();
    loadCustomReminders();
    loadFastDayProgress();

    // Update fast progress every minute
    const interval = setInterval(loadFastDayProgress, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadTzedakahTotal = useCallback(async () => {
    const total = await TzedakahTracker.getTotalPastMonth();
    setTzedakahPastMonthTotal(total);
  }, []);

  useFocusEffect(
    useCallback(() => {
      recordAppOpen();
      loadTehillimProgress();
      loadPanels();
      loadCustomReminders();
      loadTrackingData();
      loadOmerCounted();
      loadHebrewBirthday();
      loadShneyimMikra();
      loadTzedakahTotal();
    }, [loadTzedakahTotal])
  );

  const loadHebrewBirthday = useCallback(async () => {
    const prefs = await UserPreferencesService.getPreferences();
    const bd = prefs?.hebrewBirthday ?? null;
    setHebrewBirthday(bd);
    if (bd) {
      setBirthdayForm({ day: bd.day, month: bd.month });
    }
  }, []);

  const loadOmerCounted = useCallback(async () => {
    const prefs = await UserPreferencesService.getPreferences();
    let locationObj = null;
    if (prefs?.location) {
      locationObj = {
        coords: {
          latitude: prefs.location.latitude,
          longitude: prefs.location.longitude,
          altitude: null,
          accuracy: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as import('expo-location').LocationObject;
    }
    const now = new Date();
    const ext = await ZmanimService.calculateExtendedZmanim(now, locationObj);
    const tzeis = ext.tzeis instanceof Date && !Number.isNaN(ext.tzeis.getTime()) ? ext.tzeis : null;
    const afterTzeis = !tzeis || now >= tzeis;
    const displayD = OmerCalculator.getDisplayOmerDay(now, ext.sunset ?? null, ext.tzeis ?? null);
    const countD = OmerCalculator.getOmerNightToCount(now, ext.sunset ?? null, ext.tzeis ?? null);
    if (displayD != null && countD != null) {
      const counts = await StorageService.getOmerCounts();
      const done = OmerCalculator.isOmerCaughtUp(afterTzeis, countD, counts ?? undefined);
      setOmerCountedToday(done);
    } else {
      setOmerCountedToday(false);
    }
  }, []);

  const loadTrackingData = async () => {
    const [streak, daven, tehillimStr, brachos, habitsToday] = await Promise.all([
      getAppStreak(),
      getDaveningStreak(),
      DailyTehillimTracker.getStreak(),
      getBrachosCount(),
      HabitTracker.isMarkedToday(),
    ]);
    setAppStreak(streak);
    setDaveningStreak(daven);
    setTehillimStreak(tehillimStr);
    setBrachosCount(brachos);
    setHabitsTodayMarked(habitsToday);
  };

  // Hide bottom tab bar when in edit mode
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: isEditing ? { display: 'none' } : undefined,
    } as never);
  }, [isEditing, navigation]);

  const loadCustomReminders = async () => {
    await UserPreferencesService.getCustomReminders();
  };

  const loadFastDayProgress = async () => {
    const today = new Date();
    const isFastDay = JewishCalendarService.isFastDay(today);
    
    if (!isFastDay) {
      setFastDayProgress(null);
      return;
    }

    try {
      // Get location for accurate zmanim
      let locationObj = null;
      const prefs = await UserPreferencesService.getPreferences();
      
      if (prefs?.location) {
        locationObj = {
          coords: {
            latitude: prefs.location.latitude,
            longitude: prefs.location.longitude,
            altitude: null,
            accuracy: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        };
      }
      
      // Get zmanim for today
      const zmanim = await ZmanimService.calculateExtendedZmanim(today, locationObj as any);
      
      // Fast start is alos hashachar (dawn), end is tzeis (nightfall)
      const startTime = zmanim?.alosHashachar || null;
      const endTime = zmanim?.tzeis || null;
      
      // Get fast name
      const holiday = JewishCalendarService.getHoliday(today);
      const fastName = holiday || 'Fast Day';
      
      if (startTime && endTime) {
        const now = new Date();
        const totalDuration = endTime.getTime() - startTime.getTime();
        const elapsed = now.getTime() - startTime.getTime();
        
        let percentComplete = 0;
        let timeRemaining = '';
        
        if (now < startTime) {
          // Fast hasn't started yet
          const minutesTillStart = Math.floor((startTime.getTime() - now.getTime()) / 60000);
          const hours = Math.floor(minutesTillStart / 60);
          const mins = minutesTillStart % 60;
          timeRemaining = hours > 0 ? `Starts in ${hours}h ${mins}m` : `Starts in ${mins}m`;
          percentComplete = 0;
        } else if (now > endTime) {
          // Fast is over
          timeRemaining = 'Fast complete!';
          percentComplete = 100;
        } else {
          // Fast in progress
          percentComplete = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
          const remaining = endTime.getTime() - now.getTime();
          const minutesRemaining = Math.floor(remaining / 60000);
          const hours = Math.floor(minutesRemaining / 60);
          const mins = minutesRemaining % 60;
          timeRemaining = hours > 0 ? `${hours}h ${mins}m until you can eat` : `${mins}m until you can eat`;
        }
        
        setFastDayProgress({
          isFastDay: true,
          fastName,
          startTime,
          endTime,
          percentComplete,
          timeRemaining,
        });
        
        // Animate the progress bar
        Animated.timing(fastProgressAnim, {
          toValue: percentComplete,
          duration: 800,
          useNativeDriver: false,
        }).start();
      }
    } catch (error) {
      console.error('Error loading fast day progress:', error);
      setFastDayProgress(null);
    }
  };

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: tehillimProgress.overallPercent,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [tehillimProgress.overallPercent]);

  const loadPanels = async () => {
    const loadedPanels = await HomePanelsService.getPanels();
    const filtered = loadedPanels.filter(p => p.visible).sort((a, b) => a.order - b.order);
    setPanels(filtered);
  };

  const loadDafYomi = async () => {
    try {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const res = await fetch(`https://www.hebcal.com/hebcal?cfg=json&v=1&F=on&start=${dateStr}&end=${dateStr}`);
      const data = await res.json();
      const item = data?.items?.find((e: { category?: string }) => e.category === 'dafyomi');
      const heb = (item?.hebrew as string | undefined)?.trim()?.replace(/^דף יומי:\s*/, '') || null;
      setDafYomiText(heb || item?.title?.trim() || null);
    } catch {
      setDafYomiText(null);
    }
  };

  const loadNachYomi = () => {
    const ch = getTodayNachYomi();
    setNachYomiText(ch ? `${ch.bookHebrew} ${toHebrewNumeral(ch.chapter)}` : null);
  };

  const loadMishnaYomi = () => {
    const p = getTodayMishnaYomi();
    setMishnaYomiText(p ? `${p.tractateHebrew} פרק ${toHebrewNumeral(p.perek)}` : null);
  };

  const loadRambamYomi = async () => {
    const r = await getTodayRambamYomi(3);
    setRambamYomiText(r?.titleHebrew ?? r?.title ?? null);
  };

  const loadShneyimMikra = async () => {
    const d = await getShneyimMikraData();
    if (d?.parsha) {
      const p = await ShneyimMikraTracker.getProgress(d.parsha);
      setShneyimMikraData({
        parsha: d.parsha,
        parshaHebrew: d.parshaHebrew,
        todayAliyah: d.todayAliyah,
        todayRef: d.todayRef,
        percentComplete: p.percentComplete,
        aliyotCompleted: p.aliyotCompleted.length,
      });
    } else {
      setShneyimMikraData(null);
    }
  };


  const loadTehillimProgress = async () => {
    const [progress, message, avgWpm, overall] = await Promise.all([
      DailyTehillimTracker.getTodaysProgress(),
      DailyTehillimTracker.getMotivationalMessage(),
      DailyTehillimTracker.getAverageWPM(),
      DailyTehillimTracker.getOverallTehillimProgress(),
    ]);
    setTehillimProgress({
      percentComplete: progress.percentComplete,
      chaptersRemaining: progress.chaptersRemaining ?? [],
      totalChapters: progress.totalChapters ?? [],
      message,
      dayName: progress.dayName,
      goalType: progress.goalType,
      overallCompleted: overall.completed,
      overallTotal: overall.total,
      overallLabel: overall.label,
      overallPercent: overall.percentComplete,
    });
    setTehillimAverageWPM(avgWpm);
  };

  const loadDayInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const preferences = await UserPreferencesService.getPreferences();
      if (!preferences) {
        setError('Please complete onboarding first');
        return;
      }

      let currentLocation = preferences.location;
      
      if (Platform.OS !== 'web') {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            currentLocation = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            
            await UserPreferencesService.setLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              cityName: preferences.location?.cityName,
            });
          }
        } catch (locError) {
          console.log('Using stored location, GPS unavailable:', locError);
        }
      }

      const context: CalendarContext = {
        nusach: preferences.nusach,
        location: currentLocation,
        isIsrael: false,
      };

      const info = await CalendarEngine.getTodayInfo(context);
      setDayInfo(info);
      await loadTehillimProgress();
      loadDafYomi();
      loadNachYomi();
      loadMishnaYomi();
      loadRambamYomi();
      loadTzedakahTotal();
    } catch (err) {
      console.error('Error loading day info:', err);
      setError('Failed to load day information');
    } finally {
      setLoading(false);
    }
  };

  const handleTehillimPress = async () => {
    if (isEditing) return;
    const nextChapter = await DailyTehillimTracker.getNextChapter();
    if (nextChapter) {
      (navigation as any).navigate('TehillimReader', { psalm: nextChapter });
    } else {
      navigation.navigate('Library' as never);
    }
  };

  const handleRemovePanel = async (panelId: string) => {
    try {
      await HomePanelsService.removePanel(panelId);
      await loadPanels();
    } catch (e) {
      console.error('Error removing panel:', e);
    }
  };

  const handleReorder = useCallback((newPanels: HomePanel[]) => {
    const userPanels = newPanels
      .filter(p => !p.id.startsWith('auto-'))
      .map((p, i) => ({ ...p, order: i }));
    setPanels(() => [...userPanels]);
    HomePanelsService.savePanelsWithOrder(userPanels).catch(e =>
      console.error('Failed to persist panel order:', e),
    );
  }, []);

  const formatTime = (date: Date | undefined) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatTimeUntil = (until: Date) => {
    const now = new Date();
    const ms = until.getTime() - now.getTime();
    if (ms <= 0) return null;
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    const remainderMins = mins % 60;
    if (hours > 0 && remainderMins > 0) return `${hours}h ${remainderMins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  const toggleEditMode = useCallback(() => {
    setIsEditing(prev => !prev);
  }, []);

  const autoPanelsForToday = useMemo((): HomePanel[] => {
    if (!dayInfo) return [];
    const list: HomePanel[] = [];
    const userTypes = new Set(panels.map(p => p.type));
    if (fastDayProgress?.isFastDay && !userTypes.has('fast_day_info')) {
      list.push({ id: 'auto-fast', type: 'fast_day_info', order: 1000, visible: true, size: 'full' });
    }
    if (dayInfo.omerDay != null && dayInfo.omerDay >= 1 && dayInfo.omerDay <= 49 && !userTypes.has('omer_counter')) {
      list.push({ id: 'auto-omer', type: 'omer_counter', order: 1001, visible: true, size: 'full' });
    }
    if (dayInfo.isRoshChodesh && !userTypes.has('rosh_chodesh')) {
      list.push({ id: 'auto-rosh', type: 'rosh_chodesh', order: 1002, visible: true, size: 'half' });
    }
    if (hasNotableDaveningChanges(dayInfo.daveningChanges) && !userTypes.has('davening_note')) {
      list.push({ id: 'auto-davening', type: 'davening_note', order: 999, visible: true, size: 'full' });
    }
    return list;
  }, [dayInfo, fastDayProgress, panels]);

  const displayOrder = useMemo(
    () => [...panels, ...autoPanelsForToday],
    [panels, autoPanelsForToday],
  );

  const isAutoPanelFn = useCallback((panel: HomePanel) => panel.id.startsWith('auto-'), []);
  const isUnremovableFn = useCallback(
    (panel: HomePanel) => panel.id.startsWith('auto-') || HomePanelsService.UNREMOVABLE_TYPES.includes(panel.type as any),
    [],
  );

  const panelRenderContext = useMemo((): PanelRenderContext => ({
    dayInfo, isEditing, navigation, styles, theme,
    tehillimProgress, progressAnim: progressAnim,
    handleTehillimPress,
    fastDayProgress, fastProgressAnim: fastProgressAnim,
    dafYomiText, nachYomiText, mishnaYomiText, rambamYomiText, shneyimMikraData,
    brachosCount, habitsTodayMarked, tehillimStreak, tehillimAverageWPM, tzedakahPastMonthTotal,
    omerCountedToday, setOmerCountedToday, hebrewBirthday, setHebrewBirthdayModalVisible,
    formatTime, formatTimeUntil,
  }), [
    dayInfo, isEditing, navigation, styles, theme,
    tehillimProgress, progressAnim, handleTehillimPress,
    fastDayProgress, fastProgressAnim,
    dafYomiText, nachYomiText, mishnaYomiText, rambamYomiText, shneyimMikraData,
    brachosCount, habitsTodayMarked, tehillimStreak, tehillimAverageWPM, tzedakahPastMonthTotal,
    omerCountedToday, hebrewBirthday,
  ]);

  const handleRenderPanelContent = useCallback(
    (panel: HomePanel, index: number) => renderPanelContent(panel, index, panelRenderContext),
    [panelRenderContext],
  );


  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={gradientColors}
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
          colors={gradientColors}
          style={StyleSheet.absoluteFill}
        />
        <ErrorView message={error} onRetry={loadDayInfo} />
      </View>
    );
  }

  if (!dayInfo) return null;

  const greeting = getGreeting();

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Orbs */}
      <FloatingOrb
        size={180}
        color={orbPalette[0]}
        style={{ top: height * 0.02, left: -60 }}
        duration={5000}
      />
      <FloatingOrb
        size={140}
        color={orbPalette[1]}
        style={{ top: height * 0.15, right: -40 }}
        duration={6000}
      />

      {/* Draggable Grid with all panels */}
      <View style={styles.contentWrapper}>
        <DraggableGrid
          panels={displayOrder}
          isEditing={isEditing}
          onReorder={handleReorder}
          onRemove={handleRemovePanel}
          renderPanelContent={handleRenderPanelContent}
          isAutoPanelFn={isAutoPanelFn}
          isUnremovableFn={isUnremovableFn}
          theme={theme}
          headerContent={
            <View style={styles.headerContentWrapper}>
              <View style={styles.headerRow}>
                <Text style={styles.greeting}>{greeting}</Text>
                <TouchableOpacity
                  style={[styles.editButton, isEditing && styles.editButtonActive]}
                  onPress={toggleEditMode}
                >
                  <Text style={[styles.editButtonText, isEditing && styles.editButtonTextActive]}>
                    {isEditing ? 'Done' : 'Edit'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isEditing && (
                <View style={styles.editInstructions}>
                  <Text style={styles.editInstructionsText}>
                    Long-press and drag to move • Drop to reorder
                  </Text>
                  <Text style={[styles.editInstructionsText, styles.editInstructionsSubtext]}>
                    Tap − to remove a widget
                  </Text>
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={async () => {
                      await HomePanelsService.resetToDefault();
                      await loadPanels();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resetButtonText}>Reset to default</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          }
          footerContent={
            <>
              {panels.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>📦</Text>
                  <Text style={styles.emptyStateText}>No panels added yet</Text>
                  <Text style={styles.emptyStateSubtext}>Tap + to add some</Text>
                </View>
              )}
              <View style={{ height: 24 }} />
            </>
          }
        />
      </View>

      {/* Floating Add Button */}
      {isEditing && (
        <TouchableOpacity
          style={styles.floatingAddButton}
          onPress={() => navigation.navigate('PanelsMarketplace' as never)}
          activeOpacity={0.8}
        >
          <View style={styles.floatingAddButtonInner}>
            <Text style={styles.floatingAddButtonText}>+</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Hebrew Birthday Modal */}
      <Modal
        visible={hebrewBirthdayModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHebrewBirthdayModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setHebrewBirthdayModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalIcon}>🎂</Text>
              <Text style={styles.modalTitle}>Hebrew Birthday</Text>
            </View>
            <Text style={styles.modalSubtitle}>Set your Hebrew date (day and month)</Text>
            <View style={styles.birthdayFormRow}>
              <TextInput
                style={styles.birthdayInput}
                placeholder="Day (1-30)"
                placeholderTextColor={theme.colors.text.tertiary}
                keyboardType="number-pad"
                value={birthdayForm.day ? String(birthdayForm.day) : ''}
                onChangeText={(t) => setBirthdayForm((f) => ({ ...f, day: Math.min(30, Math.max(1, parseInt(t, 10) || 1)) }))}
              />
              <View style={styles.birthdayMonthPicker}>
                <ScrollView style={styles.birthdayMonthScroll} showsVerticalScrollIndicator={false}>
                  {JewishCalendarService.HEBREW_MONTH_NAMES.map((m) => (
                    <TouchableOpacity
                      key={m.value}
                      style={[styles.birthdayMonthOption, birthdayForm.month === m.value && styles.birthdayMonthOptionActive]}
                      onPress={() => setBirthdayForm((f) => ({ ...f, month: m.value }))}
                    >
                      <Text style={[styles.birthdayMonthText, birthdayForm.month === m.value && styles.birthdayMonthTextActive]}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setHebrewBirthdayModalVisible(false)}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={async () => {
                  await UserPreferencesService.setHebrewBirthday(birthdayForm);
                  setHebrewBirthday(birthdayForm);
                  setHebrewBirthdayModalVisible(false);
                }}
              >
                <Text style={styles.modalPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
            {hebrewBirthday && (
              <TouchableOpacity
                style={styles.modalClearButton}
                onPress={async () => {
                  await UserPreferencesService.setHebrewBirthday(null);
                  setHebrewBirthday(null);
                  setHebrewBirthdayModalVisible(false);
                }}
              >
                <Text style={styles.modalClearText}>Clear birthday</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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

function createHomeStyles(theme: AppTheme) {
  return {
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing['2xl'] + spacing.safeTopInset,
    paddingBottom: 100,
  },
  headerContentWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['2xl'] + spacing.safeTopInset,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  greeting: {
    fontFamily: fonts.heading.bold,
    fontSize: 32,
    color: theme.colors.text.primary,
    letterSpacing: 0.5,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: theme.colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 36,
    justifyContent: 'center',
  },
  editButtonActive: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  editButtonText: {
    fontFamily: fonts.body.semibold,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  editButtonTextActive: {
    color: '#fff',
  },

  // Edit Instructions
  editInstructions: {
    backgroundColor: 'rgba(212, 165, 184, 0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  editInstructionsText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: theme.colors.primary.dark,
    textAlign: 'center',
  },
  editInstructionsSubtext: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  resetButton: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary.main,
  },
  resetButtonText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: theme.colors.primary.dark,
  },


  // Floating Add Button
  floatingAddButton: {
    position: 'absolute',
    bottom: 160,
    right: spacing.lg,
    zIndex: 100,
  },
  floatingAddButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  floatingAddButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2,
  },


  // Date Card
  dateCard: {},
  hebrewDate: {
    fontFamily: fonts.hebrew.bold,
    fontSize: 26,
    color: theme.colors.text.primary,
    textAlign: 'center',
    letterSpacing: 0,
  },
  dateDivider: {
    width: 40,
    height: 2,
    backgroundColor: theme.colors.primary.main,
    alignSelf: 'center',
    marginVertical: spacing.xs,
    borderRadius: 1,
    opacity: 0.6,
  },
  gregorianDate: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  specialBadge: {
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.xs,
  },
  specialBadgeText: {
    fontFamily: fonts.body.semibold,
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
    fontFamily: fonts.heading.semibold,
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  tehillimMessage: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
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
    color: theme.colors.primary.dark,
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
    backgroundColor: theme.colors.primary.main,
    borderRadius: 3,
  },
  tehillimFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  tehillimFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tehillimFooterText: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: theme.colors.text.tertiary,
  },
  tehillimFooterSubtext: {
    fontFamily: fonts.body.medium,
    fontSize: 10,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  tehillimEdit: {
    fontFamily: fonts.body.medium,
    fontSize: 11,
    color: theme.colors.secondary.dark,
    textDecorationLine: 'underline',
  },
  tehillimContinue: {
    fontFamily: fonts.body.semibold,
    fontSize: 12,
    color: theme.colors.primary.main,
  },

  // Zmanim Row
  zmanimRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
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
    color: theme.colors.text.tertiary,
    marginBottom: 2,
  },
  zmanTime: {
    fontFamily: fonts.body.semibold,
    fontSize: 15,
    color: theme.colors.text.primary,
  },

  // Davening Note
  daveningNote: {
    backgroundColor: 'rgba(212, 165, 184, 0.15)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  daveningNoteText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: theme.colors.primary.dark,
  },

  // Placeholder Panel
  placeholderPanel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  placeholderIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  placeholderText: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyStateText: {
    fontFamily: fonts.heading.semibold,
    fontSize: 18,
    color: theme.colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: theme.colors.text.tertiary,
  },

  // Custom Reminders Panel
  customRemindersPanel: {},
  customRemindersPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  customRemindersPanelTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  customRemindersPanelAdd: {
    fontFamily: fonts.body.semibold,
    fontSize: 14,
    color: theme.colors.primary.main,
  },
  customReminderPanelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  customReminderPanelItemTitle: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  customReminderPanelItemTime: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  customRemindersPanelEmpty: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  customRemindersPanelMore: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Weekly Parsha Panel
  parshaPanel: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  parshaLabel: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: theme.colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  parshaName: {
    fontFamily: fonts.heading.semibold,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  parshaHebrew: {
    fontFamily: fonts.hebrew.medium,
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 2,
    letterSpacing: 0,
  },
  parshaSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginTop: 4,
  },

  // Inspiration Quote Panel — content sits on GlassCard blur only (no nested frosted box)
  inspirationPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  inspirationIcon: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  inspirationHebrew: {
    fontFamily: fonts.hebrew.semibold,
    fontSize: 18,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: 0,
  },
  inspirationTranslation: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  inspirationSource: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },

  // Fast Day Panel
  fastDayPanel: {},
  fastDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  fastDayIcon: {
    fontSize: 28,
    marginRight: spacing.sm,
  },
  fastDayTitleContainer: {
    flex: 1,
  },
  fastDayTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 18,
    color: theme.colors.text.primary,
  },
  fastDaySubtitle: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: theme.colors.primary.dark,
    marginTop: 2,
  },
  fastProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  fastProgressBar: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  fastProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary.main,
    borderRadius: 6,
  },
  fastProgressPercent: {
    fontFamily: fonts.body.bold,
    fontSize: 14,
    color: theme.colors.primary.dark,
    minWidth: 45,
    textAlign: 'right',
  },
  fastTimesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  fastTimeItem: {
    alignItems: 'center',
  },
  fastTimeLabel: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: theme.colors.text.tertiary,
    marginBottom: 2,
  },
  fastTimeValue: {
    fontFamily: fonts.body.semibold,
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  fastCompleteMessage: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(165, 212, 180, 0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  fastCompleteText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: theme.colors.semantic.success,
  },

  // === REUSABLE PANEL STYLES ===
  // Generic Panel Base
  genericPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  genericIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  genericTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  genericText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 2,
  },

  // Greeting Panel
  greetingPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  greetingEmoji: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  greetingText: {
    fontFamily: fonts.heading.semibold,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  greetingSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },

  // Shabbos Times Panel
  shabbosPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  shabbosIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  shabbosTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 15,
    color: theme.colors.text.primary,
    marginBottom: spacing.sm,
  },
  shabbosTimesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  shabbosTimeItem: {
    alignItems: 'center',
  },
  shabbosTimeLabel: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: theme.colors.text.tertiary,
    marginBottom: 2,
  },
  shabbosTimeValue: {
    fontFamily: fonts.body.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },

  // Candle Lighting Panel
  candlePanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  candleIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  candleTitle: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  candleTime: {
    fontFamily: fonts.heading.semibold,
    fontSize: 16,
    color: theme.colors.text.primary,
    marginTop: 2,
  },

  // Omer Panel
  omerPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  omerTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  omerWait: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  omerCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  omerCheckRowDisabled: {
    opacity: 0.72,
  },
  omerCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.text.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  omerCheckboxChecked: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  omerCheckboxCheckedWaiting: {
    backgroundColor: theme.isDark ? theme.colors.neutral[600] : theme.colors.neutral[400],
    borderColor: theme.isDark ? theme.colors.neutral[500] : theme.colors.neutral[400],
  },
  omerCheckboxDisabled: {
    borderColor: theme.colors.neutral[400],
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  },
  omerCheckmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  omerCheckLabel: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: theme.colors.text.primary,
  },
  omerCheckLabelMuted: {
    color: theme.colors.text.tertiary,
    fontSize: 12,
  },
  omerInactive: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginTop: 4,
  },

  // Rosh Chodesh Panel
  roshChodeshPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  roshChodeshIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  roshChodeshTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  roshChodeshText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Hebrew Birthday Panel
  birthdayPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  birthdayIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  birthdayTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  birthdayText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Yahrzeit Panel
  yahrzeitPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  yahrzeitIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  yahrzeitTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  yahrzeitText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Daf Yomi Panel
  dafPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  dafIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  dafTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  dafText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  dafButton: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    alignSelf: 'center',
  },
  dafButtonText: {
    fontFamily: fonts.body.semibold,
    fontSize: 14,
    color: theme.colors.primary?.main || theme.colors.text.primary,
  },
  dafYomiButton: {
    alignSelf: 'stretch',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg + 4,
    borderRadius: borderRadius.xl,
    backgroundColor: theme.isDark ? 'rgba(80,100,160,0.5)' : 'rgba(80,100,160,0.35)',
    borderWidth: 1.5,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(80,100,160,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  dafButtonIcon: {
    fontSize: 22,
    marginBottom: spacing.xs,
    color: theme.colors.text.primary,
  },
  dafButtonTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 16,
    color: theme.colors.text.primary,
    marginBottom: 2,
    textAlign: 'center',
  },
  dafButtonSubtext: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    flexShrink: 1,
  },

  // Nach Panel
  nachPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  nachIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  nachTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  nachText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Mishna Panel
  mishnaPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  mishnaIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  mishnaTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  mishnaText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Halacha Panel
  halachaPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  halachaIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  halachaTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  halachaText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Sun Times Panel
  sunTimesPanel: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  sunTimeItem: {
    alignItems: 'center',
  },
  sunIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  sunLabel: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: theme.colors.text.tertiary,
    marginBottom: 2,
  },
  sunTime: {
    fontFamily: fonts.body.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },

  // Moon Phase Panel
  moonPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  moonIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  moonTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  moonText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Mini Calendar Panel
  miniCalPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  miniCalIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  miniCalTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  miniCalText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.primary.main,
    marginTop: 2,
  },

  // Month View Panel
  monthViewPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  monthViewIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  monthViewTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  monthViewText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.primary.main,
    marginTop: 2,
  },

  // Prayer Panel (Generic for all tefillos)
  prayerPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  prayerIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  prayerTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  prayerSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },

  // Reminder Panel
  reminderPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  reminderIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  reminderTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  reminderText: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },

  // Kapitel Panel
  kapitelPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  kapitelIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  kapitelTitle: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  kapitelNumber: {
    fontFamily: fonts.heading.semibold,
    fontSize: 16,
    color: theme.colors.text.primary,
    marginTop: 2,
  },

  // Learning Panel (Generic for all learning)
  learningPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  chumashPanelCompact: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  learningIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  learningTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  learningText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
    textAlign: 'center',
  },

  // Mussar Panel
  mussarPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  mussarIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  mussarTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  mussarText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: theme.colors.primary.dark,
    marginTop: spacing.xs,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Hebrew Word of Day Panel
  wordPanel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  wordHebrew: {
    fontFamily: fonts.hebrew.bold,
    fontSize: 24,
    color: theme.colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: 0,
  },
  wordMeaning: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },

  // Torah Thought Panel
  thoughtPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  thoughtIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  thoughtTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  thoughtText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // History Panel
  historyPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  historyIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  historyTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  historyText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Story Panel
  storyPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  storyIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  storyTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  storyText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
    textAlign: 'center',
  },

  // Mitzvah Panel
  mitzvahPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  mitzvahIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  mitzvahTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  mitzvahText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Middah Panel
  middahPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  middahIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  middahTitle: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  middahText: {
    fontFamily: fonts.heading.semibold,
    fontSize: 16,
    color: theme.colors.text.primary,
    marginTop: 2,
  },

  // Countdown Panel
  countdownPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  countdownIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  countdownTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  countdownText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Gratitude Panel
  gratitudePanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  gratitudeIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  gratitudeTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  gratitudeText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
    textAlign: 'center',
  },

  // Journal Panel
  journalPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  journalIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  journalTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  journalText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Goals Panel
  goalsPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  goalsIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  goalsTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  goalsText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Intentions Panel
  intentionsPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  intentionsIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  intentionsTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  intentionsText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Chesed Panel
  chesedPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  chesedIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  chesedTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  chesedText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Notes Panel
  notesPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  notesIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  notesTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  notesText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Names Panel
  namesPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  namesIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  namesTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  namesText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Affirmation Panel
  affirmationPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  affirmationIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  affirmationTitle: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  affirmationText: {
    fontFamily: fonts.heading.semibold,
    fontSize: 15,
    color: theme.colors.text.primary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  // Mood Panel
  moodPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  moodIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  moodTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  moodOptions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  moodOption: {
    fontSize: 24,
  },

  // Quick Notes Panel
  quickNotesPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  quickNotesIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  quickNotesTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  quickNotesText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Bookmarks Panel
  bookmarksPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  bookmarksIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  bookmarksTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  bookmarksText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Streak Panel
  streakPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  streakIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  streakNumber: {
    fontFamily: fonts.heading.bold,
    fontSize: 28,
    color: theme.colors.primary.dark,
  },
  streakText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },

  // Stats Panel
  statsPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statsIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  statsTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  statsText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: theme.colors.primary.main,
    marginTop: 2,
  },
  statsSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Time Tracking Panel
  timePanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  timeIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  timeTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  timeText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Summary Panel
  summaryPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  summaryTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  summaryText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Monthly Goals Panel
  monthlyPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  monthlyIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  monthlyTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  monthlyText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Counter Panel
  counterPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  counterIcon: {
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  counterNumber: {
    fontFamily: fonts.heading.bold,
    fontSize: 22,
    color: theme.colors.primary.dark,
  },
  counterText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },

  // Tzedakah Panel
  tzedakahPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  tzedakahIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  tzedakahTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  tzedakahText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Achievements Panel
  achievementsPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  achievementsIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  achievementsTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  achievementsText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Habits Panel
  habitsPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  habitsIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  habitsTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  habitsText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Community Panel (Generic for all community panels)
  communityPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  communityIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  communityTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  communityText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Half-width tiles (fixed row height): fill slot, tighter type
  halfPanelInner: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    justifyContent: 'center',
  },
  halfCenterStack: {
    paddingVertical: 0,
  },
  halfEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  halfHeading: {
    fontSize: 11,
    marginBottom: 0,
  },
  halfBody: {
    fontSize: 10,
    lineHeight: 13,
    marginTop: 2,
  },
  zmanimRowHalf: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  tehillimHalfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tehillimHalfIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(212, 165, 184, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tehillimHalfIconText: {
    fontSize: 14,
  },
  tehillimHalfInfo: {
    flex: 1,
    marginLeft: spacing.xs,
    minWidth: 0,
  },
  tehillimHalfTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 12,
    color: theme.colors.text.primary,
  },
  tehillimHalfMessage: {
    fontFamily: fonts.body.regular,
    fontSize: 10,
    color: theme.colors.text.secondary,
    marginTop: 1,
  },
  tehillimHalfPercentWrap: {
    backgroundColor: 'rgba(212, 165, 184, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tehillimHalfPercent: {
    fontFamily: fonts.body.bold,
    fontSize: 12,
    color: theme.colors.primary.dark,
  },
  tehillimHalfProgressWrap: {
    marginTop: 4,
  },
  tehillimHalfProgressBg: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  tehillimHalfFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  tehillimHalfFooterText: {
    fontFamily: fonts.body.regular,
    fontSize: 10,
    color: theme.colors.text.tertiary,
    flex: 1,
    marginRight: spacing.xs,
  },
  tehillimHalfContinue: {
    fontFamily: fonts.body.semibold,
    fontSize: 10,
    color: theme.colors.primary.main,
  },
  dafYomiButtonHalf: {
    minHeight: 0,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  dafButtonIconHalf: {
    fontSize: 15,
    marginBottom: 2,
  },
  dafButtonTitleHalf: {
    fontSize: 12,
    marginBottom: 0,
  },
  dafButtonSubtextHalf: {
    fontFamily: fonts.body.medium,
    fontSize: 10,
    lineHeight: 13,
  },
  fastDayHalfHeader: {
    marginBottom: spacing.xs,
  },
  fastDayHalfIcon: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  fastDayHalfTitle: {
    fontSize: 14,
  },
  fastDayHalfSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  fastDayHalfProgressRow: {
    marginBottom: spacing.xs,
  },
  fastProgressBarHalf: {
    height: 6,
  },
  fastTimesRowHalf: {
    marginTop: 0,
  },
  fastTimeValueHalf: {
    fontSize: 12,
  },
  omerCheckRowHalf: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  omerWaitHalf: {
    fontSize: 10,
    lineHeight: 13,
    marginTop: 2,
  },
  omerCheckLabelHalf: {
    fontSize: 11,
    flex: 1,
  },
  wordPanelHalf: {
    paddingVertical: 0,
  },
  wordHebrewHalf: {
    fontSize: 16,
    marginBottom: 2,
  },
  wordMeaningHalf: {
    fontSize: 10,
  },
  counterNumberHalf: {
    fontSize: 18,
  },
  counterTextHalf: {
    fontSize: 10,
    marginTop: 1,
  },
  tzedakahTextHalf: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  statsSubtextHalf: {
    fontSize: 10,
    marginTop: 1,
  },

  // Hebrew Birthday Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalIcon: {
    fontSize: 28,
  },
  modalTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 18,
    color: theme.colors.text.primary,
    flex: 1,
  },
  modalSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: theme.colors.text.tertiary,
    marginBottom: spacing.md,
  },
  birthdayFormRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  birthdayInput: {
    width: 80,
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.border?.default ?? theme.colors.text.tertiary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    fontFamily: fonts.body.medium,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  birthdayMonthPicker: {
    flex: 1,
    maxHeight: 160,
  },
  birthdayMonthScroll: {
    flexGrow: 0,
  },
  birthdayMonthOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: 2,
  },
  birthdayMonthOptionActive: {
    backgroundColor: theme.colors.primary.light ?? theme.colors.primary.main,
  },
  birthdayMonthText: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  birthdayMonthTextActive: {
    fontFamily: fonts.body.semibold,
    color: theme.colors.primary.dark ?? theme.colors.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  modalSecondaryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.neutral?.[300] ?? 'rgba(0,0,0,0.1)',
  },
  modalSecondaryText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: theme.colors.text.secondary,
  },
  modalPrimaryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primary.main,
  },
  modalPrimaryText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: '#fff',
  },
  modalClearButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  modalClearText: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: theme.colors.text.tertiary,
  },
};
}

function useHomeStyles() {
  const { theme } = useTheme();
  return useMemo(() => {
    try {
      return StyleSheet.create(createHomeStyles(theme));
    } catch (e) {
      console.warn('HomeScreen styles error:', e);
      return StyleSheet.create({ container: { flex: 1 } });
    }
  }, [theme]);
}
