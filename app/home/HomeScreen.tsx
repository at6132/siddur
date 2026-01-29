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
import { DayInfo, CalendarContext } from '../../src/types/calendar';

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

// Jiggle Animation Component for Edit Mode
const JiggleView: React.FC<{
  children: React.ReactNode;
  isEditing: boolean;
  style?: any;
}> = ({ children, isEditing, style }) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isEditing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotation, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(rotation, {
            toValue: -1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(rotation, {
            toValue: 0,
            duration: 100,
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
    outputRange: ['-1.5deg', '0deg', '1.5deg'],
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

// Editable Panel Wrapper
const EditablePanel: React.FC<{
  children: React.ReactNode;
  isEditing: boolean;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}> = ({ children, isEditing, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) => {
  return (
    <JiggleView isEditing={isEditing}>
      <View style={styles.editablePanelContainer}>
        {children}
        
        {isEditing && (
          <>
            {/* Remove Button */}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={onRemove}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.removeButtonInner}>
                <Text style={styles.removeButtonText}>−</Text>
              </View>
            </TouchableOpacity>

            {/* Reorder Buttons */}
            <View style={styles.reorderButtons}>
              {canMoveUp && (
                <TouchableOpacity style={styles.reorderButton} onPress={onMoveUp}>
                  <Text style={styles.reorderButtonText}>▲</Text>
                </TouchableOpacity>
              )}
              {canMoveDown && (
                <TouchableOpacity style={styles.reorderButton} onPress={onMoveDown}>
                  <Text style={styles.reorderButtonText}>▼</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    </JiggleView>
  );
};

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [dayInfo, setDayInfo] = useState<DayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [panels, setPanels] = useState<HomePanel[]>([]);
  const [tehillimProgress, setTehillimProgress] = useState({
    percentComplete: 0,
    chaptersRemaining: [] as number[],
    totalChapters: [] as number[],
    message: '',
    dayName: '',
    goalType: 'weekly' as string,
  });

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadDayInfo();
    loadPanels();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTehillimProgress();
      loadPanels();
    }, [])
  );

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
      navigation.navigate('TehillimReader' as never, { psalm: nextChapter } as never);
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

  const handleMovePanel = async (index: number, direction: 'up' | 'down') => {
    const newPanels = [...panels];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= panels.length) return;
    
    [newPanels[index], newPanels[targetIndex]] = [newPanels[targetIndex], newPanels[index]];
    newPanels.forEach((p, i) => p.order = i);
    
    setPanels(newPanels);
    await HomePanelsService.reorderPanels(newPanels.map(p => p.id));
  };

  const formatTime = (date: Date | undefined) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const toggleEditMode = () => {
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
                <Text style={styles.zmanTime}>{formatTime(dayInfo.zmanim.sunrise)}</Text>
              </View>
              <View style={styles.zmanDivider} />
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Sunset</Text>
                <Text style={styles.zmanTime}>{formatTime(dayInfo.zmanim.sunset)}</Text>
              </View>
              <View style={styles.zmanDivider} />
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Shema</Text>
                <Text style={styles.zmanTime}>{formatTime(dayInfo.extendedZmanim?.sofZmanShma)}</Text>
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

    return (
      <EditablePanel
        key={panel.id}
        isEditing={isEditing}
        onRemove={() => handleRemovePanel(panel.id)}
        onMoveUp={() => handleMovePanel(index, 'up')}
        onMoveDown={() => handleMovePanel(index, 'down')}
        canMoveUp={index > 0}
        canMoveDown={index < panels.length - 1}
      >
        {content}
      </EditablePanel>
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
              Tap − to remove • Use arrows to reorder
            </Text>
          </View>
        )}

        {/* Dynamic Panels */}
        {panels.map((panel, index) => renderPanel(panel, index))}

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
    fontFamily: fonts.body.semiBold,
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

  // Editable Panel
  editablePanelContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    left: -8,
    zIndex: 10,
  },
  removeButtonInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.semantic.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
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
    fontFamily: fonts.body.semiBold,
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
    fontFamily: fonts.heading.semiBold,
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
    fontFamily: fonts.body.semiBold,
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
    fontFamily: fonts.body.semiBold,
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
    fontFamily: fonts.heading.semiBold,
    fontSize: 18,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.tertiary,
  },
});
