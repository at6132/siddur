import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
  Alert,
  PanResponder,
  LayoutAnimation,
  UIManager,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';

const DEBUG_PANELS = true; // set false when done debugging
const log = (tag: string, ...args: any[]) => {
  if (DEBUG_PANELS) console.log(`[Panels ${tag}]`, ...args);
};
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/core';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { FadeIn } from '../../components/animations/FadeIn';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorView } from '../../components/ui/ErrorView';
import { NotificationBanner } from '../../components/ui/NotificationBanner';
import { MoonPhaseAnimation } from '../../components/ui/MoonPhaseAnimation';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { CalendarEngine } from '../../src/core/calendar/CalendarEngine';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { DailyTehillimTracker } from '../../src/storage/DailyTehillimTracker';
import { HomePanelsService, HomePanel, PANEL_DEFINITIONS } from '../../src/storage/HomePanelsService';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';
import { OmerCalculator } from '../../src/core/omer/OmerCalculator';
import { recordAppOpen, getAppStreak } from '../../src/storage/StreakService';
import { getDaveningStreak } from '../../src/storage/DaveningStreakService';
import { getBrachosCount, addBrachos } from '../../src/storage/BrachosCounterService';
import { HabitTracker } from '../../src/storage/HabitTracker';
import { TzedakahTracker } from '../../src/storage/TzedakahTracker';
import { StorageService } from '../../src/storage/StorageService';
import { ZmanimService } from '../../src/core/zmanim/ZmanimService';
import { DayInfo, CalendarContext, DaveningChanges } from '../../src/types/calendar';
import { CustomReminder } from '../../src/types/preferences';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import {
  HEBREW_WORDS,
  INSPIRATION_QUOTES,
  MUSSAR_QUOTES,
  TORAH_THOUGHTS,
  GEDOLIM_STORIES,
  JEWISH_HISTORY_ON_THIS_DAY,
  AFFIRMATIONS,
  CHUMASH_DAILY,
  ZOHAR_CHASSIDUS,
  getByDay100,
  getParshaSummary,
} from '../../src/content/HomeWidgetContent';
import { getGedolimForDate } from '../../src/content/GedolimYahrzeits';
import { getTodayNachYomi } from '../../src/services/NachYomiService';
import { getTodayMishnaYomi } from '../../src/services/MishnaYomiService';
import { getTodayRambamYomi } from '../../src/services/RambamYomiService';
import { getShneyimMikraData } from '../../src/services/ShneyimMikraService';
import { ShneyimMikraTracker } from '../../src/storage/ShneyimMikraTracker';
// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** True when today has different/special davening (Rosh Chodesh, Yom Tov, no Tachanun, Hallel, etc.). */
function hasNotableDaveningChanges(dc: DaveningChanges | null | undefined): boolean {
  if (!dc) return false;
  return (
    dc.hallel === 'full' ||
    dc.hallel === 'half' ||
    dc.tachanun === false ||
    dc.yaalehVeyavo === true ||
    dc.alHanissim === true ||
    dc.aneinu === true ||
    dc.nachem === true ||
    dc.avinuMalkeinu === true ||
    dc.selichos === true ||
    dc.kinos === true ||
    dc.musaf !== false
  );
}

const { width, height } = Dimensions.get('window');
const GRID_GAP = spacing.sm;
const PANEL_HEIGHT = 120; // Same height for every widget
const PANEL_WIDTH_HALF = (width - spacing.lg * 2 - GRID_GAP) / 2; // Half width = 2 per row

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

// Gentle Jiggle Animation Component for Edit Mode
const JiggleView: React.FC<{
  children: React.ReactNode;
  isEditing: boolean;
  style?: any;
}> = ({ children, isEditing, style }) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isEditing) {
      // Gentle, slow jiggle - feels bendable, not rigid
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotation, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(rotation, {
            toValue: -1,
            duration: 560,
            useNativeDriver: true,
          }),
          Animated.timing(rotation, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      rotation.setValue(0);
    }
  }, [isEditing]);

  const rotate = rotation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-0.35deg', '0deg', '0.35deg'],
  });

  return (
    <Animated.View style={[style, isEditing && { transform: [{ rotate }] }]}>
      {children}
    </Animated.View>
  );
};

