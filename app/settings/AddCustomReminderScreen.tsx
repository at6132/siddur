import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Platform, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Screen, Chip, GlassButton } from '../../components/ui';
import { PracticeHeader, PracticeField, GroupLabel, InlineError } from '../../components/hub/PracticeKit';
import { RoundToggle, TextAction } from '../../components/settings/SettingsKit';
import { useTheme } from '../../src/design/theme';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { NotificationService } from '../../src/notifications/NotificationService';
import { CustomReminder, CustomReminderOpenToScreen } from '../../src/types/preferences';
import { track, RELIABILITY_EVENTS } from '../../src/analytics';

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

type DayId = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

const DAYS: { id: DayId; label: string }[] = [
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
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;
  const route = useRoute<RouteProp<{ params: AddCustomReminderParams }, 'params'>>();
  const editingReminder = route.params?.reminder ?? null;
  const isEdit = !!editingReminder;

  const [title, setTitle] = useState(editingReminder?.title ?? '');
  const [message, setMessage] = useState(editingReminder?.message ?? '');
  const [selectedTime, setSelectedTime] = useState(editingReminder?.time ?? '9:00 AM');
  const [selectedDays, setSelectedDays] = useState<string[]>(
    editingReminder?.days ?? ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const fail = (message: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setError(message);
  };

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) {
      track(RELIABILITY_EVENTS.VALIDATION_ERROR, { field: 'title', reason_code: 'missing' });
      fail('Please enter a title for your reminder.');
      return;
    }

    const timeToSave = getValidTimeOnSubmit();
    if (timeToSave === null) {
      track(RELIABILITY_EVENTS.VALIDATION_ERROR, { field: 'time', reason_code: 'invalid_range' });
      fail('Please enter a valid time: hour 1 to 12, minute 00 to 59.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && editingReminder) {
        await UserPreferencesService.updateCustomReminder(editingReminder.id, {
          title: title.trim(),
          message: message.trim() || title.trim(),
          time: timeToSave,
          days: selectedDays as DayId[],
          openToScreen,
        });
        await NotificationService.requestPermissionsAndSchedule();
      } else {
        const reminder: CustomReminder = {
          id: `reminder-${Date.now()}`,
          title: title.trim(),
          message: message.trim() || title.trim(),
          time: timeToSave,
          enabled: true,
          days: selectedDays as DayId[],
          openToScreen,
        };
        await UserPreferencesService.addCustomReminder(reminder);
        await NotificationService.requestPermissionsAndSchedule();
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (e) {
      console.error('Error saving reminder:', e);
      fail('Failed to save reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const timeInputStyle = {
    backgroundColor: theme.colors.background.primary,
    borderColor: theme.colors.neutral[300],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    color: theme.colors.text.primary,
    fontFamily: type.fonts.body.medium,
    fontSize: type.fontSize.xl,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    textAlign: 'center' as const,
  };
  const iosDone = Platform.OS === 'ios' ? 'globalDone' : undefined;

  return (
    <Screen
      scroll
      bottomExtra={spacing['2xl']}
      header={
        <PracticeHeader
          title={isEdit ? 'Edit reminder' : 'New reminder'}
          subtitle={isEdit ? 'Update your custom daily reminder' : 'Set a custom daily reminder'}
          onBack={() => navigation.goBack()}
          backLabel="Cancel"
        />
      }
    >
      <PracticeField
        label="Title"
        placeholder="e.g., Say Modeh Ani"
        value={title}
        onChangeText={setTitle}
        maxLength={50}
        inputAccessoryViewID={iosDone}
      />

      <PracticeField
        label="Message (optional)"
        placeholder="Custom notification message"
        value={message}
        onChangeText={setMessage}
        maxLength={150}
        multiline
        inputAccessoryViewID={iosDone}
      />

      <View style={{ marginBottom: spacing.lg }}>
        <GroupLabel>Time</GroupLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TextInput
            accessibilityLabel="Hour"
            style={[timeInputStyle, { width: spacing['3xl'] }]}
            value={hourStr}
            onChangeText={(t) => setHourStr(t.replace(/\D/g, '').slice(0, 2))}
            onFocus={() => setHourFocused(true)}
            onBlur={() => { setHourFocused(false); commitHour(); }}
            keyboardType="number-pad"
            placeholder="9"
            placeholderTextColor={theme.colors.text.tertiary}
            inputAccessoryViewID={iosDone}
          />
          <Text style={[type.textStyles.h4, { color: theme.colors.text.secondary }]}>:</Text>
          <TextInput
            accessibilityLabel="Minute"
            style={[timeInputStyle, { width: spacing['3xl'] }]}
            value={minuteStr}
            onChangeText={(t) => setMinuteStr(t.replace(/\D/g, '').slice(0, 2))}
            onFocus={() => setMinuteFocused(true)}
            onBlur={() => { setMinuteFocused(false); commitMinute(); }}
            keyboardType="number-pad"
            placeholder="00"
            placeholderTextColor={theme.colors.text.tertiary}
            inputAccessoryViewID={iosDone}
          />
          <View style={{ flexDirection: 'row', gap: spacing.xs, marginLeft: spacing.xs }}>
            <Chip label="AM" selected={ampm === 'AM'} onPress={() => setAmpm('AM')} />
            <Chip label="PM" selected={ampm === 'PM'} onPress={() => setAmpm('PM')} />
          </View>
        </View>
        <Text
          style={[
            type.textStyles.caption,
            { color: theme.colors.text.tertiary, marginTop: spacing.sm, marginHorizontal: spacing.sm },
          ]}
        >
          Hour 1 to 12, minute 00 to 59
        </Text>
      </View>

      <View style={{ marginBottom: spacing.lg }}>
        <GroupLabel>Repeat on</GroupLabel>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {DAYS.map((day) => (
            <RoundToggle
              key={day.id}
              label={day.label}
              selected={selectedDays.includes(day.id)}
              onPress={() => toggleDay(day.id)}
              size={44}
            />
          ))}
        </View>
        <TextAction
          label="Select all days"
          onPress={() => setSelectedDays(DAYS.map((d) => d.id))}
        />
      </View>

      <View style={{ marginBottom: spacing.lg }}>
        <GroupLabel>When I tap this reminder, open</GroupLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {OPEN_TO_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={openToScreen === opt.value}
              onPress={() => setOpenToScreen(opt.value)}
            />
          ))}
        </View>
      </View>

      {error ? <InlineError message={error} /> : null}

      <GlassButton
        title={isEdit ? 'Save changes' : 'Create reminder'}
        onPress={handleSave}
        loading={saving}
        disabled={saving}
      />
    </Screen>
  );
};
