import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
  ScrollView,
  Alert,
  PanResponder,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { FadeIn } from '../../components/animations/FadeIn';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorView } from '../../components/ui/ErrorView';
import { NotificationBanner } from '../../components/ui/NotificationBanner';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { CalendarEngine } from '../../src/core/calendar/CalendarEngine';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { DailyTehillimTracker } from '../../src/storage/DailyTehillimTracker';
import { HomePanelsService, HomePanel, PANEL_DEFINITIONS } from '../../src/storage/HomePanelsService';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';
import { ZmanimService } from '../../src/core/zmanim/ZmanimService';
import { DayInfo, CalendarContext } from '../../src/types/calendar';
import { CustomReminder } from '../../src/types/preferences';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');
const GRID_COLUMNS = 2;
const GRID_GAP = spacing.sm;
const PANEL_WIDTH = (width - spacing.lg * 2 - GRID_GAP) / GRID_COLUMNS;

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
      // Much gentler shake - slower and smaller rotation
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(rotation, {
            toValue: -1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(rotation, {
            toValue: 0,
            duration: 200,
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
    outputRange: ['-0.5deg', '0deg', '0.5deg'], // Much smaller rotation
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
  const content = (
    <View style={[styles.glassCard, style]}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={60} style={styles.glassBlur}>
          <View style={styles.glassInner}>{children}</View>
        </BlurView>
      ) : (
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
          style={styles.glassBlur}
        >
          <View style={styles.glassInner}>{children}</View>
        </LinearGradient>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
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
  onResize?: (size: 'full' | 'half') => void;
  index: number;
  onDragStart: (index: number) => void;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
  onDragMove: (index: number, y: number) => void;
  isDragging: boolean;
  draggedIndex: number | null;
  panelCount: number;
  isFullWidth?: boolean;
}> = ({ 
  children, 
  isEditing, 
  onRemove,
  onResize,
  index, 
  onDragStart, 
  onDragEnd, 
  onDragMove,
  isDragging,
  draggedIndex,
  panelCount,
  isFullWidth,
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const zIndex = useRef(new Animated.Value(1)).current;
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressed = useRef(false);
  const startY = useRef(0);

  // Check if touch is in the remove button area (top-left corner)
  const isTouchOnRemoveButton = (evt: any) => {
    const { locationX, locationY } = evt.nativeEvent;
    // Remove button is in top-left, roughly 40x40 area from corner
    return locationX < 40 && locationY < 40;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Don't capture if touch is on the remove button
        if (isTouchOnRemoveButton(evt)) {
          return false;
        }
        return isEditing;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (isTouchOnRemoveButton(evt)) {
          return false;
        }
        return isEditing && isLongPressed.current && (Math.abs(gestureState.dy) > 5 || Math.abs(gestureState.dx) > 5);
      },
      onPanResponderGrant: (evt) => {
        // Don't start drag if on remove button
        if (isTouchOnRemoveButton(evt)) {
          return;
        }
        startY.current = evt.nativeEvent.pageY;
        // Start long press timer
        longPressTimer.current = setTimeout(() => {
          isLongPressed.current = true;
          onDragStart(index);
          // Scale up and raise
          Animated.parallel([
            Animated.spring(scale, { toValue: 1.05, useNativeDriver: true }),
            Animated.timing(zIndex, { toValue: 100, duration: 0, useNativeDriver: true }),
          ]).start();
        }, 200); // 200ms hold to start drag
      },
      onPanResponderMove: (evt, gestureState) => {
        if (isLongPressed.current) {
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
          onDragMove(index, evt.nativeEvent.pageY);
        }
      },
      onPanResponderRelease: (evt) => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
        }
        
        if (isLongPressed.current) {
          // Calculate drop position
          const dropY = evt.nativeEvent.pageY;
          const rowHeight = 120; // Approximate panel height
          const newIndex = Math.floor((dropY - 150) / rowHeight);
          const clampedIndex = Math.max(0, Math.min(panelCount - 1, newIndex));
          
          onDragEnd(index, clampedIndex);
        }
        
        isLongPressed.current = false;
        
        // Reset position
        Animated.parallel([
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
          Animated.timing(zIndex, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]).start();
      },
      onPanResponderTerminate: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
        }
        isLongPressed.current = false;
        Animated.parallel([
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  const isBeingDragged = isDragging && draggedIndex === index;
  const shouldDim = isDragging && draggedIndex !== index;

  // Handle remove button press directly without panResponder interference
  const handleRemovePress = () => {
    onRemove();
  };

  return (
    <View style={[
      isFullWidth ? styles.gridItemFull : styles.gridItem,
      { zIndex: isBeingDragged ? 100 : 1 },
    ]}>
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
        {...(isEditing ? panResponder.panHandlers : {})}
      >
        <JiggleView isEditing={isEditing && !isBeingDragged}>
          <View style={styles.editablePanelContainer}>
            {children}
          </View>
        </JiggleView>
      </Animated.View>
      
      {/* Remove button - outside of panResponder to ensure it works */}
      {isEditing && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemovePress}
          activeOpacity={0.7}
        >
          <View style={styles.removeButtonInner}>
            <Text style={styles.removeButtonText}>−</Text>
          </View>
        </TouchableOpacity>
      )}
      
      {/* Resize handle in bottom-right corner */}
      {isEditing && !isFullWidth && (
        <TouchableOpacity
          style={styles.resizeHandle}
          onPress={() => {
            // Toggle between half and full width
            Alert.alert(
              'Resize Panel',
              'Make this panel full width?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Full Width', onPress: () => onResize && onResize('full') },
              ]
            );
          }}
          activeOpacity={0.7}
        >
          <View style={styles.resizeHandleInner}>
            <Text style={styles.resizeHandleText}>⤡</Text>
          </View>
        </TouchableOpacity>
      )}
      
      {isEditing && isFullWidth && (
        <TouchableOpacity
          style={styles.resizeHandle}
          onPress={() => {
            Alert.alert(
              'Resize Panel',
              'Make this panel half width?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Half Width', onPress: () => onResize && onResize('half') },
              ]
            );
          }}
          activeOpacity={0.7}
        >
          <View style={styles.resizeHandleInner}>
            <Text style={styles.resizeHandleText}>⤢</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [dayInfo, setDayInfo] = useState<DayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [panels, setPanels] = useState<HomePanel[]>([]);
  const [customReminders, setCustomReminders] = useState<CustomReminder[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
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
  });

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

  useFocusEffect(
    useCallback(() => {
      loadTehillimProgress();
      loadPanels();
      loadCustomReminders();
    }, [])
  );

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
      toValue: tehillimProgress.percentComplete,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [tehillimProgress.percentComplete]);

  const loadPanels = async () => {
    const loadedPanels = await HomePanelsService.getPanels();
    setPanels(loadedPanels.filter(p => p.visible).sort((a, b) => a.order - b.order));
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
    } catch (err) {
      console.error('Error loading day info:', err);
      setError('Failed to load day information');
    } finally {
      setLoading(false);
    }
  };

  const loadTehillimProgress = async () => {
    const progress = await DailyTehillimTracker.getTodaysProgress();
    const message = await DailyTehillimTracker.getMotivationalMessage();
    setTehillimProgress({
      percentComplete: progress.percentComplete,
      chaptersRemaining: progress.chaptersRemaining,
      totalChapters: progress.totalChapters,
      message,
      dayName: progress.dayName,
      goalType: progress.goalType,
    });
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
    Alert.alert(
      'Remove Panel',
      'Remove this panel from your home screen?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await HomePanelsService.removePanel(panelId);
            loadPanels();
          },
        },
      ]
    );
  };

  const handleResizePanel = async (panelId: string, size: 'full' | 'half') => {
    // Update panel size in storage
    const newSize = size === 'full' ? 'large' : 'small';
    await HomePanelsService.updatePanelSize(panelId, newSize);
    loadPanels();
  };

  // Drag handlers
  const handleDragStart = (index: number) => {
    setIsDragging(true);
    setDraggedIndex(index);
  };

  const handleDragMove = (index: number, y: number) => {
    // Optional: could implement live preview of target position here
  };

  const handleDragEnd = async (fromIndex: number, toIndex: number) => {
    if (fromIndex !== toIndex && toIndex >= 0 && toIndex < panels.length) {
      // Animate the layout change
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      
      const newPanels = [...panels];
      const [movedPanel] = newPanels.splice(fromIndex, 1);
      newPanels.splice(toIndex, 0, movedPanel);
      newPanels.forEach((p, i) => p.order = i);
      
      setPanels(newPanels);
      await HomePanelsService.reorderPanels(newPanels.map(p => p.id));
    }
    
    setIsDragging(false);
    setDraggedIndex(null);
  };

  const formatTime = (date: Date | undefined) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const toggleEditMode = () => {
    if (isEditing) {
      // Exiting edit mode - reset drag state
      setIsDragging(false);
      setDraggedIndex(null);
    }
    setIsEditing(!isEditing);
  };

  // Render individual panel based on type
  const renderPanel = (panel: HomePanel, index: number) => {
    const panelDef = PANEL_DEFINITIONS.find(p => p.type === panel.type);
    
    const panelContent = () => {
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
                  <Text style={styles.tehillimTitle}>{tehillimProgress.dayName || 'Daily'} Tehillim</Text>
                  <Text style={styles.tehillimMessage}>{tehillimProgress.message}</Text>
                </View>
                <View style={styles.tehillimPercentContainer}>
                  <Text style={styles.tehillimPercent}>{tehillimProgress.percentComplete}%</Text>
                </View>
              </View>
              
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBg}>
                  <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
                </View>
              </View>
              
              <View style={styles.tehillimFooter}>
                <View style={styles.tehillimFooterLeft}>
                  <Text style={styles.tehillimFooterText}>
                    {tehillimProgress.totalChapters.length - tehillimProgress.chaptersRemaining.length} of {tehillimProgress.totalChapters.length} chapters
                  </Text>
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
                    {tehillimProgress.percentComplete === 100 ? 'Complete ✓' : 'Continue →'}
                  </Text>
                )}
              </View>
            </GlassCard>
          );

        case 'zmanim':
          if (!dayInfo) return null;
          return (
            <View style={styles.zmanimRow}>
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Sunrise</Text>
                <Text style={styles.zmanTime}>{formatTime(dayInfo.extendedZmanim?.sunrise)}</Text>
              </View>
              <View style={styles.zmanDivider} />
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Sunset</Text>
                <Text style={styles.zmanTime}>{formatTime(dayInfo.extendedZmanim?.sunset)}</Text>
              </View>
              <View style={styles.zmanDivider} />
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Shema</Text>
                <Text style={styles.zmanTime}>{formatTime(dayInfo.extendedZmanim?.sofZmanShemaGRA)}</Text>
              </View>
            </View>
          );

        case 'quick_actions':
          return (
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => !isEditing && navigation.navigate('Calendar' as never)}
                disabled={isEditing}
              >
                <Text style={styles.quickActionIcon}>📅</Text>
                <Text style={styles.quickActionText}>Calendar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => !isEditing && navigation.navigate('Library' as never)}
                disabled={isEditing}
              >
                <Text style={styles.quickActionIcon}>📖</Text>
                <Text style={styles.quickActionText}>Library</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => !isEditing && navigation.navigate('Settings' as never)}
                disabled={isEditing}
              >
                <Text style={styles.quickActionIcon}>⚙️</Text>
                <Text style={styles.quickActionText}>Settings</Text>
              </TouchableOpacity>
            </View>
          );

        case 'davening_note':
          if (!dayInfo || (!dayInfo.daveningChanges.hallel && dayInfo.daveningChanges.tachanun)) {
            return null;
          }
          return (
            <View style={styles.daveningNote}>
              <Text style={styles.daveningNoteText}>
                {dayInfo.daveningChanges.hallel 
                  ? `${dayInfo.daveningChanges.hallel === 'full' ? 'Full' : 'Half'} Hallel today` 
                  : 'No Tachanun today'}
              </Text>
            </View>
          );

        case 'custom_reminders':
          const enabledReminders = customReminders.filter(r => r.enabled);
          return (
            <GlassCard>
              <View style={styles.customRemindersPanel}>
                <View style={styles.customRemindersPanelHeader}>
                  <Text style={styles.customRemindersPanelTitle}>🔔 My Reminders</Text>
                  {!isEditing && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('AddCustomReminder' as never)}
                    >
                      <Text style={styles.customRemindersPanelAdd}>+ Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {enabledReminders.length > 0 ? (
                  enabledReminders.slice(0, 3).map((reminder) => (
                    <View key={reminder.id} style={styles.customReminderPanelItem}>
                      <Text style={styles.customReminderPanelItemTitle}>{reminder.title}</Text>
                      <Text style={styles.customReminderPanelItemTime}>{reminder.time}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.customRemindersPanelEmpty}>
                    No active reminders
                  </Text>
                )}
                {enabledReminders.length > 3 && (
                  <Text style={styles.customRemindersPanelMore}>
                    +{enabledReminders.length - 3} more
                  </Text>
                )}
              </View>
            </GlassCard>
          );

        case 'weekly_parsha':
          if (!dayInfo?.parsha) return null;
          return (
            <GlassCard>
              <View style={styles.parshaPanel}>
                <Text style={styles.parshaLabel}>This Week's Parsha</Text>
                <Text style={styles.parshaName}>{dayInfo.parsha}</Text>
                {dayInfo.parshaHebrew && (
                  <Text style={styles.parshaHebrew}>{dayInfo.parshaHebrew}</Text>
                )}
              </View>
            </GlassCard>
          );

        case 'inspiration_quote':
          const quotes = [
            { text: "אִם אֵין אֲנִי לִי, מִי לִי", translation: "If I am not for myself, who will be for me?", source: "Hillel" },
            { text: "בְּמָקוֹם שֶׁאֵין אֲנָשִׁים, הִשְׁתַּדֵּל לִהְיוֹת אִישׁ", translation: "In a place where there are no leaders, strive to be a leader.", source: "Pirkei Avos" },
            { text: "הֱוֵי מְקַבֵּל אֶת כָּל הָאָדָם בְּסֵבֶר פָּנִים יָפוֹת", translation: "Greet everyone with a cheerful face.", source: "Shammai" },
            { text: "אַל תִּסְתַּכֵּל בַּקַּנְקַן, אֶלָּא בְּמַה שֶּׁיֵּשׁ בּוֹ", translation: "Do not look at the vessel, but at what it contains.", source: "Pirkei Avos" },
            { text: "וְאָהַבְתָּ לְרֵעֲךָ כָּמוֹךָ", translation: "Love your neighbor as yourself.", source: "Vayikra 19:18" },
          ];
          const todayQuote = quotes[new Date().getDay() % quotes.length];
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

        case 'weather':
          return (
            <GlassCard onPress={() => !isEditing && Alert.alert('Weather', 'Location-based weather coming soon!')}>
              <View style={styles.weatherPanel}>
                <Text style={styles.weatherIcon}>🌤️</Text>
                <Text style={styles.weatherTemp}>--°</Text>
                <Text style={styles.weatherDesc}>Tap to enable</Text>
              </View>
            </GlassCard>
          );

        case 'location':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Settings' as never)}>
              <View style={styles.locationPanel}>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationText}>Your Location</Text>
                <Text style={styles.locationSubtext}>For accurate zmanim</Text>
              </View>
            </GlassCard>
          );

        case 'favorites':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Library' as never)}>
              <View style={styles.favoritesPanel}>
                <Text style={styles.favoritesIcon}>⭐</Text>
                <Text style={styles.favoritesTitle}>Favorites</Text>
                <Text style={styles.favoritesSubtext}>Quick access to saved items</Text>
              </View>
            </GlassCard>
          );

        case 'recent':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Library' as never)}>
              <View style={styles.recentPanel}>
                <Text style={styles.recentIcon}>🕐</Text>
                <Text style={styles.recentTitle}>Recently Opened</Text>
                <Text style={styles.recentSubtext}>Continue where you left off</Text>
              </View>
            </GlassCard>
          );

        case 'search':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Library' as never)}>
              <View style={styles.searchPanel}>
                <Text style={styles.searchIcon}>🔍</Text>
                <Text style={styles.searchText}>Quick Search</Text>
              </View>
            </GlassCard>
          );

        // === CALENDAR PANELS ===
        case 'zmanim_full':
          if (!dayInfo) return null;
          return (
            <GlassCard>
              <View style={styles.zmanimFullPanel}>
                <Text style={styles.zmanimFullTitle}>Today's Zmanim</Text>
                <View style={styles.zmanimFullGrid}>
                  <View style={styles.zmanimFullItem}>
                    <Text style={styles.zmanimFullLabel}>Alos</Text>
                    <Text style={styles.zmanimFullTime}>{formatTime(dayInfo.extendedZmanim?.alosHashachar)}</Text>
                  </View>
                  <View style={styles.zmanimFullItem}>
                    <Text style={styles.zmanimFullLabel}>Sunrise</Text>
                    <Text style={styles.zmanimFullTime}>{formatTime(dayInfo.extendedZmanim?.sunrise)}</Text>
                  </View>
                  <View style={styles.zmanimFullItem}>
                    <Text style={styles.zmanimFullLabel}>Shema</Text>
                    <Text style={styles.zmanimFullTime}>{formatTime(dayInfo.extendedZmanim?.sofZmanShemaGRA)}</Text>
                  </View>
                  <View style={styles.zmanimFullItem}>
                    <Text style={styles.zmanimFullLabel}>Shacharis</Text>
                    <Text style={styles.zmanimFullTime}>{formatTime(dayInfo.extendedZmanim?.sofZmanShmoneEsreiGRA)}</Text>
                  </View>
                  <View style={styles.zmanimFullItem}>
                    <Text style={styles.zmanimFullLabel}>Chatzos</Text>
                    <Text style={styles.zmanimFullTime}>{formatTime(dayInfo.extendedZmanim?.chatzos)}</Text>
                  </View>
                  <View style={styles.zmanimFullItem}>
                    <Text style={styles.zmanimFullLabel}>Mincha Gedola</Text>
                    <Text style={styles.zmanimFullTime}>{formatTime(dayInfo.extendedZmanim?.minchaGedola)}</Text>
                  </View>
                  <View style={styles.zmanimFullItem}>
                    <Text style={styles.zmanimFullLabel}>Plag</Text>
                    <Text style={styles.zmanimFullTime}>{formatTime(dayInfo.extendedZmanim?.plagHamincha)}</Text>
                  </View>
                  <View style={styles.zmanimFullItem}>
                    <Text style={styles.zmanimFullLabel}>Sunset</Text>
                    <Text style={styles.zmanimFullTime}>{formatTime(dayInfo.extendedZmanim?.sunset)}</Text>
                  </View>
                  <View style={styles.zmanimFullItem}>
                    <Text style={styles.zmanimFullLabel}>Tzeis</Text>
                    <Text style={styles.zmanimFullTime}>{formatTime(dayInfo.extendedZmanim?.tzeis)}</Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          );

        case 'shabbos_times':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
              <View style={styles.shabbosPanel}>
                <Text style={styles.shabbosIcon}>🕯️</Text>
                <Text style={styles.shabbosTitle}>Shabbos Times</Text>
                <View style={styles.shabbosTimesRow}>
                  <View style={styles.shabbosTimeItem}>
                    <Text style={styles.shabbosTimeLabel}>Candles</Text>
                    <Text style={styles.shabbosTimeValue}>{formatTime(dayInfo?.extendedZmanim?.sunset)}</Text>
                  </View>
                  <View style={styles.shabbosTimeItem}>
                    <Text style={styles.shabbosTimeLabel}>Havdalah</Text>
                    <Text style={styles.shabbosTimeValue}>{formatTime(dayInfo?.extendedZmanim?.tzeis)}</Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          );

        case 'candle_lighting':
          return (
            <GlassCard>
              <View style={styles.candlePanel}>
                <Text style={styles.candleIcon}>🕯️</Text>
                <Text style={styles.candleTitle}>Candle Lighting</Text>
                <Text style={styles.candleTime}>{dayInfo?.extendedZmanim?.candleLighting ? formatTime(dayInfo.extendedZmanim.candleLighting) : 'Friday'}</Text>
              </View>
            </GlassCard>
          );

        case 'havdalah':
          return (
            <GlassCard>
              <View style={styles.havdalahPanel}>
                <Text style={styles.havdalahIcon}>✨</Text>
                <Text style={styles.havdalahTitle}>Havdalah</Text>
                <Text style={styles.havdalahTime}>{formatTime(dayInfo?.extendedZmanim?.tzeis) || 'Motzei Shabbos'}</Text>
              </View>
            </GlassCard>
          );

        case 'omer_counter':
          const omerDay = (dayInfo as any)?.omer;
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
              <View style={styles.omerPanel}>
                <Text style={styles.omerIcon}>🌾</Text>
                <Text style={styles.omerTitle}>Sefiras HaOmer</Text>
                {omerDay ? (
                  <>
                    <Text style={styles.omerDay}>Day {omerDay}</Text>
                    <Text style={styles.omerWeek}>{Math.floor((omerDay - 1) / 7) + 1} weeks, {((omerDay - 1) % 7) + 1} days</Text>
                  </>
                ) : (
                  <Text style={styles.omerInactive}>Not during Omer period</Text>
                )}
              </View>
            </GlassCard>
          );

        case 'rosh_chodesh':
          return (
            <GlassCard>
              <View style={styles.roshChodeshPanel}>
                <Text style={styles.roshChodeshIcon}>🌙</Text>
                <Text style={styles.roshChodeshTitle}>Rosh Chodesh</Text>
                <Text style={styles.roshChodeshText}>{dayInfo?.isRoshChodesh ? 'Today!' : 'Coming soon'}</Text>
              </View>
            </GlassCard>
          );

        case 'upcoming_holidays':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
              <View style={styles.holidaysPanel}>
                <Text style={styles.holidaysIcon}>🎉</Text>
                <Text style={styles.holidaysTitle}>Upcoming</Text>
                <Text style={styles.holidaysText}>View in calendar</Text>
              </View>
            </GlassCard>
          );

        case 'hebrew_birthday':
          return (
            <GlassCard>
              <View style={styles.birthdayPanel}>
                <Text style={styles.birthdayIcon}>🎂</Text>
                <Text style={styles.birthdayTitle}>Hebrew Birthday</Text>
                <Text style={styles.birthdayText}>Set in settings</Text>
              </View>
            </GlassCard>
          );

        case 'yahrzeit':
          return (
            <GlassCard>
              <View style={styles.yahrzeitPanel}>
                <Text style={styles.yahrzeitIcon}>🕯️</Text>
                <Text style={styles.yahrzeitTitle}>Yahrzeits</Text>
                <Text style={styles.yahrzeitText}>Add in settings</Text>
              </View>
            </GlassCard>
          );

        case 'daf_yomi_date':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Library' as never)}>
              <View style={styles.dafPanel}>
                <Text style={styles.dafIcon}>📚</Text>
                <Text style={styles.dafTitle}>Daf Yomi</Text>
                <Text style={styles.dafText}>{(dayInfo as any)?.dafYomi || 'Loading...'}</Text>
              </View>
            </GlassCard>
          );

        case 'nach_yomi':
          return (
            <GlassCard>
              <View style={styles.nachPanel}>
                <Text style={styles.nachIcon}>📖</Text>
                <Text style={styles.nachTitle}>Nach Yomi</Text>
                <Text style={styles.nachText}>Daily Nach</Text>
              </View>
            </GlassCard>
          );

        case 'mishna_yomis':
          return (
            <GlassCard>
              <View style={styles.mishnaPanel}>
                <Text style={styles.mishnaIcon}>📕</Text>
                <Text style={styles.mishnaTitle}>Mishna Yomis</Text>
                <Text style={styles.mishnaText}>Daily Mishna</Text>
              </View>
            </GlassCard>
          );

        case 'halacha_yomis':
          return (
            <GlassCard>
              <View style={styles.halachaPanel}>
                <Text style={styles.halachaIcon}>⚖️</Text>
                <Text style={styles.halachaTitle}>Halacha Yomis</Text>
                <Text style={styles.halachaText}>Daily Halacha</Text>
              </View>
            </GlassCard>
          );

        case 'sunrise_sunset':
          return (
            <GlassCard>
              <View style={styles.sunTimesPanel}>
                <View style={styles.sunTimeItem}>
                  <Text style={styles.sunIcon}>🌅</Text>
                  <Text style={styles.sunLabel}>Sunrise</Text>
                  <Text style={styles.sunTime}>{formatTime(dayInfo?.extendedZmanim?.sunrise)}</Text>
                </View>
                <View style={styles.sunTimeItem}>
                  <Text style={styles.sunIcon}>🌇</Text>
                  <Text style={styles.sunLabel}>Sunset</Text>
                  <Text style={styles.sunTime}>{formatTime(dayInfo?.extendedZmanim?.sunset)}</Text>
                </View>
              </View>
            </GlassCard>
          );

        case 'moon_phase':
          // Extract day number from jewishDateShort (e.g., "15 Nisan" -> 15)
          const jewishDayMatch = dayInfo?.jewishDateShort?.match(/^\d+/);
          const jewishDay = jewishDayMatch ? parseInt(jewishDayMatch[0], 10) : 15;
          const moonEmoji = jewishDay <= 7 ? '🌒' : jewishDay <= 14 ? '🌓' : jewishDay <= 21 ? '🌖' : '🌘';
          return (
            <GlassCard>
              <View style={styles.moonPanel}>
                <Text style={styles.moonIcon}>{moonEmoji}</Text>
                <Text style={styles.moonTitle}>Moon Phase</Text>
                <Text style={styles.moonText}>Day {jewishDay} of month</Text>
              </View>
            </GlassCard>
          );

        case 'mini_calendar':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
              <View style={styles.miniCalPanel}>
                <Text style={styles.miniCalIcon}>🗓️</Text>
                <Text style={styles.miniCalTitle}>This Week</Text>
                <Text style={styles.miniCalText}>View Calendar →</Text>
              </View>
            </GlassCard>
          );

        case 'month_view':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Calendar' as never)}>
              <View style={styles.monthViewPanel}>
                <Text style={styles.monthViewIcon}>📆</Text>
                <Text style={styles.monthViewTitle}>{dayInfo?.jewishDateShort?.split(' ')[1] || 'Month'}</Text>
                <Text style={styles.monthViewText}>Full Month View →</Text>
              </View>
            </GlassCard>
          );

        // === PRAYER PANELS ===
        case 'shacharis':
          return (
            <GlassCard onPress={() => !isEditing && (navigation as any).navigate('SiddurReader', { service: 'shacharis' })}>
              <View style={styles.prayerPanel}>
                <Text style={styles.prayerIcon}>🌅</Text>
                <Text style={styles.prayerTitle}>Shacharis</Text>
                <Text style={styles.prayerSubtext}>Morning Prayers</Text>
              </View>
            </GlassCard>
          );

        case 'mincha':
          return (
            <GlassCard onPress={() => !isEditing && (navigation as any).navigate('SiddurReader', { service: 'mincha' })}>
              <View style={styles.prayerPanel}>
                <Text style={styles.prayerIcon}>☀️</Text>
                <Text style={styles.prayerTitle}>Mincha</Text>
                <Text style={styles.prayerSubtext}>Afternoon Prayers</Text>
              </View>
            </GlassCard>
          );

        case 'maariv':
          return (
            <GlassCard onPress={() => !isEditing && (navigation as any).navigate('SiddurReader', { service: 'maariv' })}>
              <View style={styles.prayerPanel}>
                <Text style={styles.prayerIcon}>🌙</Text>
                <Text style={styles.prayerTitle}>Maariv</Text>
                <Text style={styles.prayerSubtext}>Evening Prayers</Text>
              </View>
            </GlassCard>
          );

        case 'brachos':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Library' as never)}>
              <View style={styles.prayerPanel}>
                <Text style={styles.prayerIcon}>🙏</Text>
                <Text style={styles.prayerTitle}>Brachos</Text>
                <Text style={styles.prayerSubtext}>Blessings Guide</Text>
              </View>
            </GlassCard>
          );

        case 'bentching':
          return (
            <GlassCard onPress={() => !isEditing && (navigation as any).navigate('SiddurReader', { service: 'bentching' })}>
              <View style={styles.prayerPanel}>
                <Text style={styles.prayerIcon}>🍞</Text>
                <Text style={styles.prayerTitle}>Bentching</Text>
                <Text style={styles.prayerSubtext}>Grace After Meals</Text>
              </View>
            </GlassCard>
          );

        case 'bedtime_shema':
          return (
            <GlassCard onPress={() => !isEditing && (navigation as any).navigate('SiddurReader', { service: 'bedtime_shema' })}>
              <View style={styles.prayerPanel}>
                <Text style={styles.prayerIcon}>😴</Text>
                <Text style={styles.prayerTitle}>Bedtime Shema</Text>
                <Text style={styles.prayerSubtext}>Before Sleep</Text>
              </View>
            </GlassCard>
          );

        case 'modeh_ani':
          return (
            <GlassCard onPress={() => !isEditing && (navigation as any).navigate('SiddurReader', { service: 'modeh_ani' })}>
              <View style={styles.prayerPanel}>
                <Text style={styles.prayerIcon}>🌄</Text>
                <Text style={styles.prayerTitle}>Modeh Ani</Text>
                <Text style={styles.prayerSubtext}>Morning Gratitude</Text>
              </View>
            </GlassCard>
          );

        case 'travelers_prayer':
          return (
            <GlassCard onPress={() => !isEditing && (navigation as any).navigate('SiddurReader', { service: 'tefilas_haderech' })}>
              <View style={styles.prayerPanel}>
                <Text style={styles.prayerIcon}>✈️</Text>
                <Text style={styles.prayerTitle}>Tefillas HaDerech</Text>
                <Text style={styles.prayerSubtext}>Traveler's Prayer</Text>
              </View>
            </GlassCard>
          );

        case 'prayer_for_sick':
          return (
            <GlassCard onPress={() => !isEditing && (navigation as any).navigate('SiddurReader', { service: 'mi_shebeirach' })}>
              <View style={styles.prayerPanel}>
                <Text style={styles.prayerIcon}>💝</Text>
                <Text style={styles.prayerTitle}>Mi Shebeirach</Text>
                <Text style={styles.prayerSubtext}>Prayer for Healing</Text>
              </View>
            </GlassCard>
          );

        case 'tehillim_for_sick':
          return (
            <GlassCard onPress={() => !isEditing && handleTehillimPress()}>
              <View style={styles.prayerPanel}>
                <Text style={styles.prayerIcon}>🙏</Text>
                <Text style={styles.prayerTitle}>Tehillim for Sick</Text>
                <Text style={styles.prayerSubtext}>Psalms for Healing</Text>
              </View>
            </GlassCard>
          );

        case 'shema':
          return (
            <GlassCard onPress={() => !isEditing && (navigation as any).navigate('SiddurReader', { service: 'shema' })}>
              <View style={styles.prayerPanel}>
                <Text style={styles.prayerIcon}>✡️</Text>
                <Text style={styles.prayerTitle}>Shema</Text>
                <Text style={styles.prayerSubtext}>Hear O Israel</Text>
              </View>
            </GlassCard>
          );

        case 'asher_yatzar':
          return (
            <GlassCard onPress={() => !isEditing && (navigation as any).navigate('SiddurReader', { service: 'asher_yatzar' })}>
              <View style={styles.prayerPanel}>
                <Text style={styles.prayerIcon}>💧</Text>
                <Text style={styles.prayerTitle}>Asher Yatzar</Text>
                <Text style={styles.prayerSubtext}>Bathroom Blessing</Text>
              </View>
            </GlassCard>
          );

        case 'tefillin_reminder':
          return (
            <GlassCard>
              <View style={styles.reminderPanel}>
                <Text style={styles.reminderIcon}>📿</Text>
                <Text style={styles.reminderTitle}>Tefillin</Text>
                <Text style={styles.reminderText}>Daily Reminder</Text>
              </View>
            </GlassCard>
          );

        case 'tzitzis_check':
          return (
            <GlassCard>
              <View style={styles.reminderPanel}>
                <Text style={styles.reminderIcon}>🧵</Text>
                <Text style={styles.reminderTitle}>Tzitzis Check</Text>
                <Text style={styles.reminderText}>Daily Reminder</Text>
              </View>
            </GlassCard>
          );

        case 'kapitel':
          const userAge = 25; // TODO: Get from settings
          return (
            <GlassCard onPress={() => !isEditing && handleTehillimPress()}>
              <View style={styles.kapitelPanel}>
                <Text style={styles.kapitelIcon}>📖</Text>
                <Text style={styles.kapitelTitle}>Today's Kapitel</Text>
                <Text style={styles.kapitelNumber}>Tehillim {userAge}</Text>
              </View>
            </GlassCard>
          );

        case 'tanya':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Library' as never)}>
              <View style={styles.learningPanel}>
                <Text style={styles.learningIcon}>📕</Text>
                <Text style={styles.learningTitle}>Daily Tanya</Text>
                <Text style={styles.learningText}>Chassidic Wisdom</Text>
              </View>
            </GlassCard>
          );

        case 'chitas':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Library' as never)}>
              <View style={styles.chitasPanel}>
                <Text style={styles.chitasIcon}>📚</Text>
                <Text style={styles.chitasTitle}>Chitas</Text>
                <Text style={styles.chitasText}>Chumash • Tehillim • Tanya</Text>
              </View>
            </GlassCard>
          );

        case 'yehi_ratzon':
          return (
            <GlassCard>
              <View style={styles.intentionPanel}>
                <Text style={styles.intentionIcon}>🌟</Text>
                <Text style={styles.intentionTitle}>Yehi Ratzon</Text>
                <Text style={styles.intentionText}>Daily Intentions</Text>
              </View>
            </GlassCard>
          );

        // === LEARNING PANELS ===
        case 'daf_yomi':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Library' as never)}>
              <View style={styles.learningPanel}>
                <Text style={styles.learningIcon}>📚</Text>
                <Text style={styles.learningTitle}>Daf Yomi</Text>
                <Text style={styles.learningText}>{(dayInfo as any)?.dafYomi || 'Daily Talmud'}</Text>
              </View>
            </GlassCard>
          );

        case 'parsha_summary':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Library' as never)}>
              <View style={styles.learningPanel}>
                <Text style={styles.learningIcon}>📜</Text>
                <Text style={styles.learningTitle}>Parsha Summary</Text>
                <Text style={styles.learningText}>{dayInfo?.parsha || 'This Week'}</Text>
              </View>
            </GlassCard>
          );

        case 'halacha_daily':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Library' as never)}>
              <View style={styles.learningPanel}>
                <Text style={styles.learningIcon}>⚖️</Text>
                <Text style={styles.learningTitle}>Daily Halacha</Text>
                <Text style={styles.learningText}>Learn one halacha</Text>
              </View>
            </GlassCard>
          );

        case 'mussar':
          const mussarQuotes = [
            "Work on yourself first",
            "Guard your tongue",
            "Judge favorably",
            "Be humble",
            "Trust in Hashem",
          ];
          return (
            <GlassCard>
              <View style={styles.mussarPanel}>
                <Text style={styles.mussarIcon}>💎</Text>
                <Text style={styles.mussarTitle}>Daily Mussar</Text>
                <Text style={styles.mussarText}>{mussarQuotes[new Date().getDay() % mussarQuotes.length]}</Text>
              </View>
            </GlassCard>
          );

        case 'pirkei_avos':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Library' as never)}>
              <View style={styles.learningPanel}>
                <Text style={styles.learningIcon}>📖</Text>
                <Text style={styles.learningTitle}>Pirkei Avos</Text>
                <Text style={styles.learningText}>Ethics of the Fathers</Text>
              </View>
            </GlassCard>
          );

        case 'rambam_daily':
          return (
            <GlassCard>
              <View style={styles.learningPanel}>
                <Text style={styles.learningIcon}>📕</Text>
                <Text style={styles.learningTitle}>Rambam Daily</Text>
                <Text style={styles.learningText}>Maimonides Study</Text>
              </View>
            </GlassCard>
          );

        case 'mishnah_berurah':
          return (
            <GlassCard>
              <View style={styles.learningPanel}>
                <Text style={styles.learningIcon}>📗</Text>
                <Text style={styles.learningTitle}>Mishna Berurah</Text>
                <Text style={styles.learningText}>Halacha Study</Text>
              </View>
            </GlassCard>
          );

        case 'chumash_daily':
          return (
            <GlassCard>
              <View style={styles.learningPanel}>
                <Text style={styles.learningIcon}>📜</Text>
                <Text style={styles.learningTitle}>Daily Chumash</Text>
                <Text style={styles.learningText}>Torah with Rashi</Text>
              </View>
            </GlassCard>
          );

        case 'word_of_day':
          const hebrewWords = [
            { word: 'שָׁלוֹם', meaning: 'Peace' },
            { word: 'תּוֹדָה', meaning: 'Thanks' },
            { word: 'אֱמֶת', meaning: 'Truth' },
            { word: 'חֶסֶד', meaning: 'Kindness' },
            { word: 'אֲהָבָה', meaning: 'Love' },
            { word: 'בִּטָּחוֹן', meaning: 'Trust' },
            { word: 'שִׂמְחָה', meaning: 'Joy' },
          ];
          const todayWord = hebrewWords[new Date().getDay()];
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
                <Text style={styles.thoughtText}>Daily insight</Text>
              </View>
            </GlassCard>
          );

        case 'chassidus':
          return (
            <GlassCard>
              <View style={styles.learningPanel}>
                <Text style={styles.learningIcon}>✨</Text>
                <Text style={styles.learningTitle}>Daily Chassidus</Text>
                <Text style={styles.learningText}>Inner teachings</Text>
              </View>
            </GlassCard>
          );

        case 'zohar':
          return (
            <GlassCard>
              <View style={styles.learningPanel}>
                <Text style={styles.learningIcon}>🌟</Text>
                <Text style={styles.learningTitle}>Daily Zohar</Text>
                <Text style={styles.learningText}>Mystical wisdom</Text>
              </View>
            </GlassCard>
          );

        case 'tehillim_meaning':
          return (
            <GlassCard onPress={() => !isEditing && handleTehillimPress()}>
              <View style={styles.learningPanel}>
                <Text style={styles.learningIcon}>📖</Text>
                <Text style={styles.learningTitle}>Tehillim Meaning</Text>
                <Text style={styles.learningText}>Understand the Psalms</Text>
              </View>
            </GlassCard>
          );

        case 'jewish_history':
          return (
            <GlassCard>
              <View style={styles.historyPanel}>
                <Text style={styles.historyIcon}>📜</Text>
                <Text style={styles.historyTitle}>On This Day</Text>
                <Text style={styles.historyText}>Jewish History</Text>
              </View>
            </GlassCard>
          );

        case 'gedolim_story':
          return (
            <GlassCard>
              <View style={styles.storyPanel}>
                <Text style={styles.storyIcon}>👤</Text>
                <Text style={styles.storyTitle}>Gedolim Story</Text>
                <Text style={styles.storyText}>Stories of Great Rabbis</Text>
              </View>
            </GlassCard>
          );

        case 'mitzvah_of_day':
          return (
            <GlassCard>
              <View style={styles.mitzvahPanel}>
                <Text style={styles.mitzvahIcon}>⭐</Text>
                <Text style={styles.mitzvahTitle}>Mitzvah of the Day</Text>
                <Text style={styles.mitzvahText}>Focus on one mitzvah</Text>
              </View>
            </GlassCard>
          );

        case 'middah_of_week':
          const middos = ['Chesed', 'Gevurah', 'Tiferes', 'Netzach', 'Hod', 'Yesod', 'Malchus'];
          return (
            <GlassCard>
              <View style={styles.middahPanel}>
                <Text style={styles.middahIcon}>💪</Text>
                <Text style={styles.middahTitle}>Middah of the Week</Text>
                <Text style={styles.middahText}>{middos[new Date().getDay()]}</Text>
              </View>
            </GlassCard>
          );

        // === PERSONAL PANELS ===
        case 'custom_countdown':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Settings' as never)}>
              <View style={styles.countdownPanel}>
                <Text style={styles.countdownIcon}>⏳</Text>
                <Text style={styles.countdownTitle}>Custom Countdown</Text>
                <Text style={styles.countdownText}>Set up in settings</Text>
              </View>
            </GlassCard>
          );

        case 'gratitude':
          return (
            <GlassCard>
              <View style={styles.gratitudePanel}>
                <Text style={styles.gratitudeIcon}>🙏</Text>
                <Text style={styles.gratitudeTitle}>Daily Gratitude</Text>
                <Text style={styles.gratitudeText}>What are you thankful for?</Text>
              </View>
            </GlassCard>
          );

        case 'journal':
          return (
            <GlassCard>
              <View style={styles.journalPanel}>
                <Text style={styles.journalIcon}>📝</Text>
                <Text style={styles.journalTitle}>Spiritual Journal</Text>
                <Text style={styles.journalText}>Daily reflections</Text>
              </View>
            </GlassCard>
          );

        case 'goals':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Settings' as never)}>
              <View style={styles.goalsPanel}>
                <Text style={styles.goalsIcon}>🎯</Text>
                <Text style={styles.goalsTitle}>Spiritual Goals</Text>
                <Text style={styles.goalsText}>Track your growth</Text>
              </View>
            </GlassCard>
          );

        case 'intentions':
          return (
            <GlassCard>
              <View style={styles.intentionsPanel}>
                <Text style={styles.intentionsIcon}>🌟</Text>
                <Text style={styles.intentionsTitle}>Daily Intentions</Text>
                <Text style={styles.intentionsText}>Set your kavanah</Text>
              </View>
            </GlassCard>
          );

        case 'chesed_tracker':
          return (
            <GlassCard>
              <View style={styles.chesedPanel}>
                <Text style={styles.chesedIcon}>💝</Text>
                <Text style={styles.chesedTitle}>Chesed Tracker</Text>
                <Text style={styles.chesedText}>Log acts of kindness</Text>
              </View>
            </GlassCard>
          );

        case 'prayer_notes':
          return (
            <GlassCard>
              <View style={styles.notesPanel}>
                <Text style={styles.notesIcon}>📋</Text>
                <Text style={styles.notesTitle}>Prayer Notes</Text>
                <Text style={styles.notesText}>Personal tefillos</Text>
              </View>
            </GlassCard>
          );

        case 'names_to_daven':
          return (
            <GlassCard>
              <View style={styles.namesPanel}>
                <Text style={styles.namesIcon}>💕</Text>
                <Text style={styles.namesTitle}>Names to Daven For</Text>
                <Text style={styles.namesText}>People to pray for</Text>
              </View>
            </GlassCard>
          );

        case 'affirmation':
          const affirmations = [
            "I am blessed",
            "Today I grow",
            "Hashem is with me",
            "I can do hard things",
            "I am worthy of love",
          ];
          return (
            <GlassCard>
              <View style={styles.affirmationPanel}>
                <Text style={styles.affirmationIcon}>💪</Text>
                <Text style={styles.affirmationTitle}>Daily Affirmation</Text>
                <Text style={styles.affirmationText}>{affirmations[new Date().getDay() % affirmations.length]}</Text>
              </View>
            </GlassCard>
          );

        case 'mood_tracker':
          return (
            <GlassCard>
              <View style={styles.moodPanel}>
                <Text style={styles.moodIcon}>😊</Text>
                <Text style={styles.moodTitle}>How are you feeling?</Text>
                <View style={styles.moodOptions}>
                  <Text style={styles.moodOption}>😊</Text>
                  <Text style={styles.moodOption}>😐</Text>
                  <Text style={styles.moodOption}>😔</Text>
                </View>
              </View>
            </GlassCard>
          );

        case 'notes':
          return (
            <GlassCard>
              <View style={styles.quickNotesPanel}>
                <Text style={styles.quickNotesIcon}>📝</Text>
                <Text style={styles.quickNotesTitle}>Quick Notes</Text>
                <Text style={styles.quickNotesText}>Jot down thoughts</Text>
              </View>
            </GlassCard>
          );

        case 'bookmarks':
          return (
            <GlassCard onPress={() => !isEditing && navigation.navigate('Library' as never)}>
              <View style={styles.bookmarksPanel}>
                <Text style={styles.bookmarksIcon}>🔖</Text>
                <Text style={styles.bookmarksTitle}>Bookmarks</Text>
                <Text style={styles.bookmarksText}>Saved items</Text>
              </View>
            </GlassCard>
          );

        // === TRACKING PANELS ===
        case 'streak':
          return (
            <GlassCard>
              <View style={styles.streakPanel}>
                <Text style={styles.streakIcon}>🔥</Text>
                <Text style={styles.streakNumber}>0</Text>
                <Text style={styles.streakText}>Day Streak</Text>
              </View>
            </GlassCard>
          );

        case 'tehillim_stats':
          return (
            <GlassCard onPress={() => !isEditing && handleTehillimPress()}>
              <View style={styles.statsPanel}>
                <Text style={styles.statsIcon}>📊</Text>
                <Text style={styles.statsTitle}>Tehillim Stats</Text>
                <Text style={styles.statsText}>{tehillimProgress.percentComplete}% today</Text>
              </View>
            </GlassCard>
          );

        case 'davening_streak':
          return (
            <GlassCard>
              <View style={styles.streakPanel}>
                <Text style={styles.streakIcon}>📈</Text>
                <Text style={styles.streakNumber}>0</Text>
                <Text style={styles.streakText}>Davening Streak</Text>
              </View>
            </GlassCard>
          );

        case 'learning_time':
          return (
            <GlassCard>
              <View style={styles.timePanel}>
                <Text style={styles.timeIcon}>⏱️</Text>
                <Text style={styles.timeTitle}>Learning Time</Text>
                <Text style={styles.timeText}>0 min today</Text>
              </View>
            </GlassCard>
          );

        case 'weekly_summary':
          return (
            <GlassCard>
              <View style={styles.summaryPanel}>
                <Text style={styles.summaryIcon}>📋</Text>
                <Text style={styles.summaryTitle}>Weekly Summary</Text>
                <Text style={styles.summaryText}>View your progress</Text>
              </View>
            </GlassCard>
          );

        case 'monthly_goals':
          return (
            <GlassCard>
              <View style={styles.monthlyPanel}>
                <Text style={styles.monthlyIcon}>🎯</Text>
                <Text style={styles.monthlyTitle}>Monthly Goals</Text>
                <Text style={styles.monthlyText}>Track progress</Text>
              </View>
            </GlassCard>
          );

        case 'mitzvah_counter':
          return (
            <GlassCard>
              <View style={styles.counterPanel}>
                <Text style={styles.counterIcon}>✅</Text>
                <Text style={styles.counterNumber}>0</Text>
                <Text style={styles.counterText}>Mitzvos Today</Text>
              </View>
            </GlassCard>
          );

        case 'brachos_counter':
          return (
            <GlassCard>
              <View style={styles.counterPanel}>
                <Text style={styles.counterIcon}>💯</Text>
                <Text style={styles.counterNumber}>0/100</Text>
                <Text style={styles.counterText}>Brachos</Text>
              </View>
            </GlassCard>
          );

        case 'tzedakah_tracker':
          return (
            <GlassCard>
              <View style={styles.tzedakahPanel}>
                <Text style={styles.tzedakahIcon}>💰</Text>
                <Text style={styles.tzedakahTitle}>Tzedakah</Text>
                <Text style={styles.tzedakahText}>Track giving</Text>
              </View>
            </GlassCard>
          );

        case 'achievements':
          return (
            <GlassCard>
              <View style={styles.achievementsPanel}>
                <Text style={styles.achievementsIcon}>🏆</Text>
                <Text style={styles.achievementsTitle}>Achievements</Text>
                <Text style={styles.achievementsText}>View milestones</Text>
              </View>
            </GlassCard>
          );

        case 'habits':
          return (
            <GlassCard>
              <View style={styles.habitsPanel}>
                <Text style={styles.habitsIcon}>✓</Text>
                <Text style={styles.habitsTitle}>Habit Tracker</Text>
                <Text style={styles.habitsText}>Build good habits</Text>
              </View>
            </GlassCard>
          );

        // === COMMUNITY PANELS ===
        case 'minyan_times':
          return (
            <GlassCard>
              <View style={styles.communityPanel}>
                <Text style={styles.communityIcon}>🏛️</Text>
                <Text style={styles.communityTitle}>Minyan Times</Text>
                <Text style={styles.communityText}>Local schedule</Text>
              </View>
            </GlassCard>
          );

        case 'shul_announcements':
          return (
            <GlassCard>
              <View style={styles.communityPanel}>
                <Text style={styles.communityIcon}>📢</Text>
                <Text style={styles.communityTitle}>Shul News</Text>
                <Text style={styles.communityText}>Announcements</Text>
              </View>
            </GlassCard>
          );

        case 'shiurim':
          return (
            <GlassCard>
              <View style={styles.communityPanel}>
                <Text style={styles.communityIcon}>🎓</Text>
                <Text style={styles.communityTitle}>Shiurim</Text>
                <Text style={styles.communityText}>Upcoming classes</Text>
              </View>
            </GlassCard>
          );

        case 'tehillim_group':
          return (
            <GlassCard>
              <View style={styles.communityPanel}>
                <Text style={styles.communityIcon}>👥</Text>
                <Text style={styles.communityTitle}>Tehillim Group</Text>
                <Text style={styles.communityText}>Say together</Text>
              </View>
            </GlassCard>
          );

        case 'simchas':
          return (
            <GlassCard>
              <View style={styles.communityPanel}>
                <Text style={styles.communityIcon}>🎊</Text>
                <Text style={styles.communityTitle}>Simchas</Text>
                <Text style={styles.communityText}>Celebrations</Text>
              </View>
            </GlassCard>
          );

        case 'chesed_opportunities':
          return (
            <GlassCard>
              <View style={styles.communityPanel}>
                <Text style={styles.communityIcon}>🤝</Text>
                <Text style={styles.communityTitle}>Chesed Opportunities</Text>
                <Text style={styles.communityText}>Ways to help</Text>
              </View>
            </GlassCard>
          );

        case 'dvar_torah_share':
          return (
            <GlassCard>
              <View style={styles.communityPanel}>
                <Text style={styles.communityIcon}>💬</Text>
                <Text style={styles.communityTitle}>Share Dvar Torah</Text>
                <Text style={styles.communityText}>Share insights</Text>
              </View>
            </GlassCard>
          );

        case 'prayer_request':
          return (
            <GlassCard>
              <View style={styles.communityPanel}>
                <Text style={styles.communityIcon}>🙏</Text>
                <Text style={styles.communityTitle}>Prayer Requests</Text>
                <Text style={styles.communityText}>Community prayers</Text>
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

    const content = panelContent();
    if (!content) return null;

    // Determine if panel should be full width - check stored size first, then default types
    const defaultFullWidthTypes = ['date', 'tehillim_progress', 'custom_reminders', 'inspiration_quote', 'fast_day_info', 'zmanim'];
    const isFullWidth = panel.size === 'large' || (panel.size !== 'small' && defaultFullWidthTypes.includes(panel.type));

    return (
      <DraggablePanel
        key={panel.id}
        isEditing={isEditing}
        onRemove={() => handleRemovePanel(panel.id)}
        onResize={(size) => handleResizePanel(panel.id, size)}
        index={index}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragMove={handleDragMove}
        isDragging={isDragging}
        draggedIndex={draggedIndex}
        panelCount={panels.length}
        isFullWidth={isFullWidth}
      >
        {content}
      </DraggablePanel>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
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
          colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
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
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5', '#FAF9F7']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Orbs */}
      <FloatingOrb
        size={180}
        color="rgba(212, 165, 184, 0.2)"
        style={{ top: height * 0.02, left: -60 }}
        duration={5000}
      />
      <FloatingOrb
        size={140}
        color="rgba(165, 196, 212, 0.2)"
        style={{ top: height * 0.15, right: -40 }}
        duration={6000}
      />

      {/* Notification Banner */}
      {!isEditing && (
        <NotificationBanner onSetup={() => navigation.navigate('Settings' as never)} />
      )}

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isEditing || panels.length > 4}
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
              Tap − to remove • Hold & drag to reorder
            </Text>
          </View>
        )}

        {/* Dynamic Panels Grid */}
        <View style={styles.panelsGrid}>
          {panels.map((panel, index) => renderPanel(panel, index))}
        </View>

        {/* Empty State */}
        {panels.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📦</Text>
            <Text style={styles.emptyStateText}>No panels added yet</Text>
            <Text style={styles.emptyStateSubtext}>Tap + to add some</Text>
          </View>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing['2xl'],
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
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  editButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  editButtonText: {
    fontFamily: fonts.body.semibold,
    fontSize: 14,
    color: colors.text.secondary,
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
    color: colors.primary.dark,
    textAlign: 'center',
  },

  // Panels Grid
  panelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: GRID_GAP,
  },
  gridItem: {
    width: PANEL_WIDTH,
  },
  gridItemFull: {
    width: '100%',
  },

  // Editable Panel
  panelAnimatedWrapper: {
    flex: 1,
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
    backgroundColor: colors.semantic.error,
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
  resizeHandle: {
    position: 'absolute',
    bottom: 4,
    right: -6,
    zIndex: 100,
  },
  resizeHandleInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  resizeHandleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
    backgroundColor: colors.primary.main,
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
    bottom: 120,
    right: spacing.lg,
    zIndex: 100,
  },
  floatingAddButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  glassBlur: {
    overflow: 'hidden',
  },
  glassInner: {
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },

  // Date Card
  dateCard: {},
  hebrewDate: {
    fontFamily: fonts.heading.bold,
    fontSize: 26,
    color: colors.text.primary,
    textAlign: 'center',
  },
  dateDivider: {
    width: 40,
    height: 2,
    backgroundColor: colors.primary.main,
    alignSelf: 'center',
    marginVertical: spacing.xs,
    borderRadius: 1,
    opacity: 0.6,
  },
  gregorianDate: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  specialBadge: {
    backgroundColor: colors.primary.main,
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
    color: colors.text.primary,
  },
  tehillimMessage: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.primary.dark,
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
    backgroundColor: colors.primary.main,
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
    color: colors.text.tertiary,
  },
  tehillimEdit: {
    fontFamily: fonts.body.medium,
    fontSize: 11,
    color: colors.secondary.dark,
    textDecorationLine: 'underline',
  },
  tehillimContinue: {
    fontFamily: fonts.body.semibold,
    fontSize: 12,
    color: colors.primary.main,
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
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  zmanTime: {
    fontFamily: fonts.body.semibold,
    fontSize: 15,
    color: colors.text.primary,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  quickActionIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  quickActionText: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.primary.dark,
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
    color: colors.text.secondary,
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
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.tertiary,
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
    color: colors.text.primary,
  },
  customRemindersPanelAdd: {
    fontFamily: fonts.body.semibold,
    fontSize: 14,
    color: colors.primary.main,
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
    color: colors.text.primary,
  },
  customReminderPanelItemTime: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
  },
  customRemindersPanelEmpty: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  customRemindersPanelMore: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.text.tertiary,
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
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  parshaName: {
    fontFamily: fonts.heading.semibold,
    fontSize: 16,
    color: colors.text.primary,
  },
  parshaHebrew: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
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
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  inspirationTranslation: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  inspirationSource: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.text.tertiary,
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
    color: colors.text.primary,
  },
  fastDaySubtitle: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.primary.dark,
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
    backgroundColor: colors.primary.main,
    borderRadius: 6,
  },
  fastProgressPercent: {
    fontFamily: fonts.body.bold,
    fontSize: 14,
    color: colors.primary.dark,
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
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  fastTimeValue: {
    fontFamily: fonts.body.semibold,
    fontSize: 15,
    color: colors.text.primary,
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
    color: colors.semantic.success,
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
    color: colors.text.primary,
    textAlign: 'center',
  },
  genericText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  greetingSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },

  // Weather Panel
  weatherPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  weatherIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  weatherTemp: {
    fontFamily: fonts.heading.bold,
    fontSize: 22,
    color: colors.text.primary,
  },
  weatherDesc: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.text.tertiary,
  },

  // Location Panel
  locationPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  locationIcon: {
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  locationText: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: colors.text.primary,
  },
  locationSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },

  // Favorites Panel
  favoritesPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  favoritesIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  favoritesTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: colors.text.primary,
  },
  favoritesSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },

  // Recent Panel
  recentPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  recentIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  recentTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: colors.text.primary,
  },
  recentSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },

  // Search Panel
  searchPanel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  searchIcon: {
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  searchText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.text.secondary,
  },

  // Full Zmanim Panel
  zmanimFullPanel: {
    paddingVertical: spacing.xs,
  },
  zmanimFullTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  zmanimFullGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  zmanimFullItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  zmanimFullLabel: {
    fontFamily: fonts.body.regular,
    fontSize: 10,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  zmanimFullTime: {
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    color: colors.text.primary,
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
    color: colors.text.primary,
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
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  shabbosTimeValue: {
    fontFamily: fonts.body.semibold,
    fontSize: 14,
    color: colors.text.primary,
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
    color: colors.text.tertiary,
  },
  candleTime: {
    fontFamily: fonts.heading.semibold,
    fontSize: 16,
    color: colors.text.primary,
    marginTop: 2,
  },

  // Havdalah Panel
  havdalahPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  havdalahIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  havdalahTitle: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.text.tertiary,
  },
  havdalahTime: {
    fontFamily: fonts.heading.semibold,
    fontSize: 16,
    color: colors.text.primary,
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
    color: colors.text.primary,
  },
  omerDay: {
    fontFamily: fonts.heading.bold,
    fontSize: 22,
    color: colors.primary.dark,
    marginTop: 4,
  },
  omerWeek: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  omerInactive: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.tertiary,
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
    color: colors.text.primary,
  },
  roshChodeshText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Upcoming Holidays Panel
  holidaysPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  holidaysIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  holidaysTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: colors.text.primary,
  },
  holidaysText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  birthdayText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  yahrzeitText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  dafText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
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
    color: colors.text.primary,
  },
  nachText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  mishnaText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  halachaText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  sunTime: {
    fontFamily: fonts.body.semibold,
    fontSize: 14,
    color: colors.text.primary,
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
    color: colors.text.primary,
  },
  moonText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  miniCalText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.primary.main,
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
    color: colors.text.primary,
  },
  monthViewText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.primary.main,
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
    color: colors.text.primary,
  },
  prayerSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.text.tertiary,
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
    color: colors.text.primary,
  },
  reminderText: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.text.tertiary,
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
    color: colors.text.tertiary,
  },
  kapitelNumber: {
    fontFamily: fonts.heading.semibold,
    fontSize: 16,
    color: colors.text.primary,
    marginTop: 2,
  },

  // Learning Panel (Generic for all learning)
  learningPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  learningIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  learningTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: colors.text.primary,
  },
  learningText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
    textAlign: 'center',
  },

  // Chitas Panel
  chitasPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  chitasIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  chitasTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 15,
    color: colors.text.primary,
  },
  chitasText: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },

  // Intention Panel
  intentionPanel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  intentionIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  intentionTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 14,
    color: colors.text.primary,
  },
  intentionText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
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
    color: colors.text.primary,
  },
  mussarText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.primary.dark,
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
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  wordMeaning: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  thoughtText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  historyText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  storyText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
    textAlign: 'center',
  },
  mitzvahText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.tertiary,
  },
  middahText: {
    fontFamily: fonts.heading.semibold,
    fontSize: 16,
    color: colors.text.primary,
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
    color: colors.text.primary,
  },
  countdownText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  gratitudeText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  journalText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  goalsText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  intentionsText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  chesedText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  notesText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
    textAlign: 'center',
  },
  namesText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.tertiary,
  },
  affirmationText: {
    fontFamily: fonts.heading.semibold,
    fontSize: 15,
    color: colors.text.primary,
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
    color: colors.text.primary,
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
    color: colors.text.primary,
  },
  quickNotesText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  bookmarksText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.primary.dark,
  },
  streakText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.tertiary,
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
    color: colors.text.primary,
  },
  statsText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.primary.main,
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
    color: colors.text.primary,
  },
  timeText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  summaryText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  monthlyText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.primary.dark,
  },
  counterText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.tertiary,
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
    color: colors.text.primary,
  },
  tzedakahText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  achievementsText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  habitsText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.primary,
    textAlign: 'center',
  },
  communityText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