// Glass Card Component
const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}> = ({ children, style, onPress }) => {
  const styles = useHomeStyles();
  const { theme } = useTheme();
  const glassGradient = theme.isDark
    ? ['rgba(16, 14, 24, 0.92)', 'rgba(18, 20, 34, 0.78)']
    : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)'];

  const content = (
    <View style={[styles.glassCard, style]}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={80} tint={theme.isDark ? 'dark' : 'light'} style={styles.glassBlur}>
          <View style={styles.glassInner}>{children}</View>
        </BlurView>
      ) : (
        <LinearGradient
          colors={glassGradient}
          style={styles.glassBlur}
        >
          <View style={styles.glassInner}>{children}</View>
        </LinearGradient>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

// Draggable Panel Wrapper for Edit Mode
const DraggablePanel: React.FC<{
  children: React.ReactNode;
  isEditing: boolean;
  onRemove: () => void;
  index: number;
  onDragStart: (index: number) => void;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
  onDragMove: (index: number, pageX: number, pageY: number) => void;
  isDragging: boolean;
  draggedIndex: number | null;
  panelCount: number;
  isFullWidth?: boolean;
  dragPreviewToIndex?: number | null;
  isAutoPanel?: boolean;
}> = ({ 
  children, 
  isEditing, 
  onRemove,
  index, 
  onDragStart, 
  onDragEnd, 
  onDragMove,
  isDragging,
  draggedIndex,
  panelCount,
  isFullWidth,
  dragPreviewToIndex,
  isAutoPanel = false,
}) => {
  const styles = useHomeStyles();
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const zIndex = useRef(new Animated.Value(1)).current;
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressed = useRef(false);
  const startY = useRef(0);
  const isEditingRef = useRef(isEditing);
  isEditingRef.current = isEditing;

  // Check if touch is in the remove button area (top-left corner)
  const isTouchOnRemoveButton = (evt: any) => {
    const { locationX, locationY } = evt.nativeEvent;
    return locationX < 40 && locationY < 40;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const onRemove = isTouchOnRemoveButton(evt);
        if (onRemove) {
          log('drag', 'panResponder: not claiming (remove zone)', index);
          return false;
        }
        const claim = isEditingRef.current;
        if (claim) log('drag', 'panResponder: claiming touch', index);
        return claim;
      },
      onStartShouldSetPanResponderCapture: (evt) => {
        if (isTouchOnRemoveButton(evt)) return false;
        return isEditingRef.current;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (isTouchOnRemoveButton(evt)) return false;
        return isEditingRef.current && isLongPressed.current && (Math.abs(gestureState.dy) > 5 || Math.abs(gestureState.dx) > 5);
      },
      onPanResponderGrant: (evt) => {
        if (isTouchOnRemoveButton(evt)) {
          log('drag', 'grant ignored (remove zone)', index);
          return;
        }
        log('drag', 'panResponderGrant', index);
        startY.current = evt.nativeEvent.pageY;
        longPressTimer.current = setTimeout(() => {
          isLongPressed.current = true;
          log('drag', 'long press fired, starting drag', index);
          onDragStart(index);
          Animated.parallel([
            Animated.spring(scale, { toValue: 1.05, tension: 80, friction: 12, useNativeDriver: true }),
            Animated.timing(zIndex, { toValue: 100, duration: 0, useNativeDriver: true }),
          ]).start();
        }, 180);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (isLongPressed.current) {
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
          onDragMove(index, evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        }
      },
      onPanResponderRelease: (evt) => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
        }
        if (isLongPressed.current) {
          const dropY = evt.nativeEvent.pageY;
          const rowHeight = 120;
          const newIndex = Math.floor((dropY - 150) / rowHeight);
          const fallbackIndex = Math.max(0, Math.min(panelCount - 1, newIndex));
          const toIndex = (dragPreviewToIndex != null && dragPreviewToIndex >= 0 && dragPreviewToIndex < panelCount)
            ? dragPreviewToIndex
            : fallbackIndex;
          log('drag', 'panResponderRelease', { index, toIndex, dragPreviewToIndex });
          onDragEnd(index, toIndex);
        } else {
          log('drag', 'panResponderRelease (no long press)', index);
        }
        isLongPressed.current = false;
        
        // Reset position - softer spring so drop feels bendable, not rigid
        Animated.parallel([
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, tension: 45, friction: 10, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, tension: 45, friction: 10, useNativeDriver: true }),
          Animated.timing(zIndex, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]).start();
      },
      onPanResponderTerminate: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
        }
        isLongPressed.current = false;
        Animated.parallel([
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, tension: 45, friction: 10, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, tension: 45, friction: 10, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  const isBeingDragged = isDragging && draggedIndex === index;
  const shouldDim = isDragging && draggedIndex !== index;

  // Handle remove button press directly without panResponder interference
  const handleRemovePress = () => {
    log('remove', 'minus button pressed, index=', index);
    onRemove();
  };

  return (
    <View
      style={[
        isFullWidth ? styles.gridItemFull : styles.gridItem,
        { zIndex: isBeingDragged ? 100 : 1, overflow: 'visible' as const },
      ]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          styles.panelAnimatedWrapper,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scale },
            ],
            opacity: shouldDim ? 0.5 : 1,
          },
        ]}
        {...(isEditing && !isAutoPanel ? panResponder.panHandlers : {})}
      >
        <JiggleView isEditing={isEditing && !isBeingDragged}>
          <View
            style={styles.editablePanelContainer}
            pointerEvents={isEditing ? 'none' : 'auto'}
          >
            {children}
          </View>
        </JiggleView>
      </Animated.View>
      
      {/* Remove button - outside of panResponder to ensure it works (not for auto time-based panels) */}
      {isEditing && !isAutoPanel && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemovePress}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPressIn={() => log('remove', 'minus onPressIn', index)}
        >
          <View style={styles.removeButtonInner}>
            <Text style={styles.removeButtonText}>−</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
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
  const [customReminders, setCustomReminders] = useState<CustomReminder[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragPreviewToIndex, setDragPreviewToIndex] = useState<number | null>(null);
  const panelLayoutsRef = useRef<Record<string, { x: number; y: number; w: number; h: number }>>({});
  const panelRefsRef = useRef<(null | React.ComponentRef<typeof View>)[]>([]);
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
    const day = OmerCalculator.getOmerDay();
    if (day) {
      const counts = await StorageService.getOmerCounts();
      setOmerCountedToday(!!counts?.[day]);
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
    const reminders = await UserPreferencesService.getCustomReminders();
    setCustomReminders(reminders);
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
    log('loadPanels', 'loaded', loadedPanels.length, 'visible', filtered.length, 'ids', filtered.map(p => p.id));
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
      setDafYomiText(item?.title?.trim() || null);
    } catch {
      setDafYomiText(null);
    }
  };

  const loadNachYomi = () => {
    const ch = getTodayNachYomi();
    setNachYomiText(ch ? `${ch.book} ${ch.chapter}` : null);
  };

  const loadMishnaYomi = () => {
    const p = getTodayMishnaYomi();
    setMishnaYomiText(p ? `${p.tractate} ${p.perek}` : null);
  };

  const loadRambamYomi = async () => {
    const r = await getTodayRambamYomi(3);
    setRambamYomiText(r?.title ?? null);
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
      chaptersRemaining: progress.chaptersRemaining,
      totalChapters: progress.totalChapters,
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
    log('remove', 'handleRemovePanel called', panelId);
    try {
      await HomePanelsService.removePanel(panelId);
      log('remove', 'removePanel done, calling loadPanels');
      await loadPanels();
      log('remove', 'loadPanels done');
    } catch (e) {
      log('remove', 'error', e);
    }
  };

  const measureAllPanels = useCallback((order: HomePanel[]) => {
    order.forEach((panel, i) => {
      const ref = panelRefsRef.current[i];
      if (ref && typeof (ref as any).measureInWindow === 'function') {
        (ref as any).measureInWindow((x: number, y: number, w: number, h: number) => {
          panelLayoutsRef.current[panel.id] = { x, y, w, h };
        });
      }
    });
  }, []);

  const handleDragStart = (index: number) => {
    log('drag', 'handleDragStart', index);
    setIsDragging(true);
    setDraggedIndex(index);
    setDragPreviewToIndex(index);
    requestAnimationFrame(() => measureAllPanels(displayOrder));
  };

  const handleDragMove = useCallback((draggedIdx: number, pageX: number, pageY: number) => {
    const layouts = panelLayoutsRef.current;
    const draggedPanel = panels[draggedIdx];
    if (!draggedPanel) return;
    // Find which slot contains the finger (half = left/right or full width)
    let found: number | null = null;
    for (const [panelId, layout] of Object.entries(layouts)) {
      if (panelId === draggedPanel.id) continue;
      const { x, y, w, h } = layout;
      if (pageX >= x && pageX <= x + w && pageY >= y && pageY <= y + h) {
        const idx = panels.findIndex((p) => p.id === panelId);
        if (idx >= 0 && idx < panels.length) {
          found = idx;
          break;
        }
      }
    }
    if (found !== null) {
      setDragPreviewToIndex((prev) => (prev === found ? prev : found));
    }
  }, [panels]);

  const handleDragEnd = async (fromIndex: number, toIndex: number) => {
    // Clamp toIndex to user panels only (auto time-based panels are at the end and not reorderable)
    const safeToIndex = Math.max(0, Math.min(toIndex, panels.length - 1));
    log('drag', 'handleDragEnd', { fromIndex, toIndex: safeToIndex, panelCount: panels.length });
    if (fromIndex !== safeToIndex && fromIndex >= 0 && fromIndex < panels.length) {
      LayoutAnimation.configureNext({
        duration: 380,
        update: { type: 'easeInEaseOut' },
        create: { type: 'easeInEaseOut', property: 'opacity' },
        delete: { type: 'easeInEaseOut', property: 'opacity' },
      });
      const newPanels = [...panels];
      const [movedPanel] = newPanels.splice(fromIndex, 1);
      newPanels.splice(safeToIndex, 0, movedPanel);
      newPanels.forEach((p, i) => p.order = i);
      setPanels(newPanels);
      await HomePanelsService.reorderPanels(newPanels.map(p => p.id));
      log('drag', 'reorder saved');
    }
    setIsDragging(false);
    setDraggedIndex(null);
    setDragPreviewToIndex(null);
  };

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

  const toggleEditMode = () => {
    if (isEditing) {
      setIsDragging(false);
      setDraggedIndex(null);
      setDragPreviewToIndex(null);
    } else {
      // Entering edit mode - animate grid like Apple Home
      LayoutAnimation.configureNext({
        duration: 260,
        update: { type: 'easeInEaseOut' },
        create: { type: 'easeInEaseOut', property: 'opacity' },
      });
    }
    setIsEditing(!isEditing);
  };

  // Time-based panels: auto-added when the day applies (not in marketplace, not stored)
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
    [panels, autoPanelsForToday]
  );

  useEffect(() => {
    if (!isDragging || draggedIndex == null) return;
    const id = requestAnimationFrame(() => measureAllPanels(displayOrder));
    return () => cancelAnimationFrame(id);
  }, [isDragging, draggedIndex, displayOrder, measureAllPanels]);

  const handlePanelLayout = useCallback((panelId: string, displayIndex: number) => {
    return () => {
      const ref = panelRefsRef.current[displayIndex];
      if (ref && typeof (ref as any).measureInWindow === 'function') {
        (ref as any).measureInWindow((x: number, y: number, w: number, h: number) => {
          panelLayoutsRef.current[panelId] = { x, y, w, h };
        });
      }
    };
  }, []);

  // Inner content for one panel (used by renderPanel and by drag overlay)
  const getPanelContentNode = (panel: HomePanel, index: number): React.ReactNode => {
    const panelDef = PANEL_DEFINITIONS.find(p => p.type === panel.type);
    switch (panel.type) {
        case 'date':
          if (!dayInfo) return null;
          return (
            <GlassCard style={styles.dateCard}>
              <Text style={styles.hebrewDate}>{dayInfo.jewishDateShort}</Text>
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

        case 'tehillim_progress':
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
                        : `${tehillimProgress.totalChapters.length - tehillimProgress.chaptersRemaining.length} of ${tehillimProgress.totalChapters.length} today`}
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
          const hasHallel = !!dayInfo.daveningChanges?.hallel;
          const noTachanun = dayInfo.daveningChanges?.tachanun === false;
          const message = hasHallel
            ? `${dayInfo.daveningChanges.hallel === 'full' ? 'Full' : 'Half'} Hallel today`
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

        case 'inspiration_quote':
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

        case 'fast_day_info':
          // Only show if it's a fast day
          if (!fastDayProgress?.isFastDay) {
            return null;
          }
          
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
                
                {/* Progress Bar */}
                <View style={styles.fastProgressContainer}>
                  <View style={styles.fastProgressBar}>
                    <Animated.View 
                      style={[
                        styles.fastProgressFill,
                        { width: fastProgressWidth }
                      ]} 
                    />
                  </View>
                  <Text style={styles.fastProgressPercent}>
                    {Math.round(fastDayProgress.percentComplete)}%
                  </Text>
                </View>
                
                {/* Times */}
                <View style={styles.fastTimesRow}>
                  <View style={styles.fastTimeItem}>
                    <Text style={styles.fastTimeLabel}>Fast began</Text>
                    <Text style={styles.fastTimeValue}>
                      {formatFastTime(fastDayProgress.startTime)}
                    </Text>
                  </View>
                  <View style={styles.fastTimeItem}>
                    <Text style={styles.fastTimeLabel}>Can eat at</Text>
                    <Text style={styles.fastTimeValue}>
                      {formatFastTime(fastDayProgress.endTime)}
                    </Text>
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

        // === ESSENTIAL PANELS ===
        case 'greeting':
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

        // === CALENDAR PANELS ===
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

        case 'omer_counter':
          const omerDay = dayInfo?.omerDay ?? null;
          const tzeis = dayInfo?.extendedZmanim?.tzeis;
          const now = new Date();
          const afterTzeis = tzeis && now >= tzeis;
          const waitUntil = tzeis && !afterTzeis ? formatTimeUntil(tzeis) : null;
          const handleOmerPress = async () => {
            if (isEditing || !omerDay) return;
            if (!afterTzeis) return; // Can't count yet
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
                <Text style={styles.omerIcon}>🌾</Text>
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

        case 'hebrew_birthday':
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

        case 'yahrzeit':
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

        case 'moon_phase':
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

        // === LEARNING PANELS ===
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

        case 'parsha_summary':
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

        case 'word_of_day':
          const todayWord = getByDay100(HEBREW_WORDS);
          return (
            <GlassCard>
              <View style={styles.wordPanel}>
                <Text style={styles.wordHebrew}>{todayWord.word}</Text>
                <Text style={styles.wordMeaning}>{todayWord.meaning}</Text>
              </View>
            </GlassCard>
          );

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

        case 'middah_of_week':
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

        // === PERSONAL PANELS ===
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

        // === TRACKING PANELS ===
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

        // === COMMUNITY PANELS (Coming soon) ===
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
  };

  const renderPanel = (panel: HomePanel, index: number) => {
    const content = getPanelContentNode(panel, index);
    if (!content) return null;

    const isFullWidth = panel.size === 'full'; // full = 1 per row, half = 2 per row; same height for all

    const isAutoPanel = panel.id.startsWith('auto-');
    const isUnremovable = isAutoPanel || HomePanelsService.UNREMOVABLE_TYPES.includes(panel.type as any);
    return (
      <DraggablePanel
        key={panel.id}
        isEditing={isEditing}
        onRemove={isUnremovable ? () => {} : () => handleRemovePanel(panel.id)}
        index={index}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragMove={handleDragMove}
        isDragging={isDragging}
        draggedIndex={draggedIndex}
        panelCount={panels.length}
        isFullWidth={isFullWidth}
        dragPreviewToIndex={dragPreviewToIndex}
        isAutoPanel={isUnremovable}
      >
        {content}
      </DraggablePanel>
    );
  };

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

      {/* Notification Banner */}
      {!isEditing && (
        <NotificationBanner onSetup={() => navigation.navigate('Settings' as never)} />
      )}

      {/* Content - scrollable when many widgets */}
      <View style={styles.contentWrapper}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
          scrollEnabled={!isEditing}
        >
          {/* Header Row with Greeting and Edit Button */}
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

          {/* Edit Mode Instructions */}
          {isEditing && (
            <View style={styles.editInstructions}>
              <Text style={styles.editInstructionsText}>
                Long-press and drag to move • Drop to reorder
              </Text>
              <Text style={[styles.editInstructionsText, styles.editInstructionsSubtext]}>
                Tap − to remove a panel
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

          {/* Dynamic Panels Grid - displayOrder so other panels shift in real time while dragging */}
          <View style={styles.panelsGrid}>
            {displayOrder.map((panel: HomePanel, displayIndex: number) => {
              const realIndex = panels.findIndex((p) => p.id === panel.id);
              const isFullWidth = panel.size === 'full';
              const panelContent = renderPanel(panel, realIndex >= 0 ? realIndex : displayIndex);
              if (!panelContent) return null;
              return (
                <View
                  key={panel.id}
                  ref={(r) => { panelRefsRef.current[displayIndex] = r; }}
                  onLayout={handlePanelLayout(panel.id, displayIndex)}
                  collapsable={false}
                  style={isFullWidth ? styles.gridItemFull : styles.gridItem}
                >
                  {panelContent}
                </View>
              );
            })}
          </View>

          {/* Empty State */}
          {panels.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📦</Text>
              <Text style={styles.emptyStateText}>No panels added yet</Text>
              <Text style={styles.emptyStateSubtext}>Tap + to add some</Text>
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>

      {/* Floating Add Button - Always visible in edit mode */}
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

  // Panels Grid - evenly spaced widgets
  panelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: GRID_GAP,
  },
  gridItem: {
    width: PANEL_WIDTH_HALF,
    minHeight: PANEL_HEIGHT,
    overflow: 'visible',
  },
  gridItemFull: {
    width: '100%',
    minHeight: PANEL_HEIGHT,
    overflow: 'visible',
  },
  // Editable Panel - no flex:1 so height comes from content (GlassCard), not collapsed
  panelAnimatedWrapper: {
    alignSelf: 'stretch',
  },
  editablePanelContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    left: -6,
    zIndex: 100,
  },
  removeButtonInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.semantic.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: -2,
  },
  reorderButtons: {
    position: 'absolute',
    top: -8,
    right: -8,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  reorderButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  reorderButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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

  // Glass Card
  glassCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: theme.colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    minHeight: 88,
  },
  glassBlur: {
    overflow: 'hidden',
  },
  glassInner: {
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },

  // Date Card
  dateCard: {},
  hebrewDate: {
    fontFamily: fonts.heading.bold,
    fontSize: 26,
    color: theme.colors.text.primary,
    textAlign: 'center',
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
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  parshaSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginTop: 4,
  },

  // Inspiration Quote Panel
  inspirationPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  inspirationIcon: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  inspirationHebrew: {
    fontFamily: fonts.heading.semibold,
    fontSize: 18,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
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
  omerIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
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
    fontFamily: fonts.heading.bold,
    fontSize: 24,
    color: theme.colors.text.primary,
    marginBottom: spacing.xs,
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
