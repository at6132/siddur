import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { FadeIn } from '../../components/animations/FadeIn';
import { LiquidGlassSegmentedControl } from '../../components/navigation/LiquidGlassSegmentedControl';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius, shadows } from '../../src/design/spacing';
import { textStyles, fonts } from '../../src/design/typography';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { NotificationService } from '../../src/notifications/NotificationService';
import { TehillimService } from '../../src/content/tehillim/TehillimService';
import { SefariaService } from '../../src/services/SefariaService';
import {
  UserPreferences,
  NotificationPreferences,
  DisplayPreferences,
  CustomCountdown,
  CustomReminder,
  RefuahPersonalName,
  RefuahPersonalNameGender,
} from '../../src/types/preferences';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';

// Glass Card Component - theme-aware for dark mode
const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: any;
}> = ({ children, style }) => {
  const { theme } = useTheme();
  const glassGradient = theme.isDark
    ? ['rgba(20,18,32,0.92)', 'rgba(24,22,38,0.85)']
    : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)'];
  const cardStyles = useMemo(() => ({
    card: {
      borderRadius: borderRadius.xl,
      overflow: 'hidden' as const,
      marginBottom: spacing.lg,
      borderWidth: 1.5,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)',
      shadowColor: theme.colors.shadow.medium,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme.isDark ? 0.4 : 1,
      shadowRadius: 12,
      elevation: 6,
    },
    blur: { overflow: 'hidden' as const },
    inner: {
      padding: spacing.lg,
      backgroundColor: theme.isDark ? 'rgba(12,10,18,0.6)' : 'rgba(255,255,255,0.5)',
    },
  }), [theme]);
  return (
    <View style={[cardStyles.card, style]}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={80} tint={theme.isDark ? 'dark' : 'light'} style={cardStyles.blur}>
          <View style={cardStyles.inner}>{children}</View>
        </BlurView>
      ) : (
        <LinearGradient colors={glassGradient} style={cardStyles.blur}>
          <View style={cardStyles.inner}>{children}</View>
        </LinearGradient>
      )}
    </View>
  );
};

