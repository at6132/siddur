import React, { useEffect, useState } from 'react';
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
import * as Location from 'expo-location';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles, fonts } from '../../src/design/typography';
import { CalendarEngine } from '../../src/core/calendar/CalendarEngine';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';
import { ZmanimService } from '../../src/core/zmanim/ZmanimService';
import { ExtendedZmanim } from '../../src/types/calendar';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { DayInfo, CalendarContext } from '../../src/types/calendar';

const { width } = Dimensions.get('window');
const DAY_WIDTH = (width - spacing.lg * 2 - spacing.xs * 6) / 7;

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

  const loadContext = async () => {
    const preferences = await UserPreferencesService.getPreferences();
    let currentLocation = preferences?.location;

    // Get current GPS location for accurate zmanim
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
          
          // Save location for future use
          if (preferences) {
            await UserPreferencesService.setLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              cityName: preferences.location?.cityName,
            });
          }
        }
      } catch (locError) {
        console.log('Using stored location, GPS unavailable:', locError);
      }
    }

    // Store location in state for zmanim calculations
    setCurrentLocation(currentLocation || null);

    if (preferences) {
      setContext({
        nusach: preferences.nusach,
        location: currentLocation,
        isIsrael: false,
      });
    } else {
      setContext({
        nusach: 'ashkenaz',
        location: currentLocation,
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
        const hebrewDate = `${jewishDate.day}`;
        const isShabbos = dayOfWeek === 6;
        const isYomTov = JewishCalendarService.isYomTov(date);
        const isRoshChodesh = JewishCalendarService.isRoshChodesh(date);
        const isFastDay = JewishCalendarService.isFastDay(date);
        const holidays = JewishCalendarService.getHolidays(date);
        const specialDay = holidays.length > 0 ? holidays[0] : undefined;

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
    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayPress = async (day: CalendarDay) => {
    if (day.dayOfMonth === 0) return;
    
    if (selectedDay?.date.getTime() === day.date.getTime()) {
      setSelectedDay(null);
      setSelectedDayZmanim(null);
    } else {
      setSelectedDay(day);
      setSelectedDayZmanim(null);
      setZmanimLoading(true);
      
      try {
        // Get fresh GPS location for most accurate zmanim
        let location = currentLocation;
        
        if (Platform.OS !== 'web') {
          try {
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status === 'granted') {
              const gps = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
              });
              location = {
                latitude: gps.coords.latitude,
                longitude: gps.coords.longitude,
              };
            }
          } catch (e) {
            // Use cached location if GPS fails
          }
        }

        if (location) {
          const locationObject = {
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
          };
          const zmanim = await ZmanimService.calculateExtendedZmanim(
            day.date,
            locationObject as any
          );
          setSelectedDayZmanim(zmanim);
        } else {
          // Use defaults if no location available
          const zmanim = await ZmanimService.calculateExtendedZmanim(day.date, null);
          setSelectedDayZmanim(zmanim);
        }
      } catch (error) {
        console.error('Error calculating zmanim:', error);
        const zmanim = await ZmanimService.calculateExtendedZmanim(day.date, null);
        setSelectedDayZmanim(zmanim);
      } finally {
        setZmanimLoading(false);
      }
    }
  };

  const navigateMonth = (direction: number) => {
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

  const formatZmanTime = (date: Date | undefined) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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

        {/* Calendar Grid */}
        <FadeIn delay={100}>
          <View style={styles.calendarGrid}>
            {days.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={getDayStyle(day)}
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
            ))}
          </View>
        </FadeIn>

        {/* Legend */}
        <FadeIn delay={150}>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary.main }]} />
              <Text style={styles.legendText}>Today</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#E8D4A5' }]} />
              <Text style={styles.legendText}>Shabbos</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#A5C4D4' }]} />
              <Text style={styles.legendText}>Yom Tov</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#D4A5A5' }]} />
              <Text style={styles.legendText}>Fast</Text>
            </View>
          </View>
        </FadeIn>

        {/* Selected Day Details */}
        {selectedDay && (
          <FadeIn delay={0}>
            <View style={styles.detailsCard}>
              {Platform.OS !== 'web' ? (
                <BlurView intensity={80} style={styles.detailsBlur}>
                  <View style={styles.detailsContent}>
                    {renderDayDetails()}
                  </View>
                </BlurView>
              ) : (
                <LinearGradient
                  colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
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

        <View style={{ height: 140 }} />
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
          {selectedDay.isRoshChodesh && (
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
            <ActivityIndicator size="small" color={colors.primary.main} />
            <Text style={styles.zmanimLoadingText}>Loading zmanim...</Text>
          </View>
        ) : selectedDayZmanim && (
          <View style={styles.zmanimSection}>
            <Text style={styles.zmanimTitle}>Zmanim</Text>
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
          <View style={styles.zmanimLoading}>
            <Text style={styles.zmanimLoadingText}>Tap to load zmanim</Text>
          </View>
        )}
      </>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 28,
    color: colors.text.secondary,
    fontWeight: '300',
  },
  monthContainer: {
    alignItems: 'center',
  },
  monthTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 24,
    color: colors.text.primary,
  },
  hebrewMonth: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekdayCell: {
    width: DAY_WIDTH,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekdayText: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: DAY_WIDTH,
    height: DAY_WIDTH + 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  emptyDay: {
    width: DAY_WIDTH,
    height: DAY_WIDTH + 8,
    marginBottom: spacing.xs,
  },
  todayDay: {
    borderWidth: 2,
    borderColor: colors.primary.main,
    backgroundColor: 'rgba(212, 165, 184, 0.15)',
  },
  shabbosDay: {
    backgroundColor: 'rgba(232, 212, 165, 0.3)',
  },
  yomTovDay: {
    backgroundColor: 'rgba(165, 196, 212, 0.4)',
  },
  fastDay: {
    backgroundColor: 'rgba(212, 165, 165, 0.3)',
  },
  roshChodeshDay: {
    backgroundColor: 'rgba(196, 212, 165, 0.3)',
  },
  selectedDay: {
    borderWidth: 2,
    borderColor: colors.primary.dark,
    transform: [{ scale: 1.05 }],
  },
  dayNumber: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
    color: colors.text.primary,
  },
  hebrewDay: {
    fontFamily: fonts.body.regular,
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  todayText: {
    color: colors.primary.main,
  },
  shabbosText: {
    color: '#8B7355',
  },
  yomTovText: {
    color: '#4A7C8C',
  },
  fastDayText: {
    color: '#8C4A4A',
  },
  specialIndicator: {
    position: 'absolute',
    bottom: 4,
  },
  specialDot: {
    fontSize: 8,
    color: colors.text.tertiary,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: borderRadius.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
  },
  detailsCard: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  detailsBlur: {
    overflow: 'hidden',
  },
  detailsContent: {
    padding: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  detailsHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailsTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 20,
    color: colors.text.primary,
  },
  detailsHebrewDate: {
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  specialBadge: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  specialBadgeText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 12,
    color: '#fff',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontFamily: fonts.body.medium,
    fontSize: 11,
    color: '#fff',
  },
  shabbosTag: {
    backgroundColor: '#8B7355',
  },
  yomTovTag: {
    backgroundColor: '#4A7C8C',
  },
  roshChodeshTag: {
    backgroundColor: '#6B8C4A',
  },
  fastTag: {
    backgroundColor: '#8C4A4A',
  },
  zmanimLoading: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  zmanimLoadingText: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  zmanimSection: {
    marginTop: spacing.md,
  },
  zmanimTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  zmanimGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  zmanItem: {
    width: '32%',
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  zmanLabel: {
    fontFamily: fonts.body.regular,
    fontSize: 10,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  zmanTime: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.primary,
  },
});
