import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FadeIn } from '../../components/animations/FadeIn';
import { BackButton } from '../../components/ui/BackButton';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { NotificationService } from '../../src/notifications/NotificationService';
import { CustomReminder, CustomReminderOpenToScreen } from '../../src/types/preferences';
import { track, RELIABILITY_EVENTS } from '../../src/analytics';

// Glass Card Component
const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: any;
}> = ({ children, style }) => (
  <View style={[styles.glassCard, style]}>
    {Platform.OS !== 'web' ? (
      <BlurView intensity={80} tint="light" style={styles.glassBlur}>
        <View style={styles.glassInner}>{children}</View>
      </BlurView>
    ) : (
      <LinearGradient
        colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
        style={styles.glassBlur}
      >
        <View style={styles.glassInner}>{children}</View>
      </LinearGradient>
    )}
  </View>
);

function parseTime(timeStr: string): { hour: number; minute: number; ampm: 'AM' | 'PM' } {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = Math.min(59, Math.max(0, parseInt(match[2], 10)));
    const ampm = (match[3].toUpperCase() === 'AM' ? 'AM' : 'PM') as 'AM' | 'PM';
    if (hour === 0) hour = 12;
    if (hour > 12) hour = 12;
    if (hour < 1) hour = 1;
    return { hour, minute, ampm };
  }
  return { hour: 9, minute: 0, ampm: 'AM' as const };
}

