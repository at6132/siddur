import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FadeIn } from '../../components/animations/FadeIn';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles, fonts } from '../../src/design/typography';
import { CalendarEngine } from '../../src/core/calendar/CalendarEngine';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';
import { ZmanimService } from '../../src/core/zmanim/ZmanimService';
import { ExtendedZmanim } from '../../src/types/calendar';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { LocationRefreshService } from '../../src/services/LocationRefreshService';
import { LOCATION_REQUIRED_MESSAGE, requestLocationFromUser } from '../../src/services/LocationAccess';
import { DayInfo, CalendarContext } from '../../src/types/calendar';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';
import * as Haptics from 'expo-haptics';
import { BrandGlassTile } from '../../components/ui/BrandGlassTile';

const { width } = Dimensions.get('window');
const CELL_GAP = spacing.sm; // spacing between days
const ROW_HEIGHT = 64; // height of each day row
const GRID_PADDING_V = spacing.sm; // vertical padding inside the white box

interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  hebrewDate: string;
  isToday: boolean;
  isShabbos: boolean;
  isYomTov: boolean;
  isRoshChodesh: boolean;
  isFastDay: boolean;
  specialDay?: string;
  dayInfo?: DayInfo;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];

export const CalendarScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation();
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [selectedDayZmanim, setSelectedDayZmanim] = useState<ExtendedZmanim | null>(null);
  const [loading, setLoading] = useState(true);
  const [zmanimLoading, setZmanimLoading] = useState(false);
  const [context, setContext] = useState<CalendarContext | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    loadContext();
  }, []);

  useEffect(() => {
    if (context) {
      loadCalendar();
    }
  }, [currentMonth, context]);

  useEffect(() => {
    if (currentLocation && selectedDay) {
      loadZmanimForDay(selectedDay);
    }
  }, [currentLocation]);

  const loadContext = async () => {
    const preferences = await UserPreferencesService.getPreferences();
    const refreshed = await LocationRefreshService.refreshAndSave();
    const currentLocation = refreshed ?? preferences?.location ?? null;

    setCurrentLocation(currentLocation);

    if (preferences) {
      setContext({
        nusach: preferences.nusach,
        location: currentLocation ?? undefined,
        isIsrael: false,
      });
    } else {
      setContext({
        nusach: 'ashkenaz',
        location: currentLocation ?? undefined,
        isIsrael: false,
      });
    }
  };

  const loadCalendar = async () => {
    if (!context) return;
    setLoading(true);

    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      const calendarDays: CalendarDay[] = [];

      // Add empty slots for days before the 1st
      for (let i = 0; i < startingDayOfWeek; i++) {
        calendarDays.push({
          date: new Date(year, month, -(startingDayOfWeek - i - 1)),
          dayOfMonth: 0,
          hebrewDate: '',
          isToday: false,
          isShabbos: false,
          isYomTov: false,
          isRoshChodesh: false,
          isFastDay: false,
        });
      }

      // Add actual days
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isToday = date.toDateString() === new Date().toDateString();
        const dayOfWeek = date.getDay();
        
        // Get Jewish calendar info
        const jewishDate = JewishCalendarService.getJewishDate(date);
        const hebrewDayNum = jewishDate.getDate(); // Use getDate() method
        const hebrewDate = JewishCalendarService.numberToHebrew(hebrewDayNum);
        const isShabbos = dayOfWeek === 6;
        const isYomTov = JewishCalendarService.isYomTov(date);
        const isRoshChodesh = JewishCalendarService.isRoshChodesh(date);
        const isFastDay = JewishCalendarService.isFastDay(date);
        const holiday = JewishCalendarService.getHoliday(date);
        const specialDay = holiday || undefined;

        calendarDays.push({
          date,
          dayOfMonth: day,
          hebrewDate,
          isToday,
          isShabbos,
          isYomTov,
          isRoshChodesh,
          isFastDay,
          specialDay,
        });
      }

      setDays(calendarDays);
      
      // Auto-select today if it's in the current month and nothing is selected yet
      const today = calendarDays.find(d => d.isToday);
      if (today && !selectedDay) {
        setSelectedDay(today);
        // Also load zmanim for today
        loadZmanimForDay(today);
      }
    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to load zmanim for a day
  const handleAllowLocation = async () => {
    const granted = await requestLocationFromUser();
    if (granted) {
      await loadContext();
    }
  };

  const loadZmanimForDay = async (day: CalendarDay) => {
    setZmanimLoading(true);
    try {
      let location = currentLocation;
      
      const locationObj = location
        ? {
            coords: {
              latitude: location.latitude,
              longitude: location.longitude,
              altitude: null,
              accuracy: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          }
        : null;

      const zmanim = await ZmanimService.calculateExtendedZmanim(day.date, locationObj);
      setSelectedDayZmanim(zmanim);
    } catch (error) {
      console.error('Error loading zmanim:', error);
    } finally {
      setZmanimLoading(false);
    }
  };

  const handleDayPress = async (day: CalendarDay) => {
    if (day.dayOfMonth === 0) return;
    void Haptics.selectionAsync();

    if (selectedDay?.date.getTime() === day.date.getTime()) {
      // Clicking same day - deselect
      setSelectedDay(null);
      setSelectedDayZmanim(null);
    } else {
      // Select new day and load zmanim
      setSelectedDay(day);
      setSelectedDayZmanim(null);
      loadZmanimForDay(day);
    }
  };

  const navigateMonth = (direction: number) => {
    void Haptics.selectionAsync();
    setSelectedDay(null);
    setSelectedDayZmanim(null);
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  };

  const getDayStyle = (day: CalendarDay) => {
    if (day.dayOfMonth === 0) return styles.emptyDay;
    
    const dayStyles = [styles.day];
    if (day.isToday) dayStyles.push(styles.todayDay);
    if (day.isShabbos) dayStyles.push(styles.shabbosDay);
    if (day.isYomTov) dayStyles.push(styles.yomTovDay);
    if (day.isFastDay) dayStyles.push(styles.fastDay);
    if (day.isRoshChodesh) dayStyles.push(styles.roshChodeshDay);
    if (selectedDay?.date.getTime() === day.date.getTime()) dayStyles.push(styles.selectedDay);
    
    return dayStyles;
  };

  const [fadeAnim] = useState(new Animated.Value(0));
  
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const formatZmanTime = (date: Date | null | undefined) => {
    return ZmanimService.formatTime(date);
  };

  const hebrewMonthName = () => {
    if (days.length === 0) return '';
    const midMonth = days.find(d => d.dayOfMonth === 15);
    if (midMonth) {
      const jewishDate = JewishCalendarService.getJewishDate(midMonth.date);
      return jewishDate.monthName;
    }
    return '';
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.backgroundGradient}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.calendarCenterWrapper}>
          {/* Month Header */}
          <FadeIn delay={0}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
                <Text style={styles.navButtonText}>‹</Text>
              </TouchableOpacity>
              <View style={styles.monthContainer}>
                <Text style={styles.monthTitle}>
                  {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </Text>
                <Text style={styles.hebrewMonth}>{hebrewMonthName()}</Text>
              </View>
              <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
                <Text style={styles.navButtonText}>›</Text>
              </TouchableOpacity>
            </View>
          </FadeIn>

          {/* Weekday Headers */}
          <FadeIn delay={50}>
            <View style={styles.weekdayHeader}>
              {WEEKDAYS.map((day, index) => (
                <View key={day} style={styles.weekdayCell}>
                  <Text style={[
                    styles.weekdayText,
                    index === 6 && styles.shabbosText
                  ]}>
                    {day}
                  </Text>
                </View>
              ))}
            </View>
          </FadeIn>

          {/* Calendar Grid - only render rows that have days */}
          <FadeIn delay={100}>
            <View style={styles.calendarGrid}>
              {(() => {
                // Calculate how many rows we actually need
                const totalRows = Math.ceil(days.length / 7);
                return Array.from({ length: totalRows }, (_, weekIndex) => {
                  const weekDays = days.slice(weekIndex * 7, weekIndex * 7 + 7);
                  const isLastRow = weekIndex === totalRows - 1;
                  return (
                    <View key={weekIndex} style={[styles.weekRow, isLastRow && styles.weekRowLast]}>
                      {Array.from({ length: 7 }, (_, dayIndex) => {
                        const day = weekDays[dayIndex];
                        if (!day) {
                          // Empty cell at the end of the last row
                          return <View key={dayIndex} style={[styles.day, styles.emptyDay, styles.dayCell]} />;
                        }
                        return (
                          <TouchableOpacity
                            key={dayIndex}
                            style={[getDayStyle(day), styles.dayCell]}
                            onPress={() => handleDayPress(day)}
                            disabled={day.dayOfMonth === 0}
                            activeOpacity={0.7}
                          >
                            {day.dayOfMonth > 0 && (
                              <>
                                <Text style={[
                                  styles.dayNumber,
                                  day.isToday && styles.todayText,
                                  day.isShabbos && styles.shabbosText,
                                  day.isYomTov && styles.yomTovText,
                                  day.isFastDay && styles.fastDayText,
                                ]}>
                                  {day.dayOfMonth}
                                </Text>
                                <Text style={styles.hebrewDay}>{day.hebrewDate}</Text>
                                {day.specialDay && (
                                  <View style={styles.specialIndicator}>
                                    <Text style={styles.specialDot}>
                                      {day.isYomTov ? '✡' : day.isFastDay ? '◐' : day.isRoshChodesh ? '◑' : '•'}
                                    </Text>
                                  </View>
                                )}
                              </>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                });
              })()}
            </View>
          </FadeIn>

          {/* Legend */}
          <FadeIn delay={150}>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.primary.main }]} />
                <Text style={styles.legendText}>Today</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.accent.gold }]} />
                <Text style={styles.legendText}>Shabbos</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.secondary.main }]} />
                <Text style={styles.legendText}>Yom Tov</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.semantic.error }]} />
                <Text style={styles.legendText}>Fast</Text>
              </View>
            </View>
          </FadeIn>
        </View>

        {/* Selected Day Details - below calendar, scroll to see */}
        {selectedDay && (
          <FadeIn delay={0}>
            <View style={styles.detailsCard}>
              {Platform.OS !== 'web' ? (
                <BlurView intensity={80} tint={theme.isDark ? 'dark' : 'light'} style={styles.detailsBlur}>
                  <View style={styles.detailsContent}>
                    {renderDayDetails()}
                  </View>
                </BlurView>
              ) : (
                <LinearGradient
                  colors={theme.isDark ? ['rgba(24,22,38,0.95)', 'rgba(20,18,32,0.9)'] : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                  style={styles.detailsBlur}
                >
                  <View style={styles.detailsContent}>
                    {renderDayDetails()}
                  </View>
                </LinearGradient>
              )}
            </View>
          </FadeIn>
        )}

        <FadeIn delay={selectedDay ? 40 : 0}>
          <View style={styles.featureCard}>
            <BrandGlassTile
              title="Shabbos alarm"
              subtitle="Morning ring on Shabbos"
              icon="alarm-outline"
              tint="rose"
              onPress={() =>
                (navigation as any).navigate('Settings', { scrollTo: 'shabbosAlarm' })
              }
            />
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  );

  function renderDayDetails() {
    if (!selectedDay) return null;

    const jewishDate = JewishCalendarService.getJewishDate(selectedDay.date);
    
    return (
      <>
        {/* Day Header */}
        <View style={styles.detailsHeader}>
          <Text style={styles.detailsTitle}>
            {selectedDay.date.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
          <Text style={styles.detailsHebrewDate}>
            {jewishDate.day} {jewishDate.monthName} {jewishDate.year}
          </Text>
          {selectedDay.specialDay && (
            <View style={styles.specialBadge}>
              <Text style={styles.specialBadgeText}>{selectedDay.specialDay}</Text>
            </View>
          )}
        </View>

        {/* Status Tags */}
        <View style={styles.tagsRow}>
          {selectedDay.isShabbos && (
            <View style={[styles.tag, styles.shabbosTag]}>
              <Text style={styles.tagText}>Shabbos</Text>
            </View>
          )}
          {selectedDay.isYomTov && (
            <View style={[styles.tag, styles.yomTovTag]}>
              <Text style={styles.tagText}>Yom Tov</Text>
            </View>
          )}
          {selectedDay.isRoshChodesh && !selectedDay.specialDay?.startsWith('Rosh Chodesh') && (
            <View style={[styles.tag, styles.roshChodeshTag]}>
              <Text style={styles.tagText}>Rosh Chodesh</Text>
            </View>
          )}
          {selectedDay.isFastDay && (
            <View style={[styles.tag, styles.fastTag]}>
              <Text style={styles.tagText}>Fast Day</Text>
            </View>
          )}
        </View>

        {/* Zmanim */}
        {zmanimLoading ? (
          <View style={styles.zmanimLoading}>
            <ActivityIndicator size="small" color={theme.colors.primary.main} />
            <Text style={styles.zmanimLoadingText}>Loading zmanim...</Text>
          </View>
        ) : selectedDayZmanim && (
          <View style={styles.zmanimSection}>
            <Text style={styles.zmanimTitle}>Zmanim</Text>
            {!currentLocation ? (
              <TouchableOpacity onPress={handleAllowLocation} activeOpacity={0.7}>
                <Text style={styles.zmanimRequired}>
                  {LOCATION_REQUIRED_MESSAGE}
                </Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.zmanimGrid}>
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Alos</Text>
                <Text style={styles.zmanTime}>{formatZmanTime(selectedDayZmanim.alosHashachar)}</Text>
              </View>
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Sunrise</Text>
                <Text style={styles.zmanTime}>{formatZmanTime(selectedDayZmanim.sunrise)}</Text>
              </View>
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Latest Shema</Text>
                <Text style={styles.zmanTime}>{formatZmanTime(selectedDayZmanim.sofZmanShemaGRA)}</Text>
              </View>
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Latest Shacharis</Text>
                <Text style={styles.zmanTime}>{formatZmanTime(selectedDayZmanim.sofZmanShmoneEsreiGRA)}</Text>
              </View>
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Chatzos</Text>
                <Text style={styles.zmanTime}>{formatZmanTime(selectedDayZmanim.chatzos)}</Text>
              </View>
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Mincha Gedola</Text>
                <Text style={styles.zmanTime}>{formatZmanTime(selectedDayZmanim.minchaGedola)}</Text>
              </View>
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Plag</Text>
                <Text style={styles.zmanTime}>{formatZmanTime(selectedDayZmanim.plagHamincha)}</Text>
              </View>
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Sunset</Text>
                <Text style={styles.zmanTime}>{formatZmanTime(selectedDayZmanim.sunset)}</Text>
              </View>
              <View style={styles.zmanItem}>
                <Text style={styles.zmanLabel}>Tzeis</Text>
                <Text style={styles.zmanTime}>{formatZmanTime(selectedDayZmanim.tzeis)}</Text>
              </View>
            </View>
          </View>
        )}
        {!zmanimLoading && !selectedDayZmanim && selectedDay && (
          <TouchableOpacity
            style={styles.zmanimLoading}
            onPress={currentLocation ? undefined : handleAllowLocation}
            activeOpacity={currentLocation ? 1 : 0.7}
            disabled={!!currentLocation}
          >
            <Text style={styles.zmanimLoadingText}>
              {currentLocation ? 'Tap to load zmanim' : LOCATION_REQUIRED_MESSAGE}
            </Text>
          </TouchableOpacity>
        )}
      </>
    );
  }
};

function createCalendarStyles(theme: AppTheme) {
  return {
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.lg + spacing.safeTopInset,
    paddingBottom: 120,
    gap: spacing.md,
  },
  calendarCenterWrapper: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: theme.isDark ? 'rgba(30,30,45,0.9)' : 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.isDark ? 0.45 : 0.25,
    shadowRadius: theme.isDark ? 10 : 8,
    elevation: 3,
  },
  navButtonText: {
    fontSize: 24,
    color: theme.colors.text.secondary,
  },
  monthContainer: {
    alignItems: 'center',
  },
  monthTitle: {
    fontFamily: fonts.heading.bold,
    fontSize: 22,
    color: theme.colors.text.primary,
  },
  hebrewMonth: {
    fontFamily: fonts.hebrew.medium,
    fontSize: 12,
    color: theme.colors.text.secondary,
    letterSpacing: 0,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: CELL_GAP,
    paddingHorizontal: spacing.xs,
  },
  weekdayCell: {
    flex: 1,
    marginHorizontal: CELL_GAP / 2,
    alignItems: 'center',
  },
  weekdayText: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: theme.colors.text.tertiary,
    letterSpacing: 0.5,
  },
  shabbosText: {
    color: theme.colors.primary.main,
  },
  calendarGrid: {
    backgroundColor: theme.isDark ? 'rgba(20,20,35,0.85)' : 'rgba(255,255,255,0.65)',
    borderRadius: borderRadius.xl,
    paddingTop: GRID_PADDING_V,
    paddingBottom: GRID_PADDING_V,
    paddingHorizontal: spacing.xs,
    shadowColor: theme.colors.shadow.medium,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: theme.isDark ? 0.4 : 0.2,
    shadowRadius: theme.isDark ? 20 : 12,
  },
  weekRow: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    marginBottom: CELL_GAP,
  },
  weekRowLast: {
    marginBottom: 0,
  },
  dayCell: {
    flex: 1,
    marginHorizontal: CELL_GAP / 2,
  },
  day: {
    height: ROW_HEIGHT,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
    backgroundColor: theme.isDark ? 'rgba(35,35,55,0.8)' : 'rgba(255,255,255,0.55)',
  },
  emptyDay: {
    height: ROW_HEIGHT,
    borderRadius: borderRadius.lg,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  selectedDay: {
    borderColor: theme.colors.primary.main,
    borderWidth: 2,
    shadowColor: theme.colors.primary.main,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  todayDay: {
    borderColor: theme.colors.primary.dark,
  },
  yomTovDay: {
    backgroundColor: theme.isDark ? 'rgba(120,160,190,0.25)' : 'rgba(165, 196, 212, 0.25)',
  },
  fastDay: {
    backgroundColor: theme.isDark ? 'rgba(212,165,165,0.3)' : 'rgba(212, 165, 165, 0.25)',
  },
  roshChodeshDay: {
    borderStyle: 'dashed',
    borderColor: theme.colors.primary.main,
  },
  dayNumber: {
    fontFamily: fonts.heading.bold,
    fontSize: 20,
    color: theme.colors.text.primary,
  },
  hebrewDay: {
    fontFamily: fonts.hebrew.medium,
    fontSize: 11,
    color: theme.colors.text.secondary,
    letterSpacing: 0,
    marginTop: 2,
  },
  specialIndicator: {
    marginTop: spacing.xs,
  },
  specialDot: {
    fontSize: 12,
    color: theme.colors.primary.main,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    backgroundColor: theme.isDark ? 'rgba(25,25,40,0.9)' : 'rgba(255,255,255,0.7)',
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    shadowColor: theme.colors.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.isDark ? 0.35 : 0.15,
    shadowRadius: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  detailsCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    backgroundColor: theme.isDark ? 'rgba(20,20,32,0.92)' : 'rgba(255,255,255,0.75)',
    shadowColor: theme.colors.shadow.dark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: theme.isDark ? 0.4 : 0.15,
    shadowRadius: 24,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)',
  },
  detailsHeader: {
    alignItems: 'center',
    marginBottom: 0,
  },
  detailsTitle: {
    fontFamily: fonts.heading.bold,
    fontSize: 18,
    color: theme.colors.text.primary,
    marginBottom: 0,
  },
  detailsHebrewDate: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 0,
  },
  detailsBlur: {
    overflow: 'hidden' as const,
    borderRadius: borderRadius['2xl'],
  },
  detailsContent: {
    padding: spacing.sm,
    paddingTop: 0,
    paddingBottom: 0,
  },
  todayText: {
    color: theme.colors.primary.main,
  },
  yomTovText: {
    color: theme.colors.primary.dark,
  },
  fastDayText: {
    color: theme.colors.semantic.error,
  },
  specialBadge: {
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  specialBadgeText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 12,
    color: theme.colors.text.inverse,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: 0,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontFamily: fonts.body.medium,
    fontSize: 11,
    color: theme.colors.text.inverse,
  },
  shabbosTag: {
    backgroundColor: theme.colors.accent.gold,
  },
  yomTovTag: {
    backgroundColor: theme.colors.secondary.main,
  },
  roshChodeshTag: {
    backgroundColor: theme.colors.primary.main,
  },
  fastTag: {
    backgroundColor: theme.colors.semantic.error,
  },
  zmanimLoading: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  zmanimLoadingText: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: spacing.sm,
  },
  zmanimSection: {
    marginTop: 0,
  },
  zmanimTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 16,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 2,
  },
  zmanimRequired: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  zmanimGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  zmanItem: {
    width: '32%',
    backgroundColor: theme.isDark ? 'rgba(25,25,38,0.9)' : 'rgba(255,255,255,0.7)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
    shadowColor: theme.colors.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.isDark ? 0.25 : 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  zmanLabel: {
    fontFamily: fonts.body.regular,
    fontSize: 10,
    color: theme.colors.text.tertiary,
    marginBottom: 2,
  },
  zmanTime: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  featureCard: {
    marginTop: spacing.md,
  },
  };
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(() => {
    try {
      return StyleSheet.create(createCalendarStyles(theme));
    } catch (e) {
      console.warn('CalendarScreen styles error:', e);
      return StyleSheet.create({ container: { flex: 1 } });
    }
  }, [theme]);
}