type SettingsRouteParams = {
  scrollTo?: 'dailyGratitude';
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ Settings: SettingsRouteParams }, 'Settings'>>();
  const { theme } = useTheme();
  const styles = useMemo(() => createSettingsStyles(theme), [theme]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const [downloadingContent, setDownloadingContent] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [locationLoading, setLocationLoading] = useState(false);
  const [reminderMenuId, setReminderMenuId] = useState<string | null>(null);
  const [timePickerFor, setTimePickerFor] = useState<
    'shacharis' | 'mincha' | 'maariv' | 'tehillim' | 'hallelAnenu' | 'roshChodesh' | 'fastDays' | 'dailyGratitude' | 'daveningYaalehVyavo' | 'daveningAlHanissim' | 'daveningMashivVtenTal' | 'daveningAneinu' | 'daveningNachem' | 'daveningAvinuMalkeinu' | 'daveningSelichos' | null
  >(null);
  const [daveningAddOnsExpanded, setDaveningAddOnsExpanded] = useState(false);
  const [refuahNameModalVisible, setRefuahNameModalVisible] = useState(false);
  const [refuahEditingId, setRefuahEditingId] = useState<string | null>(null);
  const [refuahDraftGender, setRefuahDraftGender] = useState<RefuahPersonalNameGender>('male');
  const [refuahDraftName, setRefuahDraftName] = useState('');
  const [refuahDraftMother, setRefuahDraftMother] = useState('');
  const [timePickerValue, setTimePickerValue] = useState('');
  const [pickerDate, setPickerDate] = useState(() => new Date());
  const [shekiyaMinutesPickerOpen, setShekiyaMinutesPickerOpen] = useState(false);
  type SettingsTab = 'notifications' | 'general' | 'data' | 'about';
  const [activeTab, setActiveTab] = useState<SettingsTab>('notifications');

  /** Format 24h "09:00" as "9:00 AM"; 24h "20:30" as "8:30 PM" */
  const formatTehillimTimeForDisplay = (hhmm: string): string => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm?.trim() || '');
    if (!m) return '9:00 AM';
    let h = parseInt(m[1], 10);
    const min = m[2];
    const am = h < 12;
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${min} ${am ? 'AM' : 'PM'}`;
  };

  /** Parse "7:00 AM" / "8:30 PM" to 24h "07:00" / "20:30" */
  const parseTimeTo24h = (s: string): string | null => {
    const m = /^\s*(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)?\s*$/i.exec((s || '').trim());
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = m[2];
    const pm = (m[3] || '').toUpperCase() === 'PM';
    if (h === 12) h = pm ? 12 : 0;
    else if (pm) h += 12;
    return `${String(h).padStart(2, '0')}:${min}`;
  };

  /** Parse "7:00 AM" for prayer reminders (keep 12h format) */
  const parseTimeTo12h = (s: string): string | null => {
    const m = /^\s*(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)?\s*$/i.exec((s || '').trim());
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = m[2];
    let am = (m[3] || '').toUpperCase() !== 'PM';
    if (h === 12) am = !am;
    else if (h > 12) { h -= 12; am = false; }
    else if (h === 0) h = 12;
    return `${h}:${min} ${am ? 'AM' : 'PM'}`;
  };

  /** Parse "7:00 AM" or 24h "09:00" into today's Date for the wheel picker */
  const timeStringToDate = (s: string): Date => {
    const d = new Date();
    const h24 = parseTimeTo24h(s);
    if (h24) {
      const [h, min] = h24.split(':').map(Number);
      d.setHours(h, min, 0, 0);
      return d;
    }
    d.setHours(9, 0, 0, 0);
    return d;
  };

  const dateTo12h = (d: Date): string => {
    let h = d.getHours();
    const min = d.getMinutes();
    const am = h < 12;
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${String(min).padStart(2, '0')} ${am ? 'AM' : 'PM'}`;
  };

  const dateTo24h = (d: Date): string =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  type TimePickerKind = 'shacharis' | 'mincha' | 'maariv' | 'tehillim' | 'hallelAnenu' | 'roshChodesh' | 'fastDays' | 'dailyGratitude' | 'daveningYaalehVyavo' | 'daveningAlHanissim' | 'daveningMashivVtenTal' | 'daveningAneinu' | 'daveningNachem' | 'daveningAvinuMalkeinu' | 'daveningSelichos';
  const openTimePicker = (which: TimePickerKind) => {
    if (!preferences) return;
    const n = preferences.notifications;
    let initial: string;
    if (which === 'tehillim') initial = formatTehillimTimeForDisplay(n.dailyTehillimTime || '09:00');
    else if (which === 'hallelAnenu') initial = formatTehillimTimeForDisplay(n.hallelAnenuTime || '08:00');
    else if (which === 'roshChodesh') initial = formatTehillimTimeForDisplay(n.roshChodeshTime || '08:00');
    else if (which === 'fastDays') initial = formatTehillimTimeForDisplay(n.fastDaysTime || '08:00');
    else if (which === 'dailyGratitude') initial = formatTehillimTimeForDisplay(n.dailyGratitudeTime || '20:00');
    else if (which === 'daveningYaalehVyavo') initial = formatTehillimTimeForDisplay(n.daveningAddOnsYaalehVyavoTime ?? '08:00');
    else if (which === 'daveningAlHanissim') initial = formatTehillimTimeForDisplay(n.daveningAddOnsAlHanissimTime ?? '08:00');
    else if (which === 'daveningMashivVtenTal') initial = formatTehillimTimeForDisplay(n.daveningAddOnsMashivVtenTalTime ?? '08:00');
    else if (which === 'daveningAneinu') initial = formatTehillimTimeForDisplay(n.daveningAddOnsAneinuTime ?? '08:00');
    else if (which === 'daveningNachem') initial = formatTehillimTimeForDisplay(n.daveningAddOnsNachemTime ?? '08:00');
    else if (which === 'daveningAvinuMalkeinu') initial = formatTehillimTimeForDisplay(n.daveningAddOnsAvinuMalkeinuTime ?? '08:00');
    else if (which === 'daveningSelichos') initial = formatTehillimTimeForDisplay(n.daveningAddOnsSelichosTime ?? '08:00');
    else initial = preferences.notifications.prayerReminders?.[which]?.time || (which === 'shacharis' ? '7:00 AM' : which === 'mincha' ? '1:00 PM' : '8:00 PM');
    setTimePickerValue(initial);
    setPickerDate(timeStringToDate(initial));
    setTimePickerFor(which);
  };

  const saveTimePicker = async () => {
    if (!preferences || !timePickerFor) return;
    const keyMap: Partial<Record<typeof timePickerFor, keyof NotificationPreferences>> = {
      tehillim: 'dailyTehillimTime',
      hallelAnenu: 'hallelAnenuTime',
      roshChodesh: 'roshChodeshTime',
      fastDays: 'fastDaysTime',
      dailyGratitude: 'dailyGratitudeTime',
      daveningYaalehVyavo: 'daveningAddOnsYaalehVyavoTime',
      daveningAlHanissim: 'daveningAddOnsAlHanissimTime',
      daveningMashivVtenTal: 'daveningAddOnsMashivVtenTalTime',
      daveningAneinu: 'daveningAddOnsAneinuTime',
      daveningNachem: 'daveningAddOnsNachemTime',
      daveningAvinuMalkeinu: 'daveningAddOnsAvinuMalkeinuTime',
      daveningSelichos: 'daveningAddOnsSelichosTime',
    };
    const key = keyMap[timePickerFor];
    if (key) {
      await updateNotificationPreference(key, dateTo24h(pickerDate));
    } else if (timePickerFor === 'shacharis' || timePickerFor === 'mincha' || timePickerFor === 'maariv') {
      const updated = {
        ...preferences.notifications,
        prayerReminders: {
          ...preferences.notifications.prayerReminders,
          [timePickerFor]: {
            ...preferences.notifications.prayerReminders?.[timePickerFor],
            time: dateTo12h(pickerDate),
          },
        },
      };
      setPreferences(prev => prev ? { ...prev, notifications: updated } : null);
      try {
        await UserPreferencesService.setNotificationPreferences(updated);
        await NotificationService.reschedule();
      } catch (e) {
        console.warn('Failed to save time', e);
        loadPreferences();
      }
    }
    setTimePickerFor(null);
  };

  const loadPreferences = useCallback(async () => {
    const prefs = await UserPreferencesService.getPreferences();
    setPreferences(prefs);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Handle scroll to section from navigation params
  useEffect(() => {
    if (route.params?.scrollTo === 'dailyGratitude' && !loading) {
      setTimeout(() => {
        // Scroll to approximately where "Other Reminders" / Daily Gratitude section is
        scrollViewRef.current?.scrollTo({ y: 580, animated: true });
      }, 400);
    }
  }, [route.params?.scrollTo, loading]);

  // Refresh when returning from Add Custom Reminder (or any sub-screen) so new reminders show
  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [loadPreferences])
  );

  const updateNotificationPreference = async (
    key: keyof NotificationPreferences,
    value: boolean | string | number
  ) => {
    if (!preferences) return;

    const updated = {
      ...preferences.notifications,
      [key]: value,
    };

    // Optimistic update – UI responds immediately
    setPreferences(prev => prev ? { ...prev, notifications: updated } : null);

    try {
      await UserPreferencesService.setNotificationPreferences(updated);
      await NotificationService.reschedule();
    } catch (e) {
      console.warn('Notification preference update failed:', e);
      loadPreferences(); // Revert on error
    }
  };

  const updateDisplayPreference = async (
    key: keyof DisplayPreferences,
    value: string | boolean
  ) => {
    if (!preferences) return;
    await UserPreferencesService.setDisplayPreferences({ [key]: value });
    loadPreferences();
  };

  const openRefuahNameModal = (entry?: RefuahPersonalName) => {
    if (entry) {
      setRefuahEditingId(entry.id);
      setRefuahDraftGender(entry.gender);
      setRefuahDraftName(entry.nameHebrew);
      setRefuahDraftMother(entry.motherNameHebrew);
    } else {
      setRefuahEditingId(null);
      setRefuahDraftGender('male');
      setRefuahDraftName('');
      setRefuahDraftMother('');
    }
    setRefuahNameModalVisible(true);
  };

  const saveRefuahNameModal = async () => {
    if (!preferences) return;
    const nm = refuahDraftName.trim();
    const mo = refuahDraftMother.trim();
    if (!nm || !mo) {
      Alert.alert('Missing names', "Enter the choleh's Hebrew name and the mother's Hebrew name.");
      return;
    }
    const list = [...(preferences.refuahPersonalNames ?? [])];
    const id =
      refuahEditingId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const row: RefuahPersonalName = {
      id,
      gender: refuahDraftGender,
      nameHebrew: nm,
      motherNameHebrew: mo,
    };
    if (refuahEditingId) {
      const i = list.findIndex((x) => x.id === refuahEditingId);
      if (i >= 0) list[i] = row;
      else list.push(row);
    } else {
      list.push(row);
    }
    await UserPreferencesService.setRefuahPersonalNames(list);
    setRefuahNameModalVisible(false);
    loadPreferences();
  };

  const deleteRefuahName = async (id: string) => {
    if (!preferences) return;
    const list = (preferences.refuahPersonalNames ?? []).filter((x) => x.id !== id);
    await UserPreferencesService.setRefuahPersonalNames(list);
    loadPreferences();
  };

  const handleDownloadContent = async () => {
    setDownloadingContent(true);
    setDownloadProgress(0);
    
    try {
      await TehillimService.prefetchAll((current, total) => {
        setDownloadProgress(Math.round((current / total) * 100));
      });
      Alert.alert('Success', 'All content downloaded for offline use!');
    } catch (e) {
      console.error('Error downloading content:', e);
      Alert.alert('Error', 'Failed to download content. Please try again.');
    } finally {
      setDownloadingContent(false);
    }
  };

  const handleUpdateLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed for accurate zmanim.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      
      // Try to get city name
      let cityName = 'Current Location';
      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (place?.city) {
          cityName = place.city;
        }
      } catch (e) {
        // Ignore geocoding errors
      }

      await UserPreferencesService.setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        cityName,
      });
      
      loadPreferences();
      Alert.alert('Success', `Location updated to ${cityName}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to get location. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all downloaded content. You\'ll need to re-download for offline use.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await SefariaService.clearCache();
            Alert.alert('Success', 'Cache cleared successfully.');
          },
        },
      ]
    );
  };

  const handleResetOnboarding = async () => {
    Alert.alert(
      'Reset App',
      'This will reset all your settings and show the welcome screen again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            // Clear all preferences
            await UserPreferencesService.savePreferences({
              hasCompletedOnboarding: false,
            } as any);
            // Force reload
            loadPreferences();
          },
        },
      ]
    );
  };

  if (loading || !preferences) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={theme.backgroundGradient}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <LinearGradient
        colors={theme.backgroundGradient}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <FadeIn delay={0}>
          <Text style={styles.pageTitle}>Settings</Text>
        </FadeIn>

        {/* Tab bar – liquid glass with draggable orb */}
        <LiquidGlassSegmentedControl
          tabs={[
            { key: 'notifications', label: 'Notifications' },
            { key: 'general', label: 'General' },
            { key: 'data', label: 'Data' },
            { key: 'about', label: 'About' },
          ]}
          activeIndex={(['notifications', 'general', 'data', 'about'] as const).indexOf(activeTab)}
          onIndexChange={(index) =>
            setActiveTab(['notifications', 'general', 'data', 'about'][index] as SettingsTab)
          }
        />

        {/* ============ NOTIFICATIONS TAB ============ */}
        {activeTab === 'notifications' && (
        <>
        {/* ============ NOTIFICATIONS SECTION ============ */}
        <FadeIn delay={50}>
          <GlassCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>🔔</Text>
                <Text style={styles.sectionTitle}>Notifications</Text>
              </View>
            </View>

            <View style={styles.sectionContent}>
                {/* Master Toggle */}
                <View style={styles.masterToggle}>
                  <View>
                    <Text style={styles.optionLabel}>Enable Notifications</Text>
                    <Text style={styles.optionDescription}>Turn all reminders on or off</Text>
                  </View>
                  <Switch
                    value={preferences.notifications.enabled}
                    onValueChange={(value) => updateNotificationPreference('enabled', value)}
                    trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                    thumbColor={preferences.notifications.enabled ? theme.colors.primary.main : theme.colors.neutral[400]}
                  />
                </View>

                {preferences.notifications.enabled && (
                  <>
                    <View style={styles.divider} />

                    {/* Prayer Reminders Section */}
                    <Text style={styles.subSectionTitle}>Daily Prayer Reminders</Text>
                    
                    {/* Shacharis */}
                    <View style={styles.notifOption}>
                      <View style={styles.notifOptionMain}>
                        <View style={styles.prayerLabelRow}>
                          <Text style={styles.prayerIcon}>🌅</Text>
                          <View>
                            <Text style={styles.optionLabel}>Shacharis</Text>
                            <Text style={styles.optionDescriptionSmall}>Morning prayers</Text>
                          </View>
                        </View>
                        <Switch
                          value={preferences.notifications.prayerReminders?.shacharis?.enabled || false}
                          onValueChange={async (value) => {
                            const updated = {
                              ...preferences.notifications,
                              prayerReminders: {
                                ...preferences.notifications.prayerReminders,
                                shacharis: {
                                  ...preferences.notifications.prayerReminders?.shacharis,
                                  enabled: value,
                                },
                              },
                            };
                            await UserPreferencesService.setNotificationPreferences(updated);
                            await NotificationService.reschedule();
                            loadPreferences();
                          }}
                          trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                          thumbColor={preferences.notifications.prayerReminders?.shacharis?.enabled ? theme.colors.primary.main : theme.colors.neutral[400]}
                        />
                      </View>
                      {preferences.notifications.prayerReminders?.shacharis?.enabled && (
                        <View style={styles.notifSubOption}>
                          <View style={styles.notifSubOptionRow}>
                            <Text style={styles.subOptionLabel}>Daily at</Text>
                            <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker('shacharis')}>
                              <Text style={styles.timeButtonText}>
                                {preferences.notifications.prayerReminders?.shacharis?.time || '7:00 AM'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Mincha */}
                    <View style={styles.notifOption}>
                      <View style={styles.notifOptionMain}>
                        <View style={styles.prayerLabelRow}>
                          <Text style={styles.prayerIcon}>☀️</Text>
                          <View>
                            <Text style={styles.optionLabel}>Mincha</Text>
                            <Text style={styles.optionDescriptionSmall}>Afternoon prayers</Text>
                          </View>
                        </View>
                        <Switch
                          value={preferences.notifications.prayerReminders?.mincha?.enabled || false}
                          onValueChange={async (value) => {
                            const updated = {
                              ...preferences.notifications,
                              prayerReminders: {
                                ...preferences.notifications.prayerReminders,
                                mincha: {
                                  ...preferences.notifications.prayerReminders?.mincha,
                                  enabled: value,
                                },
                              },
                            };
                            await UserPreferencesService.setNotificationPreferences(updated);
                            await NotificationService.reschedule();
                            loadPreferences();
                          }}
                          trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                          thumbColor={preferences.notifications.prayerReminders?.mincha?.enabled ? theme.colors.primary.main : theme.colors.neutral[400]}
                        />
                      </View>
                      {preferences.notifications.prayerReminders?.mincha?.enabled && (
                        <View style={styles.notifSubOption}>
                          <View style={styles.notifSubOptionRow}>
                            <Text style={styles.subOptionLabel}>Daily at</Text>
                            <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker('mincha')}>
                              <Text style={styles.timeButtonText}>
                                {preferences.notifications.prayerReminders?.mincha?.time || '1:00 PM'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Maariv */}
                    <View style={styles.notifOption}>
                      <View style={styles.notifOptionMain}>
                        <View style={styles.prayerLabelRow}>
                          <Text style={styles.prayerIcon}>🌙</Text>
                          <View>
                            <Text style={styles.optionLabel}>Maariv</Text>
                            <Text style={styles.optionDescriptionSmall}>Evening prayers</Text>
                          </View>
                        </View>
                        <Switch
                          value={preferences.notifications.prayerReminders?.maariv?.enabled || false}
                          onValueChange={async (value) => {
                            const updated = {
                              ...preferences.notifications,
                              prayerReminders: {
                                ...preferences.notifications.prayerReminders,
                                maariv: {
                                  ...preferences.notifications.prayerReminders?.maariv,
                                  enabled: value,
                                },
                              },
                            };
                            await UserPreferencesService.setNotificationPreferences(updated);
                            await NotificationService.reschedule();
                            loadPreferences();
                          }}
                          trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                          thumbColor={preferences.notifications.prayerReminders?.maariv?.enabled ? theme.colors.primary.main : theme.colors.neutral[400]}
                        />
                      </View>
                      {preferences.notifications.prayerReminders?.maariv?.enabled && (
                        <View style={styles.notifSubOption}>
                          <View style={styles.notifSubOptionRow}>
                            <Text style={styles.subOptionLabel}>Daily at</Text>
                            <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker('maariv')}>
                              <Text style={styles.timeButtonText}>
                                {preferences.notifications.prayerReminders?.maariv?.time || '8:00 PM'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>

                    <View style={styles.divider} />
                    <Text style={styles.subSectionTitle}>Other Reminders</Text>

                    {/* Daily Gratitude */}
                    <View style={styles.notifOption}>
                      <View style={styles.notifOptionMain}>
                        <Text style={styles.optionLabel}>Daily Gratitude</Text>
                        <Switch
                          value={preferences.notifications.dailyGratitude}
                          onValueChange={(value) => updateNotificationPreference('dailyGratitude', value)}
                          trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                          thumbColor={preferences.notifications.dailyGratitude ? theme.colors.primary.main : theme.colors.neutral[400]}
                        />
                      </View>
                      {preferences.notifications.dailyGratitude && (
                        <View style={styles.notifSubOption}>
                          <View style={styles.notifSubOptionRow}>
                            <Text style={styles.subOptionLabel}>Remind me at</Text>
                            <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker('dailyGratitude')}>
                              <Text style={styles.timeButtonText}>
                                {formatTehillimTimeForDisplay(preferences.notifications.dailyGratitudeTime || '20:00')}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Daily Tehillim */}
                    <View style={styles.notifOption}>
                      <View style={styles.notifOptionMain}>
                        <Text style={styles.optionLabel}>Daily Tehillim</Text>
                        <Switch
                          value={preferences.notifications.dailyTehillim}
                          onValueChange={(value) => updateNotificationPreference('dailyTehillim', value)}
                          trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                          thumbColor={preferences.notifications.dailyTehillim ? theme.colors.primary.main : theme.colors.neutral[400]}
                        />
                      </View>
                      {preferences.notifications.dailyTehillim && (
                        <View style={styles.notifSubOption}>
                          <View style={styles.notifSubOptionRow}>
                            <Text style={styles.subOptionLabel}>Remind me at</Text>
                            <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker('tehillim')}>
                              <Text style={styles.timeButtonText}>
                                {formatTehillimTimeForDisplay(preferences.notifications.dailyTehillimTime || '09:00')}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Custom Reminders Section */}
                    <View style={styles.divider} />
                    <View style={styles.customRemindersHeader}>
                      <Text style={styles.subSectionTitle}>Custom Reminders</Text>
                      <TouchableOpacity 
                        style={styles.addReminderButton}
                        onPress={() => navigation.navigate('AddCustomReminder' as never)}
                      >
                        <Text style={styles.addReminderButtonText}>+ Add</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Custom Reminders List */}
                    {(preferences.customReminders || []).length > 0 ? (
                      (preferences.customReminders || []).map((reminder) => (
                        <View key={reminder.id} style={styles.customReminderItem}>
                          <View style={styles.customReminderLeft}>
                            <Text style={styles.customReminderTitle}>{reminder.title}</Text>
                            <Text style={styles.customReminderTime}>{reminder.time}</Text>
                          </View>
                          <View style={styles.customReminderRight}>
                            <Switch
                              value={reminder.enabled}
                              onValueChange={async (value) => {
                                await UserPreferencesService.updateCustomReminder(reminder.id, { enabled: value });
                                const prefs = await UserPreferencesService.getPreferences();
                                await NotificationService.reschedule(prefs ?? undefined);
                                loadPreferences();
                              }}
                              trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                              thumbColor={reminder.enabled ? theme.colors.primary.main : theme.colors.neutral[400]}
                            />
                            <TouchableOpacity
                              style={styles.reminderMenuButton}
                              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                              onPress={() => setReminderMenuId(reminder.id)}
                            >
                              <Text style={styles.reminderMenuButtonText}>⋮</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    ) : (
                      <View style={styles.noRemindersMessage}>
                        <Text style={styles.noRemindersText}>No custom reminders yet</Text>
                        <Text style={styles.noRemindersSubtext}>Tap + Add to create one</Text>
                      </View>
                    )}

                    {/* 3-dot menu for a reminder: Edit / Delete */}
                    <Modal visible={reminderMenuId != null} transparent animationType="fade">
                      <Pressable style={styles.reminderMenuBackdrop} onPress={() => setReminderMenuId(null)}>
                        <Pressable style={styles.reminderMenuBox} onPress={() => {}}>
                          {(() => {
                            const reminder = (preferences?.customReminders || []).find(r => r.id === reminderMenuId);
                            if (!reminder) return null;
                            return (
                              <>
                                <TouchableOpacity
                                  style={styles.reminderMenuItem}
                                  onPress={() => {
                                    setReminderMenuId(null);
                                    (navigation as any).navigate('AddCustomReminder', { reminder });
                                  }}
                                >
                                  <Text style={styles.reminderMenuItemTitle}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.reminderMenuItem, styles.reminderMenuItemLast]}
                                  onPress={() => {
                                    setReminderMenuId(null);
                                    Alert.alert(
                                      'Delete Reminder',
                                      `Delete "${reminder.title}"?`,
                                      [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                          text: 'Delete',
                                          style: 'destructive',
                                          onPress: async () => {
                                            try {
                                              await UserPreferencesService.deleteCustomReminder(reminder.id);
                                              const prefs = await UserPreferencesService.getPreferences();
                                              await NotificationService.reschedule(prefs ?? undefined);
                                            } catch (e) {
                                              console.error('Delete reminder failed:', e);
                                            }
                                            loadPreferences();
                                          },
                                        },
                                      ]
                                    );
                                  }}
                                >
                                  <Text style={[styles.reminderMenuItemTitle, styles.reminderMenuItemDestructive]}>Delete</Text>
                                </TouchableOpacity>
                              </>
                            );
                          })()}
                        </Pressable>
                      </Pressable>
                    </Modal>

                    <View style={styles.divider} />
                    <Text style={styles.subSectionTitle}>Shabbos & Special Days</Text>

                    {/* Shabbos Reminders (zman-based: candle lighting + Friday afternoon) */}
                    <View style={styles.notifOption}>
                      <View style={styles.notifOptionMain}>
                        <Text style={styles.optionLabel}>Shabbos Reminders</Text>
                        <Switch
                          value={preferences.notifications.shabbosReminders}
                          onValueChange={(value) => updateNotificationPreference('shabbosReminders', value)}
                          trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                          thumbColor={preferences.notifications.shabbosReminders ? theme.colors.primary.main : theme.colors.neutral[400]}
                        />
                      </View>
                      {preferences.notifications.shabbosReminders && (
                        <View style={styles.notifSubOption}>
                          <Text style={styles.subOptionLabel}>Based on your location’s zmanim (candle lighting and Friday reminder)</Text>
                        </View>
                      )}
                    </View>

                    {/* Shekiya (sunset) reminder — N minutes before sunset every day */}
                    <View style={styles.notifOption}>
                      <View style={styles.notifOptionMain}>
                        <Text style={styles.optionLabel}>Shekiya (Sunset) Reminder</Text>
                        <Switch
                          value={preferences.notifications.shekiyaReminder}
                          onValueChange={(value) => updateNotificationPreference('shekiyaReminder', value)}
                          trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                          thumbColor={preferences.notifications.shekiyaReminder ? theme.colors.primary.main : theme.colors.neutral[400]}
                        />
                      </View>
                      {preferences.notifications.shekiyaReminder && (
                        <View style={styles.notifSubOption}>
                          <View style={styles.notifSubOptionRow}>
                            <Text style={styles.subOptionLabel}>Remind me</Text>
                            <TouchableOpacity style={styles.timeButton} onPress={() => setShekiyaMinutesPickerOpen(true)}>
                              <Text style={styles.timeButtonText}>
                                {preferences.notifications.shekiyaMinutesBefore ?? 15} min before sunset
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Davening add-ons: Yaaleh V'Yavo days & Al HaNisim (Chanukah, Purim) — morning reminders */}
                    <TouchableOpacity
                      style={styles.notifOption}
                      onPress={() => setDaveningAddOnsExpanded(!daveningAddOnsExpanded)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.notifOptionMain}>
                        <View style={styles.daveningAddOnsTitleRow}>
                          <Ionicons
                            name={daveningAddOnsExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={20}
                            color={theme.colors.text.tertiary}
                            style={styles.daveningAddOnsChevron}
                          />
                          <Text style={styles.optionLabel}>Davening add-ons</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }} onStartShouldSetResponder={() => true}>
                          <Switch
                            value={preferences.notifications.daveningAddOns}
                            onValueChange={(value) => updateNotificationPreference('daveningAddOns', value)}
                            trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                            thumbColor={preferences.notifications.daveningAddOns ? theme.colors.primary.main : theme.colors.neutral[400]}
                          />
                        </View>
                      </View>
                      {daveningAddOnsExpanded && (
                        <View style={styles.daveningAddOnsDropdown}>
                          <View style={styles.daveningAddOnsRow}>
                            <Text style={styles.daveningAddOnsRowLabel}>Yaaleh V'Yavo</Text>
                            <View style={styles.daveningAddOnsRowControls}>
                              <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker('daveningYaalehVyavo')}>
                                <Text style={styles.timeButtonText}>
                                  {formatTehillimTimeForDisplay(preferences.notifications.daveningAddOnsYaalehVyavoTime ?? '08:00')}
                                </Text>
                              </TouchableOpacity>
                              <Switch
                                value={preferences.notifications.daveningAddOnsYaalehVyavo}
                                onValueChange={(value) => updateNotificationPreference('daveningAddOnsYaalehVyavo', value)}
                                trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                                thumbColor={preferences.notifications.daveningAddOnsYaalehVyavo ? theme.colors.primary.main : theme.colors.neutral[400]}
                              />
                            </View>
                          </View>
                          <View style={styles.daveningAddOnsRow}>
                            <Text style={styles.daveningAddOnsRowLabel}>Al HaNisim</Text>
                            <View style={styles.daveningAddOnsRowControls}>
                              <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker('daveningAlHanissim')}>
                                <Text style={styles.timeButtonText}>
                                  {formatTehillimTimeForDisplay(preferences.notifications.daveningAddOnsAlHanissimTime ?? '08:00')}
                                </Text>
                              </TouchableOpacity>
                              <Switch
                                value={preferences.notifications.daveningAddOnsAlHanissim}
                                onValueChange={(value) => updateNotificationPreference('daveningAddOnsAlHanissim', value)}
                                trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                                thumbColor={preferences.notifications.daveningAddOnsAlHanissim ? theme.colors.primary.main : theme.colors.neutral[400]}
                              />
                            </View>
                          </View>
                          <View style={styles.daveningAddOnsRow}>
                            <Text style={styles.daveningAddOnsRowLabel}>Mashiv HaRuach & V'ten Tal Umatar</Text>
                            <View style={styles.daveningAddOnsRowControls}>
                              <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker('daveningMashivVtenTal')}>
                                <Text style={styles.timeButtonText}>
                                  {formatTehillimTimeForDisplay(preferences.notifications.daveningAddOnsMashivVtenTalTime ?? '08:00')}
                                </Text>
                              </TouchableOpacity>
                              <Switch
                                value={preferences.notifications.daveningAddOnsMashivVtenTal}
                                onValueChange={(value) => updateNotificationPreference('daveningAddOnsMashivVtenTal', value)}
                                trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                                thumbColor={preferences.notifications.daveningAddOnsMashivVtenTal ? theme.colors.primary.main : theme.colors.neutral[400]}
                              />
                            </View>
                          </View>
                          <View style={styles.daveningAddOnsRow}>
                            <Text style={styles.daveningAddOnsRowLabel}>Aneinu</Text>
                            <View style={styles.daveningAddOnsRowControls}>
                              <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker('daveningAneinu')}>
                                <Text style={styles.timeButtonText}>
                                  {formatTehillimTimeForDisplay(preferences.notifications.daveningAddOnsAneinuTime ?? '08:00')}
                                </Text>
                              </TouchableOpacity>
                              <Switch
                                value={preferences.notifications.daveningAddOnsAneinu}
                                onValueChange={(value) => updateNotificationPreference('daveningAddOnsAneinu', value)}
                                trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                                thumbColor={preferences.notifications.daveningAddOnsAneinu ? theme.colors.primary.main : theme.colors.neutral[400]}
                              />
                            </View>
                          </View>
                          <View style={styles.daveningAddOnsRow}>
                            <Text style={styles.daveningAddOnsRowLabel}>Nachem</Text>
                            <View style={styles.daveningAddOnsRowControls}>
                              <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker('daveningNachem')}>
                                <Text style={styles.timeButtonText}>
                                  {formatTehillimTimeForDisplay(preferences.notifications.daveningAddOnsNachemTime ?? '08:00')}
                                </Text>
                              </TouchableOpacity>
                              <Switch
                                value={preferences.notifications.daveningAddOnsNachem}
                                onValueChange={(value) => updateNotificationPreference('daveningAddOnsNachem', value)}
                                trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                                thumbColor={preferences.notifications.daveningAddOnsNachem ? theme.colors.primary.main : theme.colors.neutral[400]}
                              />
                            </View>
                          </View>
                          <View style={styles.daveningAddOnsRow}>
                            <Text style={styles.daveningAddOnsRowLabel}>Avinu Malkeinu</Text>
                            <View style={styles.daveningAddOnsRowControls}>
                              <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker('daveningAvinuMalkeinu')}>
                                <Text style={styles.timeButtonText}>
                                  {formatTehillimTimeForDisplay(preferences.notifications.daveningAddOnsAvinuMalkeinuTime ?? '08:00')}
                                </Text>
                              </TouchableOpacity>
                              <Switch
                                value={preferences.notifications.daveningAddOnsAvinuMalkeinu}
                                onValueChange={(value) => updateNotificationPreference('daveningAddOnsAvinuMalkeinu', value)}
                                trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                                thumbColor={preferences.notifications.daveningAddOnsAvinuMalkeinu ? theme.colors.primary.main : theme.colors.neutral[400]}
                              />
                            </View>
                          </View>
                          <View style={[styles.daveningAddOnsRow, styles.daveningAddOnsRowLast]}>
                            <Text style={styles.daveningAddOnsRowLabel}>Selichos</Text>
                            <View style={styles.daveningAddOnsRowControls}>
                              <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker('daveningSelichos')}>
                                <Text style={styles.timeButtonText}>
                                  {formatTehillimTimeForDisplay(preferences.notifications.daveningAddOnsSelichosTime ?? '08:00')}
                                </Text>
                              </TouchableOpacity>
                              <Switch
                                value={preferences.notifications.daveningAddOnsSelichos}
                                onValueChange={(value) => updateNotificationPreference('daveningAddOnsSelichos', value)}
                                trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                                thumbColor={preferences.notifications.daveningAddOnsSelichos ? theme.colors.primary.main : theme.colors.neutral[400]}
                              />
                            </View>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>

                    <View style={styles.divider} />
                    <Text style={styles.additionalRemindersSectionTitle}>Additional Reminders</Text>
                    <View style={styles.additionalRemindersContainer}>
                      <View style={styles.additionalReminderItem}>
                        <View style={styles.notifOptionMain}>
                          <Text style={styles.optionLabel}>Hallel</Text>
                          <Switch
                            value={preferences.notifications.hallelAnenu}
                            onValueChange={(value) => updateNotificationPreference('hallelAnenu', value)}
                            trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                            thumbColor={preferences.notifications.hallelAnenu ? theme.colors.primary.main : theme.colors.neutral[400]}
                          />
                        </View>
                        {preferences.notifications.hallelAnenu && (
                          <View style={styles.notifSubOption}>
                            <View style={styles.notifSubOptionRow}>
                              <Text style={styles.subOptionLabel}>Time</Text>
                              <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker('hallelAnenu')}>
                                <Text style={styles.timeButtonText}>
                                  {formatTehillimTimeForDisplay(preferences.notifications.hallelAnenuTime || '08:00')}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>

                      <View style={styles.additionalReminderItem}>
                        <View style={styles.notifOptionMain}>
                          <Text style={styles.optionLabel}>Rosh Chodesh</Text>
                          <Switch
                            value={preferences.notifications.roshChodesh}
                            onValueChange={(value) => updateNotificationPreference('roshChodesh', value)}
                            trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                            thumbColor={preferences.notifications.roshChodesh ? theme.colors.primary.main : theme.colors.neutral[400]}
                          />
                        </View>
                        {preferences.notifications.roshChodesh && (
                          <View style={styles.notifSubOption}>
                            <View style={styles.notifSubOptionRow}>
                              <Text style={styles.subOptionLabel}>Time</Text>
                              <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker('roshChodesh')}>
                                <Text style={styles.timeButtonText}>
                                  {formatTehillimTimeForDisplay(preferences.notifications.roshChodeshTime || '08:00')}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>

                      <View style={styles.additionalReminderItem}>
                        <View style={styles.notifOptionMain}>
                          <Text style={styles.optionLabel}>Fast Days</Text>
                          <Switch
                            value={preferences.notifications.fastDays}
                            onValueChange={(value) => updateNotificationPreference('fastDays', value)}
                            trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                            thumbColor={preferences.notifications.fastDays ? theme.colors.primary.main : theme.colors.neutral[400]}
                          />
                        </View>
                        {preferences.notifications.fastDays && (
                          <View style={styles.notifSubOption}>
                            <View style={styles.notifSubOptionRow}>
                              <Text style={styles.subOptionLabel}>Time</Text>
                              <TouchableOpacity style={styles.timeButton} onPress={() => openTimePicker('fastDays')}>
                                <Text style={styles.timeButtonText}>
                                  {formatTehillimTimeForDisplay(preferences.notifications.fastDaysTime || '08:00')}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>

                      <View style={[styles.additionalReminderItem, styles.additionalReminderItemLast]}>
                        <View style={styles.notifOptionMain}>
                          <Text style={styles.optionLabel}>Sefiras HaOmer</Text>
                          <Switch
                            value={preferences.notifications.sefirasHaomer}
                            onValueChange={(value) => updateNotificationPreference('sefirasHaomer', value)}
                            trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                            thumbColor={preferences.notifications.sefirasHaomer ? theme.colors.primary.main : theme.colors.neutral[400]}
                          />
                        </View>
                        {preferences.notifications.sefirasHaomer && (
                          <View style={styles.notifSubOption}>
                            <Text style={styles.subOptionLabel}>
                              At tzeit (nightfall) for your location — when the app unlocks counting. Set location under General if needed.
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </>
                )}
            </View>
          </GlassCard>
        </FadeIn>
        </>
        )}

        {/* ============ GENERAL TAB ============ */}
        {activeTab === 'general' && (
        <>
        {/* ============ NUSACH SECTION ============ */}
        <FadeIn delay={50}>
          <GlassCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>📜</Text>
                <Text style={styles.sectionTitle}>Nusach</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                {preferences.nusach === 'ashkenaz' ? 'Ashkenaz' : 'Sfard'}
              </Text>
            </View>

            <View style={styles.sectionContent}>
                <Text style={styles.optionDescription}>
                  Choose your prayer tradition for correct text variations
                </Text>
                <View style={styles.nusachContainer}>
                  <TouchableOpacity
                    style={[
                      styles.nusachOption,
                      preferences.nusach === 'ashkenaz' && styles.nusachOptionActive,
                    ]}
                    onPress={() => UserPreferencesService.setNusach('ashkenaz').then(loadPreferences)}
                  >
                    <Text style={[
                      styles.nusachText,
                      preferences.nusach === 'ashkenaz' && styles.nusachTextActive,
                    ]}>
                      Ashkenaz
                    </Text>
                    <Text style={[
                      styles.nusachSubtext,
                      preferences.nusach === 'ashkenaz' && styles.nusachTextActive,
                    ]}>
                      European tradition
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.nusachOption,
                      preferences.nusach === 'sfard' && styles.nusachOptionActive,
                    ]}
                    onPress={() => UserPreferencesService.setNusach('sfard').then(loadPreferences)}
                  >
                    <Text style={[
                      styles.nusachText,
                      preferences.nusach === 'sfard' && styles.nusachTextActive,
                    ]}>
                      Sfard
                    </Text>
                    <Text style={[
                      styles.nusachSubtext,
                      preferences.nusach === 'sfard' && styles.nusachTextActive,
                    ]}>
                      Chassidic tradition
                    </Text>
                  </TouchableOpacity>
                </View>
            </View>
          </GlassCard>
        </FadeIn>

        {/* ============ REFUAH NAMES (רפאנו) ============ */}
        <FadeIn delay={100}>
          <GlassCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>💙</Text>
                <Text style={styles.sectionTitle}>Refuah names</Text>
              </View>
              <Text style={styles.sectionSubtitle}>Optional in רְפָאֵנוּ</Text>
            </View>
            <View style={styles.sectionContent}>
              <Text style={styles.optionDescription}>
                After &quot;רְפוּאָה שְׁלֵמָה לְכָל מַכּוֹתֵינוּ&quot; in the Amidah, a short paragraph is added
                for each person you list (Hebrew names only). Choose male (בן) or female (בת), then enter the
                choleh&apos;s name and the mother&apos;s name.
              </Text>
              {(preferences.refuahPersonalNames ?? []).map((entry) => (
                <View key={entry.id} style={styles.refuahNameRow}>
                  <View style={styles.refuahNameRowText}>
                    <Text style={styles.refuahNamePreview}>
                      {entry.gender === 'female'
                        ? `${entry.nameHebrew} בת ${entry.motherNameHebrew}`
                        : `${entry.nameHebrew} בן ${entry.motherNameHebrew}`}
                    </Text>
                    <Text style={styles.refuahNameSub}>
                      {entry.gender === 'female' ? 'Female (בת)' : 'Male (בן)'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => openRefuahNameModal(entry)} style={styles.refuahNameEditBtn}>
                    <Text style={styles.refuahNameEditTxt}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteRefuahName(entry.id)} style={styles.refuahNameDeleteBtn}>
                    <Ionicons name="trash-outline" size={20} color={theme.colors.semantic.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.addRefuahButton}
                onPress={() => openRefuahNameModal()}
                activeOpacity={0.8}
              >
                <Text style={styles.addRefuahButtonText}>+ Add name</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </FadeIn>

        {/* ============ LOCATION SECTION ============ */}
        <FadeIn delay={150}>
          <GlassCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>📍</Text>
                <Text style={styles.sectionTitle}>Location</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                {preferences.location?.cityName || 'Not set'}
              </Text>
            </View>

            <View style={styles.sectionContent}>
                <Text style={styles.optionDescription}>
                  Your location is used to calculate accurate zmanim (prayer times)
                </Text>
                
                {preferences.location && (
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationCity}>
                      {preferences.location.cityName || 'Unknown Location'}
                    </Text>
                    <Text style={styles.locationCoords}>
                      {preferences.location.latitude.toFixed(4)}, {preferences.location.longitude.toFixed(4)}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.updateButton}
                  onPress={handleUpdateLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.updateButtonText}>
                      {preferences.location ? 'Update Location' : 'Set Location'}
                    </Text>
                  )}
                </TouchableOpacity>
            </View>
          </GlassCard>
        </FadeIn>

        {/* ============ DISPLAY SECTION ============ */}
        <FadeIn delay={200}>
          <GlassCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>🎨</Text>
                <Text style={styles.sectionTitle}>Display</Text>
              </View>
            </View>

            <View style={styles.sectionContent}>
                {/* Theme / Appearance – dark mode hidden for now; app stays light */}
                {/* Text Size */}
                <View style={styles.displayOption}>
                  <Text style={styles.optionLabel}>Text Size</Text>
                  <View style={styles.textSizeSelector}>
                    {(['xsmall', 'small', 'medium', 'large'] as const).map((size) => (
                      <TouchableOpacity
                        key={size}
                        style={[
                          styles.textSizeOption,
                          preferences.display?.textSize === size && styles.textSizeOptionActive,
                        ]}
                        onPress={() => updateDisplayPreference('textSize', size)}
                      >
                        <Text style={[
                          styles.textSizeText,
                          { fontSize: size === 'xsmall' ? 12 : size === 'small' ? 14 : size === 'medium' ? 16 : 18 },
                          preferences.display?.textSize === size && styles.textSizeTextActive,
                        ]}>
                          A
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Show Transliteration */}
                <View style={styles.simpleToggle}>
                  <Text style={styles.optionLabel}>Show Transliteration</Text>
                  <Switch
                    value={false}
                    onValueChange={() => Alert.alert('Coming Soon', 'English translations will be available in a future update.')}
                    trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary.light }}
                    thumbColor={theme.colors.neutral[400]}
                  />
                </View>
            </View>
          </GlassCard>
        </FadeIn>
        </>
        )}

        {/* ============ DATA TAB ============ */}
        {activeTab === 'data' && (
        <>
        {/* ============ OFFLINE CONTENT SECTION ============ */}
        <FadeIn delay={50}>
          <GlassCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>📥</Text>
                <Text style={styles.sectionTitle}>Offline Content</Text>
              </View>
            </View>

            <View style={styles.sectionContent}>
                <Text style={styles.optionDescription}>
                  Download all Tehillim and Siddur content for offline use
                </Text>
                
                {downloadingContent ? (
                  <View style={styles.downloadProgress}>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${downloadProgress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>
                      Downloading... {downloadProgress}%
                    </Text>
                  </View>
                ) : (
                  <View style={styles.offlineButtons}>
                    <TouchableOpacity
                      style={styles.downloadButton}
                      onPress={handleDownloadContent}
                    >
                      <Text style={styles.downloadButtonText}>
                        Download All Content
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={handleClearCache}
                    >
                      <Text style={styles.clearButtonText}>
                        Clear Cache
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
            </View>
          </GlassCard>
        </FadeIn>
        </>
        )}

        {/* ============ ABOUT TAB ============ */}
        {activeTab === 'about' && (
        <>
        {/* Support & credit */}
        <FadeIn delay={25}>
          <GlassCard style={styles.card}>
            <View style={styles.supportSection}>
              <Text style={styles.supportTitle}>Support</Text>
              <Text style={styles.supportText}>
                Email{' '}
                <Text
                  style={styles.link}
                  onPress={() => Linking.openURL('mailto:shevastudios@gmail.com')}
                >
                  shevastudios@gmail.com
                </Text>
                {' '}for support
              </Text>
              <Text style={styles.supportCredit}>Project by Avi Taub at Sheva Studios</Text>
            </View>
          </GlassCard>
        </FadeIn>

        {/* ============ ABOUT SECTION ============ */}
        <FadeIn delay={50}>
          <GlassCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>ℹ️</Text>
                <Text style={styles.sectionTitle}>About</Text>
              </View>
            </View>

            <View style={styles.sectionContent}>
                <View style={styles.aboutRow}>
                  <Text style={styles.aboutLabel}>Version</Text>
                  <Text style={styles.aboutValue}>
                    {Constants.expoConfig?.version ?? Constants.manifest?.version ?? '1.0.0'}
                  </Text>
                </View>
                
                <View style={styles.aboutRow}>
                  <Text style={styles.aboutLabel}>Text Source</Text>
                  <TouchableOpacity onPress={() => Linking.openURL('https://www.sefaria.org')}>
                    <Text style={[styles.aboutValue, styles.link]}>Sefaria.org</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.attribution}>
                  Prayer texts and Tehillim are provided by Sefaria under Creative Commons license (CC-BY-SA).
                </Text>

                <View style={styles.resetSection}>
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={handleResetOnboarding}
                  >
                    <Text style={styles.resetButtonText}>Reset App</Text>
                  </TouchableOpacity>
                </View>
            </View>
          </GlassCard>
        </FadeIn>

        {/* App Logo/Branding */}
        <FadeIn delay={75}>
          <View style={styles.brandingSection}>
            <Text style={styles.appName}>24/7</Text>
            <Text style={styles.tagline}>With you, when you choose.</Text>
          </View>
        </FadeIn>
        </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={refuahNameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRefuahNameModalVisible(false)}
      >
        <Pressable style={styles.timePickerOverlay} onPress={() => setRefuahNameModalVisible(false)}>
          <Pressable style={styles.refuahModalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.timePickerTitle}>{refuahEditingId ? 'Edit name' : 'Add name'}</Text>
            <Text style={[styles.optionDescription, { marginBottom: spacing.sm }]}>Gender (בן / בת)</Text>
            <View style={styles.refuahGenderRow}>
              <TouchableOpacity
                style={[styles.refuahGenderChip, refuahDraftGender === 'male' && styles.refuahGenderChipActive]}
                onPress={() => setRefuahDraftGender('male')}
                activeOpacity={0.85}
              >
                <Text style={styles.refuahGenderChipText}>Male · בן</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.refuahGenderChip, refuahDraftGender === 'female' && styles.refuahGenderChipActive]}
                onPress={() => setRefuahDraftGender('female')}
                activeOpacity={0.85}
              >
                <Text style={styles.refuahGenderChipText}>Female · בת</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.optionDescription, { marginBottom: spacing.xs }]}>Choleh&apos;s Hebrew name</Text>
            <TextInput
              value={refuahDraftName}
              onChangeText={setRefuahDraftName}
              placeholder="e.g. שְׁמוּאֵל"
              style={[styles.refuahTextInput, { color: theme.colors.text.primary }]}
              placeholderTextColor={theme.colors.neutral[500]}
              textAlign="right"
              writingDirection="rtl"
            />
            <Text style={[styles.optionDescription, { marginBottom: spacing.xs }]}>Mother&apos;s Hebrew name</Text>
            <TextInput
              value={refuahDraftMother}
              onChangeText={setRefuahDraftMother}
              placeholder="e.g. שָׂרָה"
              style={[styles.refuahTextInput, { color: theme.colors.text.primary }]}
              placeholderTextColor={theme.colors.neutral[500]}
              textAlign="right"
              writingDirection="rtl"
            />
            <View style={styles.timePickerActions}>
              <TouchableOpacity
                style={styles.timePickerCancel}
                onPress={() => setRefuahNameModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.timePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timePickerSave} onPress={saveRefuahNameModal} activeOpacity={0.8}>
                <Text style={styles.timePickerSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Time picker for notification reminders */}
      <Modal
        visible={timePickerFor !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setTimePickerFor(null)}
      >
        <Pressable style={styles.timePickerOverlay} onPress={() => setTimePickerFor(null)}>
          <Pressable style={styles.timePickerBox} onPress={e => e.stopPropagation()}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>
                {timePickerFor === 'tehillim' ? 'Tehillim' : timePickerFor === 'hallelAnenu' ? 'Hallel' : timePickerFor === 'roshChodesh' ? 'Rosh Chodesh' : timePickerFor === 'fastDays' ? 'Fast Days' : timePickerFor === 'dailyGratitude' ? 'Daily Gratitude' : timePickerFor === 'daveningYaalehVyavo' ? 'Yaaleh V\'Yavo' : timePickerFor === 'daveningAlHanissim' ? 'Al HaNisim' : timePickerFor === 'daveningMashivVtenTal' ? 'Mashiv HaRuach & V\'ten Tal' : timePickerFor === 'daveningAneinu' ? 'Aneinu' : timePickerFor === 'daveningNachem' ? 'Nachem' : timePickerFor === 'daveningAvinuMalkeinu' ? 'Avinu Malkeinu' : timePickerFor === 'daveningSelichos' ? 'Selichos' : timePickerFor === 'shacharis' ? 'Shacharis' : timePickerFor === 'mincha' ? 'Mincha' : 'Maariv'}
              </Text>
              <Text style={styles.timePickerSubtitle}>Set reminder time</Text>
            </View>
            <View style={styles.timePickerWheelWrap}>
              <DateTimePicker
                value={pickerDate}
                mode="time"
                display={Platform.OS === 'android' ? 'spinner' : 'spinner'}
                onChange={(_, date) => date != null && setPickerDate(date)}
                textColor={theme.colors.text.primary}
                themeVariant={theme.isDark ? 'dark' : 'light'}
              />
            </View>
            <View style={styles.timePickerActions}>
              <TouchableOpacity style={styles.timePickerCancel} onPress={() => setTimePickerFor(null)} activeOpacity={0.7}>
                <Text style={styles.timePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timePickerSave} onPress={saveTimePicker} activeOpacity={0.8}>
                <Text style={styles.timePickerSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Shekiya: minutes before sunset picker */}
      <Modal
        visible={shekiyaMinutesPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setShekiyaMinutesPickerOpen(false)}
      >
        <Pressable style={styles.timePickerOverlay} onPress={() => setShekiyaMinutesPickerOpen(false)}>
          <Pressable style={styles.timePickerBox} onPress={e => e.stopPropagation()}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Shekiya Reminder</Text>
              <Text style={styles.timePickerSubtitle}>Minutes before sunset</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm }}>
              {[5, 10, 15, 20, 25, 30, 45, 60].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[
                    styles.shekiyaMinuteChip,
                    preferences?.notifications.shekiyaMinutesBefore === mins && styles.shekiyaMinuteChipSelected,
                  ]}
                  onPress={async () => {
                    await updateNotificationPreference('shekiyaMinutesBefore', mins);
                    setShekiyaMinutesPickerOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.shekiyaMinuteChipText,
                    preferences?.notifications.shekiyaMinutesBefore === mins && styles.shekiyaMinuteChipTextSelected,
                  ]}>
                    {mins} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.timePickerActions}>
              <TouchableOpacity style={styles.timePickerCancel} onPress={() => setShekiyaMinutesPickerOpen(false)} activeOpacity={0.7}>
                <Text style={styles.timePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

function createSettingsStyles(theme: AppTheme) {
  return StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl + spacing.safeTopInset,
    paddingBottom: 140,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontFamily: fonts.heading.bold,
    fontSize: 32,
    color: theme.colors.text.primary,
    marginBottom: spacing.md,
  },

  card: {},

  supportSection: {
    padding: spacing.lg,
  },
  supportTitle: {
    fontFamily: fonts.heading.semibold,
    fontSize: 17,
    color: theme.colors.text.primary,
    marginBottom: spacing.sm,
  },
  supportText: {
    fontFamily: fonts.body.regular,
    fontSize: 15,
    color: theme.colors.text.secondary,
    marginBottom: spacing.xs,
  },
  supportCredit: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: theme.colors.text.tertiary,
    marginTop: spacing.xs,
  },

  // Section Header (flat – no expand/collapse)
  sectionHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 17,
    color: theme.colors.text.primary,
  },
  sectionSubtitle: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 2,
    marginLeft: 28, // align with title after icon
  },

  // Section Content
  sectionContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: spacing.md,
  },

  // Options
  optionLabel: {
    fontFamily: fonts.body.medium,
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  optionDescription: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: spacing.md,
  },
  optionDescriptionSmall: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: theme.colors.text.tertiary,
    marginTop: 1,
  },
  subOptionLabel: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  
  // Prayer Reminder Styles
  prayerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  prayerIcon: {
    fontSize: 22,
  },
  subSectionTitle: {
    fontFamily: fonts.body.semiBold,
    fontSize: 13,
    color: theme.colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },

  // Notification Options
  masterToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
  },
  divider: {
    height: 1,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    marginVertical: spacing.md,
  },
  notifOption: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  notifOptionMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  notifSubOption: {
    marginTop: spacing.sm,
    paddingLeft: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  },
  notifSubOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  // Davening add-ons dropdown
  daveningAddOnsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  daveningAddOnsChevron: {
    marginRight: 2,
  },
  daveningAddOnsDropdown: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    paddingLeft: spacing.xs,
  },
  daveningAddOnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  daveningAddOnsRowLast: {
    marginBottom: 0,
  },
  daveningAddOnsRowLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: spacing.md,
  },
  daveningAddOnsRowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  simpleToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  timeButton: {
    backgroundColor: 'rgba(212, 165, 184, 0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    minWidth: 90,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(212, 165, 184, 0.35)' : 'rgba(212, 165, 184, 0.3)',
  },
  timeButtonText: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: theme.colors.primary.dark,
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: theme.isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  timePickerBox: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    ...shadows.lg,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  timePickerHeader: {
    marginBottom: spacing.xs,
  },
  timePickerTitle: {
    ...textStyles.h3,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  timePickerSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  timePickerWheelWrap: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  timePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  timePickerCancel: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  timePickerCancelText: {
    fontFamily: fonts.body.medium,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  timePickerSave: {
    backgroundColor: theme.colors.primary.main,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  timePickerSaveText: {
    fontFamily: fonts.body.medium,
    fontSize: 16,
    color: theme.colors.primary.contrast,
  },
  shekiyaMinuteChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    margin: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
  },
  shekiyaMinuteChipSelected: {
    backgroundColor: theme.colors.primary.main,
  },
  shekiyaMinuteChipText: {
    fontFamily: fonts.body.medium,
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  shekiyaMinuteChipTextSelected: {
    color: theme.colors.primary.contrast,
  },
  minuteSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  minuteOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.03)',
    minWidth: 40,
    alignItems: 'center',
  },
  minuteOptionActive: {
    backgroundColor: theme.colors.primary.main,
  },
  minuteOptionText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  minuteOptionTextActive: {
    color: '#fff',
  },

  // Custom Reminders
  customRemindersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 40,
  },
  addReminderButton: {
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    minHeight: 36,
    justifyContent: 'center',
    shadowColor: theme.colors.primary.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addReminderButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 13,
    color: '#fff',
  },
  customReminderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    minHeight: 60,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  customReminderLeft: {
    flex: 1,
  },
  customReminderTitle: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  customReminderTime: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  customReminderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reminderMenuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderMenuButtonText: {
    fontSize: 18,
    color: theme.colors.text.secondary,
    fontWeight: '700',
  },
  reminderMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderMenuBox: {
    minWidth: 160,
    backgroundColor: theme.isDark ? '#1C1B24' : '#FFFFFF',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  reminderMenuItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
  },
  reminderMenuItemLast: {
    borderBottomWidth: 0,
  },
  reminderMenuItemTitle: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  reminderMenuItemDestructive: {
    color: theme.colors.semantic.error,
  },
  noRemindersMessage: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    borderRadius: borderRadius.md,
  },
  noRemindersText: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  noRemindersSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginTop: 4,
  },

  // Additional Reminders section
  additionalRemindersSectionTitle: {
    fontFamily: fonts.body.semiBold,
    fontSize: 13,
    color: theme.colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  additionalRemindersContainer: {},
  additionalReminderItem: {
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    paddingVertical: spacing.md + spacing.xs,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    marginBottom: spacing.md,
  },
  additionalReminderItemLast: {
    marginBottom: spacing.sm,
  },
  toggleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  toggleGridItem: {
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 44,
  },
  toggleGridLabel: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: spacing.xs,
  },

  // Nusach
  nusachContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  nusachOption: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0, 0, 0, 0.03)',
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  nusachOptionActive: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.dark,
    shadowColor: theme.colors.primary.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  nusachText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  nusachSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  nusachTextActive: {
    color: '#fff',
  },

  // Location
  locationInfo: {
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  locationCity: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  locationCoords: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  updateButton: {
    backgroundColor: theme.colors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
    shadowColor: theme.colors.primary.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  updateButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: '#fff',
  },

  // Display
  appearanceSection: {
    flexDirection: 'column',
    marginBottom: spacing.md,
  },
  themeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  themeOption: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
  },
  themeOptionActive: {
    backgroundColor: theme.colors.primary.main,
  },
  themeOptionText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  themeOptionTextActive: {
    color: '#fff',
  },
  displayOption: {
    marginBottom: spacing.md,
  },
  textSizeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  textSizeOption: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSizeOptionActive: {
    backgroundColor: theme.colors.primary.main,
  },
  textSizeText: {
    fontFamily: fonts.body.semiBold,
    color: theme.colors.text.secondary,
  },
  textSizeTextActive: {
    color: '#fff',
  },

  // Offline
  downloadProgress: {
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary.main,
    borderRadius: 4,
  },
  progressText: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  offlineButtons: {
    gap: spacing.sm,
  },
  downloadButton: {
    backgroundColor: theme.colors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  downloadButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: '#fff',
  },
  clearButton: {
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  clearButtonText: {
    fontFamily: fonts.body.medium,
    fontSize: 15,
    color: theme.colors.text.secondary,
  },

  // About
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  aboutLabel: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  aboutValue: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  link: {
    color: theme.colors.primary.main,
    textDecorationLine: 'underline',
  },
  attribution: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
  resetSection: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  resetButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  resetButtonText: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: '#D45555',
  },

  refuahModalBox: {
    marginHorizontal: spacing.lg,
    maxWidth: 420,
    width: '100%' as const,
    alignSelf: 'center',
    backgroundColor: theme.isDark ? 'rgba(28,26,40,0.98)' : '#fff',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
  },
  refuahNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  },
  refuahNameRowText: {
    flex: 1,
  },
  refuahNamePreview: {
    fontFamily: fonts.body.medium,
    fontSize: 17,
    color: theme.colors.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  refuahNameSub: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  refuahNameEditBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  refuahNameEditTxt: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: theme.colors.primary.main,
  },
  refuahNameDeleteBtn: {
    padding: spacing.sm,
  },
  addRefuahButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    alignItems: 'center',
  },
  addRefuahButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: theme.colors.primary.main,
  },
  refuahGenderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  refuahGenderChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  refuahGenderChipActive: {
    borderColor: theme.colors.primary.main,
    backgroundColor: theme.isDark ? 'rgba(124,92,255,0.12)' : 'rgba(124,92,255,0.08)',
  },
  refuahGenderChipText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  refuahTextInput: {
    fontFamily: fonts.body.regular,
    fontSize: 18,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },

  // Branding
  brandingSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  appName: {
    fontFamily: fonts.heading.bold,
    fontSize: 28,
    color: theme.colors.primary.main,
  },
  tagline: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: theme.colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  });
}