function formatTime(hour: number, minute: number, ampm: 'AM' | 'PM'): string {
  const h = Math.min(12, Math.max(1, Math.floor(hour)));
  const m = Math.min(59, Math.max(0, Math.floor(minute)));
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

const DAYS = [
  { id: 'sun', label: 'Sun' },
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
];

const OPEN_TO_OPTIONS: { value: CustomReminderOpenToScreen; label: string }[] = [
  { value: 'Home', label: 'Home' },
  { value: 'TehillimList', label: 'Tehillim' },
  { value: 'Gratitude', label: 'Daily Gratitude' },
  { value: 'Habits', label: 'Habits' },
  { value: 'Omer', label: 'Omer' },
  { value: 'DailyGoals', label: 'Daily Goals' },
  { value: 'HubOverview', label: 'Hub' },
  { value: 'Calendar', label: 'Calendar' },
  { value: 'Library', label: 'Library' },
  { value: 'Settings', label: 'Settings' },
];

type AddCustomReminderParams = { reminder?: CustomReminder };

export const AddCustomReminderScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: AddCustomReminderParams }, 'params'>>();
  const editingReminder = route.params?.reminder ?? null;
  const isEdit = !!editingReminder;

  const [title, setTitle] = useState(editingReminder?.title ?? '');
  const [message, setMessage] = useState(editingReminder?.message ?? '');
  const [selectedTime, setSelectedTime] = useState(editingReminder?.time ?? '9:00 AM');
  const [selectedDays, setSelectedDays] = useState<string[]>(editingReminder?.days ?? ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
  const [saving, setSaving] = useState(false);
  // Local strings for hour/minute so typing isn't overwritten by derived state
  const [hourStr, setHourStr] = useState(() => editingReminder ? String(parseTime(editingReminder.time).hour) : '9');
  const [minuteStr, setMinuteStr] = useState(() => editingReminder ? parseTime(editingReminder.time).minute.toString().padStart(2, '0') : '00');
  const [hourFocused, setHourFocused] = useState(false);
  const [minuteFocused, setMinuteFocused] = useState(false);
  const [openToScreen, setOpenToScreen] = useState<CustomReminderOpenToScreen>(
    editingReminder?.openToScreen ?? 'Home'
  );

  const { hour, minute, ampm } = parseTime(selectedTime);

  // Sync hour/minute strings when selectedTime changes (e.g. AM/PM) and field isn't focused
  useEffect(() => {
    if (!hourFocused) setHourStr(String(hour));
    if (!minuteFocused) setMinuteStr(minute.toString().padStart(2, '0'));
  }, [selectedTime, hour, minute, hourFocused, minuteFocused]);

  const commitHour = () => {
    const n = parseInt(hourStr.replace(/\D/g, ''), 10);
    const h = (isNaN(n) || n < 1) ? hour : Math.min(12, Math.max(1, n));
    const next = formatTime(h, minute, ampm);
    setSelectedTime(next);
    setHourStr(String(parseTime(next).hour));
  };
  const commitMinute = () => {
    const n = parseInt(minuteStr.replace(/\D/g, ''), 10);
    const m = (isNaN(n) || n < 0) ? minute : Math.min(59, Math.max(0, n));
    const next = formatTime(hour, m, ampm);
    setSelectedTime(next);
    setMinuteStr(parseTime(next).minute.toString().padStart(2, '0'));
  };

  /** Build and validate time from current inputs; return formatted string or null if invalid */
  const getValidTimeOnSubmit = (): string | null => {
    const h = parseInt(hourStr.replace(/\D/g, ''), 10);
    const m = parseInt(minuteStr.replace(/\D/g, ''), 10);
    if (isNaN(h) || h < 1 || h > 12) return null;
    if (isNaN(m) || m < 0 || m > 59) return null;
    return formatTime(h, m, ampm);
  };

  const setAmpm = (a: 'AM' | 'PM') => setSelectedTime(formatTime(hour, minute, a));

  const toggleDay = (dayId: string) => {
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter(d => d !== dayId));
      }
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      track(RELIABILITY_EVENTS.VALIDATION_ERROR, { field: 'title', reason_code: 'missing' });
      Alert.alert('Missing Title', 'Please enter a title for your reminder.');
      return;
    }

    const timeToSave = getValidTimeOnSubmit();
    if (timeToSave === null) {
      track(RELIABILITY_EVENTS.VALIDATION_ERROR, { field: 'time', reason_code: 'invalid_range' });
      Alert.alert(
        'Invalid time',
        'Please enter a valid time: hour 1–12, minute 00–59.'
      );
      return;
    }

    setSaving(true);
    try {
      if (isEdit && editingReminder) {
        await UserPreferencesService.updateCustomReminder(editingReminder.id, {
          title: title.trim(),
          message: message.trim() || title.trim(),
          time: timeToSave,
          days: selectedDays as ('sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat')[],
          openToScreen,
        });
        const prefs = await UserPreferencesService.getPreferences();
        await NotificationService.reschedule(prefs ?? undefined);
        Alert.alert('Reminder Updated', `"${title}" will remind you daily at ${timeToSave}.`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        const reminder: CustomReminder = {
          id: `reminder-${Date.now()}`,
          title: title.trim(),
          message: message.trim() || title.trim(),
          time: timeToSave,
          enabled: true,
          days: selectedDays as ('sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat')[],
          openToScreen,
        };
        await UserPreferencesService.addCustomReminder(reminder);
        const prefs = await UserPreferencesService.getPreferences();
        await NotificationService.reschedule(prefs ?? undefined);
        Alert.alert('Reminder Added', `"${title}" will remind you daily at ${timeToSave}.`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error saving reminder:', error);
      Alert.alert('Error', 'Failed to save reminder. Please try again.');
    } finally {
      setSaving(false);
    }
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
        keyboardShouldPersistTaps={Platform.OS === 'ios' ? 'never' : 'handled'}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <FadeIn delay={0}>
          <View style={styles.header}>
            <BackButton onPress={() => navigation.goBack()} label="Cancel" style={styles.backButton} />
            <Text style={styles.title}>{isEdit ? 'Edit Reminder' : 'New Reminder'}</Text>
            <Text style={styles.subtitle}>{isEdit ? 'Update your custom daily reminder' : 'Set a custom daily reminder'}</Text>
          </View>
        </FadeIn>

        {/* Title Input */}
        <FadeIn delay={50}>
          <GlassCard>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Say Modeh Ani"
              placeholderTextColor={colors.text.tertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={50}
              inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
            />
          </GlassCard>
        </FadeIn>

        {/* Message Input */}
        <FadeIn delay={100}>
          <GlassCard>
            <Text style={styles.inputLabel}>Message (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textInputMultiline]}
              placeholder="Custom notification message..."
              placeholderTextColor={colors.text.tertiary}
              value={message}
              onChangeText={setMessage}
              maxLength={150}
              multiline
              numberOfLines={3}
              inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
            />
          </GlassCard>
        </FadeIn>

        {/* Time Selection – any hour, any minute */}
        <FadeIn delay={150}>
          <GlassCard>
            <Text style={styles.inputLabel}>Time</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeInputWrap}>
                <Text style={styles.timeInputLabel}>Hour</Text>
                <TextInput
                  style={styles.timeInput}
                  value={hourStr}
                  onChangeText={(t) => setHourStr(t.replace(/\D/g, '').slice(0, 2))}
                  onFocus={() => setHourFocused(true)}
                  onBlur={() => { setHourFocused(false); commitHour(); }}
                  keyboardType="number-pad"
                  placeholder="9"
                  placeholderTextColor={colors.text.tertiary}
                  inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
                />
              </View>
              <Text style={styles.timeColon}>:</Text>
              <View style={styles.timeInputWrap}>
                <Text style={styles.timeInputLabel}>Minute</Text>
                <TextInput
                  style={styles.timeInput}
                  value={minuteStr}
                  onChangeText={(t) => setMinuteStr(t.replace(/\D/g, '').slice(0, 2))}
                  onFocus={() => setMinuteFocused(true)}
                  onBlur={() => { setMinuteFocused(false); commitMinute(); }}
                  keyboardType="number-pad"
                  placeholder="00"
                  placeholderTextColor={colors.text.tertiary}
                  inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
                />
              </View>
              <View style={styles.ampmWrap}>
                <Text style={styles.timeInputLabel}>AM/PM</Text>
                <View style={styles.ampmRow}>
                  <TouchableOpacity
                    style={[styles.ampmButton, ampm === 'AM' && styles.ampmButtonSelected]}
                    onPress={() => setAmpm('AM')}
                  >
                    <Text style={[styles.ampmText, ampm === 'AM' && styles.ampmTextSelected]}>AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.ampmButton, ampm === 'PM' && styles.ampmButtonSelected]}
                    onPress={() => setAmpm('PM')}
                  >
                    <Text style={[styles.ampmText, ampm === 'PM' && styles.ampmTextSelected]}>PM</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <Text style={styles.timeHint}>Hour 1–12, minute 00–59</Text>
          </GlassCard>
        </FadeIn>

        {/* Days Selection */}
        <FadeIn delay={200}>
          <GlassCard>
            <Text style={styles.inputLabel}>Repeat on</Text>
            <View style={styles.daysContainer}>
              {DAYS.map((day) => (
                <TouchableOpacity
                  key={day.id}
                  style={[
                    styles.dayOption,
                    selectedDays.includes(day.id) && styles.dayOptionSelected,
                  ]}
                  onPress={() => toggleDay(day.id)}
                >
                  <Text style={[
                    styles.dayOptionText,
                    selectedDays.includes(day.id) && styles.dayOptionTextSelected,
                  ]}>
                    {day.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={() => setSelectedDays(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])}
            >
              <Text style={styles.selectAllText}>Select All Days</Text>
            </TouchableOpacity>
          </GlassCard>
        </FadeIn>

        {/* Open to screen */}
        <FadeIn delay={225}>
          <GlassCard>
            <Text style={styles.inputLabel}>When I tap this reminder, open</Text>
            <View style={styles.openToRow}>
              {OPEN_TO_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.openToChip,
                    openToScreen === opt.value && styles.openToChipSelected,
                  ]}
                  onPress={() => setOpenToScreen(opt.value)}
                >
                  <Text
                    style={[
                      styles.openToChipText,
                      openToScreen === opt.value && styles.openToChipTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </FadeIn>

        {/* Save Button */}
        <FadeIn delay={250}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Reminder'}
            </Text>
          </TouchableOpacity>
        </FadeIn>

        <View style={{ height: 100 }} />
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
    paddingTop: spacing.xl + spacing.safeTopInset,
  },

  // Header
  header: {
    marginBottom: spacing.lg,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    fontFamily: fonts.body.medium,
    fontSize: 16,
    color: colors.primary.dark,
  },
  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 28,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text.secondary,
  },

  // Glass Card
  glassCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.lg,
    shadowColor: colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  glassBlur: {
    overflow: 'hidden',
  },
  glassInner: {
    padding: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },

  // Input
  inputLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },
  textInput: {
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    minHeight: 50,
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Time Selection (any hour, any minute)
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  timeInputWrap: {
    flex: 1,
    minWidth: 64,
  },
  timeInputLabel: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: 4,
  },
  timeInput: {
    fontFamily: fonts.body.medium,
    fontSize: 18,
    color: colors.text.primary,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    minHeight: 48,
  },
  timeColon: {
    fontFamily: fonts.body.bold,
    fontSize: 22,
    color: colors.text.secondary,
    paddingBottom: spacing.sm,
  },
  ampmWrap: {
    minWidth: 88,
  },
  ampmRow: {
    flexDirection: 'row',
    gap: 4,
  },
  ampmButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  ampmButtonSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.dark,
  },
  ampmText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.secondary,
  },
  ampmTextSelected: {
    color: '#fff',
  },
  timeHint: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },

  // Days Selection
  daysContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: 4,
  },
  dayOption: {
    flex: 1,
    minWidth: 36,
    maxWidth: 48,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  dayOptionSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.dark,
    shadowColor: colors.primary.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dayOptionText: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.text.secondary,
  },
  dayOptionTextSelected: {
    color: '#fff',
  },
  selectAllButton: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  selectAllText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.primary.main,
    textDecorationLine: 'underline',
  },

  openToRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  openToChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  openToChipSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.dark,
  },
  openToChipText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.text.secondary,
  },
  openToChipTextSelected: {
    color: '#fff',
  },

  // Save Button
  saveButton: {
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
    minHeight: 56,
    justifyContent: 'center',
    shadowColor: colors.primary.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: fonts.body.bold,
    fontSize: 16,
    color: '#fff',
  },
});
