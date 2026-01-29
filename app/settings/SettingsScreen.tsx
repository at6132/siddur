import React, { useEffect, useState } from 'react';
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
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
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
} from '../../src/types/preferences';

// Glass Card Component
const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: any;
}> = ({ children, style }) => (
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

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingContent, setDownloadingContent] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [expandedSection, setExpandedSection] = useState<string | null>('notifications');
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const prefs = await UserPreferencesService.getPreferences();
    setPreferences(prefs);
    setLoading(false);
  };

  const updateNotificationPreference = async (
    key: keyof NotificationPreferences,
    value: boolean | string | number
  ) => {
    if (!preferences) return;

    const updated = {
      ...preferences.notifications,
      [key]: value,
    };

    await UserPreferencesService.setNotificationPreferences(updated);
    await NotificationService.reschedule();
    loadPreferences();
  };

  const updateDisplayPreference = async (
    key: keyof DisplayPreferences,
    value: string | boolean
  ) => {
    if (!preferences) return;
    await UserPreferencesService.setDisplayPreferences({ [key]: value });
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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading || !preferences) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </View>
    );
  }

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
        {/* Header */}
        <FadeIn delay={0}>
          <Text style={styles.pageTitle}>Settings</Text>
        </FadeIn>

        {/* ============ NOTIFICATIONS SECTION ============ */}
        <FadeIn delay={50}>
          <GlassCard style={styles.card}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('notifications')}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>🔔</Text>
                <Text style={styles.sectionTitle}>Notifications</Text>
              </View>
              <Text style={styles.expandIcon}>
                {expandedSection === 'notifications' ? '−' : '+'}
              </Text>
            </TouchableOpacity>

            {expandedSection === 'notifications' && (
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
                    trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                    thumbColor={preferences.notifications.enabled ? colors.primary.main : colors.neutral[400]}
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
                            loadPreferences();
                          }}
                          trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                          thumbColor={preferences.notifications.prayerReminders?.shacharis?.enabled ? colors.primary.main : colors.neutral[400]}
                        />
                      </View>
                      {preferences.notifications.prayerReminders?.shacharis?.enabled && (
                        <View style={styles.notifSubOption}>
                          <View style={styles.notifSubOptionRow}>
                            <Text style={styles.subOptionLabel}>Daily at</Text>
                            <View style={styles.timeButton}>
                              <Text style={styles.timeButtonText}>
                                {preferences.notifications.prayerReminders?.shacharis?.time || '7:00 AM'}
                              </Text>
                            </View>
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
                            loadPreferences();
                          }}
                          trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                          thumbColor={preferences.notifications.prayerReminders?.mincha?.enabled ? colors.primary.main : colors.neutral[400]}
                        />
                      </View>
                      {preferences.notifications.prayerReminders?.mincha?.enabled && (
                        <View style={styles.notifSubOption}>
                          <View style={styles.notifSubOptionRow}>
                            <Text style={styles.subOptionLabel}>Daily at</Text>
                            <View style={styles.timeButton}>
                              <Text style={styles.timeButtonText}>
                                {preferences.notifications.prayerReminders?.mincha?.time || '1:00 PM'}
                              </Text>
                            </View>
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
                            loadPreferences();
                          }}
                          trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                          thumbColor={preferences.notifications.prayerReminders?.maariv?.enabled ? colors.primary.main : colors.neutral[400]}
                        />
                      </View>
                      {preferences.notifications.prayerReminders?.maariv?.enabled && (
                        <View style={styles.notifSubOption}>
                          <View style={styles.notifSubOptionRow}>
                            <Text style={styles.subOptionLabel}>Daily at</Text>
                            <View style={styles.timeButton}>
                              <Text style={styles.timeButtonText}>
                                {preferences.notifications.prayerReminders?.maariv?.time || '8:00 PM'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>

                    <View style={styles.divider} />
                    <Text style={styles.subSectionTitle}>Other Reminders</Text>

                    {/* Daily Tehillim */}
                    <View style={styles.notifOption}>
                      <View style={styles.notifOptionMain}>
                        <Text style={styles.optionLabel}>Daily Tehillim</Text>
                        <Switch
                          value={preferences.notifications.dailyTehillim}
                          onValueChange={(value) => updateNotificationPreference('dailyTehillim', value)}
                          trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                          thumbColor={preferences.notifications.dailyTehillim ? colors.primary.main : colors.neutral[400]}
                        />
                      </View>
                      {preferences.notifications.dailyTehillim && (
                        <View style={styles.notifSubOption}>
                          <View style={styles.notifSubOptionRow}>
                            <Text style={styles.subOptionLabel}>Remind me at</Text>
                            <TouchableOpacity style={styles.timeButton}>
                              <Text style={styles.timeButtonText}>
                                {preferences.notifications.dailyTehillimTime || '9:00 AM'}
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
                                loadPreferences();
                              }}
                              trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                              thumbColor={reminder.enabled ? colors.primary.main : colors.neutral[400]}
                            />
                            <TouchableOpacity
                              style={styles.deleteReminderButton}
                              onPress={async () => {
                                Alert.alert(
                                  'Delete Reminder',
                                  `Delete "${reminder.title}"?`,
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Delete',
                                      style: 'destructive',
                                      onPress: async () => {
                                        await UserPreferencesService.deleteCustomReminder(reminder.id);
                                        loadPreferences();
                                      },
                                    },
                                  ]
                                );
                              }}
                            >
                              <Text style={styles.deleteReminderText}>×</Text>
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

                    <View style={styles.divider} />

                    {/* Other Toggles - Grid Layout */}
                    <Text style={styles.subSectionTitle}>Additional Reminders</Text>
                    <View style={styles.toggleGrid}>
                      <View style={styles.toggleGridItem}>
                        <Text style={styles.toggleGridLabel}>Hallel / Special Days</Text>
                        <Switch
                          value={preferences.notifications.hallelAnenu}
                          onValueChange={(value) => updateNotificationPreference('hallelAnenu', value)}
                          trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                          thumbColor={preferences.notifications.hallelAnenu ? colors.primary.main : colors.neutral[400]}
                        />
                      </View>

                      <View style={styles.toggleGridItem}>
                        <Text style={styles.toggleGridLabel}>Rosh Chodesh</Text>
                        <Switch
                          value={preferences.notifications.roshChodesh}
                          onValueChange={(value) => updateNotificationPreference('roshChodesh', value)}
                          trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                          thumbColor={preferences.notifications.roshChodesh ? colors.primary.main : colors.neutral[400]}
                        />
                      </View>

                      <View style={styles.toggleGridItem}>
                        <Text style={styles.toggleGridLabel}>Fast Days</Text>
                        <Switch
                          value={preferences.notifications.fastDays}
                          onValueChange={(value) => updateNotificationPreference('fastDays', value)}
                          trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                          thumbColor={preferences.notifications.fastDays ? colors.primary.main : colors.neutral[400]}
                        />
                      </View>

                      <View style={styles.toggleGridItem}>
                        <Text style={styles.toggleGridLabel}>Sefiras HaOmer</Text>
                        <Switch
                          value={preferences.notifications.sefirasHaomer}
                          onValueChange={(value) => updateNotificationPreference('sefirasHaomer', value)}
                          trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                          thumbColor={preferences.notifications.sefirasHaomer ? colors.primary.main : colors.neutral[400]}
                        />
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}
          </GlassCard>
        </FadeIn>

        {/* ============ NUSACH SECTION ============ */}
        <FadeIn delay={100}>
          <GlassCard style={styles.card}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('nusach')}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>📜</Text>
                <Text style={styles.sectionTitle}>Nusach</Text>
              </View>
              <Text style={styles.currentValue}>
                {preferences.nusach === 'ashkenaz' ? 'Ashkenaz' : 'Sfard'}
              </Text>
            </TouchableOpacity>

            {expandedSection === 'nusach' && (
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
            )}
          </GlassCard>
        </FadeIn>

        {/* ============ LOCATION SECTION ============ */}
        <FadeIn delay={150}>
          <GlassCard style={styles.card}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('location')}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>📍</Text>
                <Text style={styles.sectionTitle}>Location</Text>
              </View>
              <Text style={styles.currentValue}>
                {preferences.location?.cityName || 'Not set'}
              </Text>
            </TouchableOpacity>

            {expandedSection === 'location' && (
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
            )}
          </GlassCard>
        </FadeIn>

        {/* ============ DISPLAY SECTION ============ */}
        <FadeIn delay={200}>
          <GlassCard style={styles.card}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('display')}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>🎨</Text>
                <Text style={styles.sectionTitle}>Display</Text>
              </View>
              <Text style={styles.expandIcon}>
                {expandedSection === 'display' ? '−' : '+'}
              </Text>
            </TouchableOpacity>

            {expandedSection === 'display' && (
              <View style={styles.sectionContent}>
                {/* Text Size */}
                <View style={styles.displayOption}>
                  <Text style={styles.optionLabel}>Text Size</Text>
                  <View style={styles.textSizeSelector}>
                    {(['small', 'medium', 'large'] as const).map((size) => (
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
                          { fontSize: size === 'small' ? 14 : size === 'medium' ? 16 : 18 },
                          preferences.display?.textSize === size && styles.textSizeTextActive,
                        ]}>
                          A
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Show English */}
                <View style={styles.simpleToggle}>
                  <Text style={styles.optionLabel}>Show English Translation</Text>
                  <Switch
                    value={preferences.display?.showEnglish ?? true}
                    onValueChange={(value) => updateDisplayPreference('showEnglish', value)}
                    trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                    thumbColor={preferences.display?.showEnglish ? colors.primary.main : colors.neutral[400]}
                  />
                </View>

                {/* Show Transliteration */}
                <View style={styles.simpleToggle}>
                  <Text style={styles.optionLabel}>Show Transliteration</Text>
                  <Switch
                    value={preferences.display?.showTransliteration ?? false}
                    onValueChange={(value) => updateDisplayPreference('showTransliteration', value)}
                    trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                    thumbColor={preferences.display?.showTransliteration ? colors.primary.main : colors.neutral[400]}
                  />
                </View>
              </View>
            )}
          </GlassCard>
        </FadeIn>

        {/* ============ OFFLINE CONTENT SECTION ============ */}
        <FadeIn delay={250}>
          <GlassCard style={styles.card}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('offline')}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>📥</Text>
                <Text style={styles.sectionTitle}>Offline Content</Text>
              </View>
              <Text style={styles.expandIcon}>
                {expandedSection === 'offline' ? '−' : '+'}
              </Text>
            </TouchableOpacity>

            {expandedSection === 'offline' && (
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
            )}
          </GlassCard>
        </FadeIn>

        {/* ============ ABOUT SECTION ============ */}
        <FadeIn delay={300}>
          <GlassCard style={styles.card}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('about')}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>ℹ️</Text>
                <Text style={styles.sectionTitle}>About</Text>
              </View>
              <Text style={styles.expandIcon}>
                {expandedSection === 'about' ? '−' : '+'}
              </Text>
            </TouchableOpacity>

            {expandedSection === 'about' && (
              <View style={styles.sectionContent}>
                <View style={styles.aboutRow}>
                  <Text style={styles.aboutLabel}>Version</Text>
                  <Text style={styles.aboutValue}>1.0.0</Text>
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
            )}
          </GlassCard>
        </FadeIn>

        {/* App Logo/Branding */}
        <FadeIn delay={350}>
          <View style={styles.brandingSection}>
            <Text style={styles.appName}>24/7</Text>
            <Text style={styles.tagline}>With you, when you choose.</Text>
          </View>
        </FadeIn>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
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
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },

  // Glass Card
  glassCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  glassBlur: {
    overflow: 'hidden',
  },
  glassInner: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  card: {},

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
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
    color: colors.text.primary,
  },
  expandIcon: {
    fontSize: 20,
    color: colors.text.tertiary,
    fontWeight: '300',
  },
  currentValue: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.text.secondary,
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
    color: colors.text.primary,
  },
  optionDescription: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  optionDescriptionSmall: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  subOptionLabel: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text.secondary,
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
    color: colors.text.tertiary,
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
    backgroundColor: 'rgba(0,0,0,0.08)',
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
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  notifSubOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  simpleToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  timeButton: {
    backgroundColor: 'rgba(212, 165, 184, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  timeButtonText: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.primary.dark,
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
    backgroundColor: colors.primary.main,
  },
  minuteOptionText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.text.secondary,
  },
  minuteOptionTextActive: {
    color: '#fff',
  },

  // Sub-section title
  subSectionTitle: {
    fontFamily: fonts.body.semiBold,
    fontSize: 13,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },

  // Custom Reminders
  customRemindersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addReminderButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
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
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  customReminderLeft: {
    flex: 1,
  },
  customReminderTitle: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: colors.text.primary,
  },
  customReminderTime: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  customReminderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteReminderButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(212, 165, 165, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteReminderText: {
    fontSize: 18,
    color: colors.semantic.error,
    fontWeight: 'bold',
  },
  noRemindersMessage: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: borderRadius.md,
  },
  noRemindersText: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.text.secondary,
  },
  noRemindersSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 4,
  },

  // Toggle Grid
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
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.xs,
  },

  // Nusach
  nusachContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  nusachOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    alignItems: 'center',
  },
  nusachOptionActive: {
    backgroundColor: colors.primary.main,
  },
  nusachText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
    color: colors.text.secondary,
  },
  nusachSubtext: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  nusachTextActive: {
    color: '#fff',
  },

  // Location
  locationInfo: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  locationCity: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
    color: colors.text.primary,
  },
  locationCoords: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  updateButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  updateButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: '#fff',
  },

  // Display
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
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSizeOptionActive: {
    backgroundColor: colors.primary.main,
  },
  textSizeText: {
    fontFamily: fonts.body.semiBold,
    color: colors.text.secondary,
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
    backgroundColor: colors.primary.main,
    borderRadius: 4,
  },
  progressText: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.text.secondary,
  },
  offlineButtons: {
    gap: spacing.sm,
  },
  downloadButton: {
    backgroundColor: colors.primary.main,
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
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  clearButtonText: {
    fontFamily: fonts.body.medium,
    fontSize: 15,
    color: colors.text.secondary,
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
    color: colors.text.secondary,
  },
  aboutValue: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.text.primary,
  },
  link: {
    color: colors.primary.main,
    textDecorationLine: 'underline',
  },
  attribution: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.tertiary,
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

  // Branding
  brandingSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  appName: {
    fontFamily: fonts.heading.bold,
    fontSize: 28,
    color: colors.primary.main,
  },
  tagline: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});
