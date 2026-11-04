import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Linking,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import Constants from 'expo-constants';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LiquidGlassSegmentedControl } from '../../components/navigation/LiquidGlassSegmentedControl';
import { Screen, Section, ListRow, Chip } from '../../components/ui';
import { PracticeField, InlineError } from '../../components/hub/PracticeKit';
import {
  ToggleRow,
  ValueRow,
  CheckRow,
  SheetModal,
  PressableScale,
  IconButton,
  TextAction,
  Hairline,
} from '../../components/settings/SettingsKit';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { LEGAL, mailtoSupport } from '../../src/legal/links';
import { NotificationService } from '../../src/notifications/NotificationService';
import {
  UserPreferences,
  NotificationPreferences,
  DisplayPreferences,
  CustomReminder,
  RefuahPersonalName,
  RefuahPersonalNameGender,
} from '../../src/types/preferences';
import { useTheme } from '../../src/design/theme';

type SettingsRouteParams = {
  scrollTo?: 'dailyGratitude' | 'shabbosAlarm';
};

type TimePickerKind =
    | 'shacharis'
    | 'mincha'
    | 'maariv'
    | 'tehillim'
    | 'hallelAnenu'
    | 'roshChodesh'
    | 'fastDays'
    | 'dailyGratitude'
    | 'daveningYaalehVyavo'
    | 'daveningAlHanissim'
    | 'daveningMashivVtenTal'
    | 'daveningAneinu'
    | 'daveningNachem'
    | 'daveningAvinuMalkeinu'
    | 'daveningSelichos'
  | 'shabbosClock';

type PrayerKey = 'shacharis' | 'mincha' | 'maariv';

type SettingsTab = 'notifications' | 'general' | 'about';
const TAB_KEYS: SettingsTab[] = ['notifications', 'general', 'about'];

const TIME_PICKER_TITLES: Record<TimePickerKind, string> = {
  shabbosClock: 'Shabbos alarm',
  tehillim: 'Tehillim',
  hallelAnenu: 'Hallel',
  roshChodesh: 'Rosh Chodesh',
  fastDays: 'Fast days',
  dailyGratitude: 'Daily gratitude',
  daveningYaalehVyavo: "Yaaleh V'Yavo",
  daveningAlHanissim: 'Al HaNisim',
  daveningMashivVtenTal: "Mashiv HaRuach & V'ten Tal",
  daveningAneinu: 'Aneinu',
  daveningNachem: 'Nachem',
  daveningAvinuMalkeinu: 'Avinu Malkeinu',
  daveningSelichos: 'Selichos',
  shacharis: 'Shacharis',
  mincha: 'Mincha',
  maariv: 'Maariv',
};

const PRAYERS: { key: PrayerKey; title: string; subtitle: string; fallback: string }[] = [
  { key: 'shacharis', title: 'Shacharis', subtitle: 'Morning prayers', fallback: '7:00 AM' },
  { key: 'mincha', title: 'Mincha', subtitle: 'Afternoon prayers', fallback: '1:00 PM' },
  { key: 'maariv', title: 'Maariv', subtitle: 'Evening prayers', fallback: '8:00 PM' },
];

const DAVENING_ADDONS: {
  kind: TimePickerKind;
  label: string;
  enabledKey: keyof NotificationPreferences;
  timeKey: keyof NotificationPreferences;
}[] = [
  { kind: 'daveningYaalehVyavo', label: "Yaaleh V'Yavo", enabledKey: 'daveningAddOnsYaalehVyavo', timeKey: 'daveningAddOnsYaalehVyavoTime' },
  { kind: 'daveningAlHanissim', label: 'Al HaNisim', enabledKey: 'daveningAddOnsAlHanissim', timeKey: 'daveningAddOnsAlHanissimTime' },
  { kind: 'daveningMashivVtenTal', label: "Mashiv HaRuach & V'ten Tal Umatar", enabledKey: 'daveningAddOnsMashivVtenTal', timeKey: 'daveningAddOnsMashivVtenTalTime' },
  { kind: 'daveningAneinu', label: 'Aneinu', enabledKey: 'daveningAddOnsAneinu', timeKey: 'daveningAddOnsAneinuTime' },
  { kind: 'daveningNachem', label: 'Nachem', enabledKey: 'daveningAddOnsNachem', timeKey: 'daveningAddOnsNachemTime' },
  { kind: 'daveningAvinuMalkeinu', label: 'Avinu Malkeinu', enabledKey: 'daveningAddOnsAvinuMalkeinu', timeKey: 'daveningAddOnsAvinuMalkeinuTime' },
  { kind: 'daveningSelichos', label: 'Selichos', enabledKey: 'daveningAddOnsSelichos', timeKey: 'daveningAddOnsSelichosTime' },
];

const TEXT_SIZES = ['xsmall', 'small', 'medium', 'large'] as const;
const SHEKIYA_MINUTES = [5, 10, 15, 20, 25, 30, 45, 60];

/** Small value button shown before a switch (reminder time). */
const TimePill: React.FC<{ text: string; onPress: () => void; label: string }> = ({ text, onPress, label }) => {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={label}
      style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xs }}
    >
      <Text style={[type.textStyles.label, { color: theme.colors.primary.dark, fontSize: type.fontSize.base }]}>
        {text}
      </Text>
    </PressableScale>
  );
};

/** Labeled slider used for the Shabbos alarm ring duration. */
const DurationSlider: React.FC<{
  label: string;
  valueText: string;
  value: number;
  max: number;
  disabled?: boolean;
  onValueChange: (v: number) => void;
  onSlidingComplete: (v: number) => void;
}> = ({ label, valueText, value, max, disabled, onValueChange, onSlidingComplete }) => {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  return (
    <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[type.textStyles.body, { color: theme.colors.text.primary }]}>{label}</Text>
        <Text style={[type.textStyles.body, { color: theme.colors.primary.dark }]}>{valueText}</Text>
      </View>
      <Slider
        style={{ height: 44, marginTop: spacing.xs }}
        minimumValue={0}
        maximumValue={max}
        step={1}
        value={value}
        disabled={disabled}
        accessibilityLabel={label}
        onValueChange={onValueChange}
        onSlidingComplete={(v) => {
          void Haptics.selectionAsync();
          onSlidingComplete(v);
        }}
        minimumTrackTintColor={theme.colors.primary.main}
        maximumTrackTintColor={theme.colors.neutral[300]}
        thumbTintColor={theme.colors.primary.main}
      />
    </View>
  );
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ Settings: SettingsRouteParams }, 'Settings'>>();
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const shabbosAlarmBlockRef = useRef<View>(null);
  const gratitudeBlockRef = useRef<View>(null);
  const [reminderMenuId, setReminderMenuId] = useState<string | null>(null);
  const [timePickerFor, setTimePickerFor] = useState<TimePickerKind | null>(null);
  const [daveningAddOnsExpanded, setDaveningAddOnsExpanded] = useState(false);
  const [refuahNameModalVisible, setRefuahNameModalVisible] = useState(false);
  const [refuahEditingId, setRefuahEditingId] = useState<string | null>(null);
  const [refuahDraftGender, setRefuahDraftGender] = useState<RefuahPersonalNameGender>('male');
  const [refuahDraftName, setRefuahDraftName] = useState('');
  const [refuahDraftMother, setRefuahDraftMother] = useState('');
  const [refuahError, setRefuahError] = useState<string | null>(null);
  const [timePickerValue, setTimePickerValue] = useState('');
  const [pickerDate, setPickerDate] = useState(() => new Date());
  const [shekiyaMinutesPickerOpen, setShekiyaMinutesPickerOpen] = useState(false);
  /** Shabbos alarm ring duration (sliders) — local until saved onSlidingComplete */
  const [shabbosRingMin, setShabbosRingMin] = useState(1);
  const [shabbosRingSec, setShabbosRingSec] = useState(0);
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

  const openTimePicker = (which: TimePickerKind) => {
    if (!preferences) return;
    const n = preferences.notifications;
    let initial: string;
    if (which === 'shabbosClock') initial = formatTehillimTimeForDisplay(n.shabbosClockTime || '08:00');
    else if (which === 'tehillim') initial = formatTehillimTimeForDisplay(n.dailyTehillimTime || '09:00');
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
    const keyMap: Partial<Record<TimePickerKind, keyof NotificationPreferences>> = {
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
      shabbosClock: 'shabbosClockTime',
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
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    const st = route.params?.scrollTo;
    if (!st || loading) return;

    setActiveTab('notifications');

    const clearScrollParam = () => {
      (navigation as unknown as { setParams: (p: Record<string, unknown>) => void }).setParams({ scrollTo: undefined });
    };

    const scrollToBlock = (block: View | null, fallbackY: number) => {
        const scroller = scrollViewRef.current;
        if (block && scroller) {
        block.measureInWindow((ex: number, ey: number) => {
          (scroller as any).measureInWindow((sx: number, sy: number) => {
            const y = Math.max(0, ey - sy - spacing.sm);
              scroller.scrollTo({ y, animated: true });
              clearScrollParam();
            });
          });
        } else {
        scroller?.scrollTo({ y: fallbackY, animated: true });
          clearScrollParam();
        }
    };

    if (st === 'dailyGratitude') {
      const t = setTimeout(() => scrollToBlock(gratitudeBlockRef.current, 580), 400);
      return () => clearTimeout(t);
    }

    if (st === 'shabbosAlarm') {
      const t = setTimeout(() => scrollToBlock(shabbosAlarmBlockRef.current, 960), 500);
      return () => clearTimeout(t);
    }
  }, [route.params?.scrollTo, loading, navigation, spacing.sm]);

  // Refresh when returning from Add Custom Reminder (or any sub-screen) so new reminders show
  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [loadPreferences])
  );

  useEffect(() => {
    if (!preferences) return;
    const m = Math.max(0, Math.min(5, Math.floor(preferences.notifications.shabbosClockRingDurationMin ?? 1)));
    const s = m === 5 ? 0 : Math.max(0, Math.min(59, Math.floor(preferences.notifications.shabbosClockRingDurationSec ?? 0)));
    setShabbosRingMin(m);
    setShabbosRingSec(s);
  }, [
    preferences?.notifications.shabbosClockRingDurationMin,
    preferences?.notifications.shabbosClockRingDurationSec,
  ]);

  const saveShabbosRingDuration = async (min: number, sec: number) => {
    if (!preferences) return;
    const m = Math.max(0, Math.min(5, Math.floor(min)));
    const s = m === 5 ? 0 : Math.max(0, Math.min(59, Math.floor(sec)));
    setShabbosRingMin(m);
    setShabbosRingSec(s);
    const updated = { ...preferences.notifications, shabbosClockRingDurationMin: m, shabbosClockRingDurationSec: s };
    setPreferences(p => (p ? { ...p, notifications: updated } : null));
    try {
      await UserPreferencesService.setNotificationPreferences(updated);
      await NotificationService.reschedule();
    } catch (e) {
      console.warn('Shabbos ring duration save failed:', e);
      loadPreferences();
    }
  };

  const promptNotificationsDenied = () => {
    Alert.alert(
      'Notifications needed',
      "This doesn't work until you allow Notifications in Settings.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ],
    );
  };

  const onNotificationsEnabledChange = async (value: boolean) => {
    if (value) {
      const granted = await NotificationService.requestPermissions();
      if (!granted) {
        promptNotificationsDenied();
        return;
      }
    }
    await updateNotificationPreference('enabled', value);
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

  const setPrayerEnabled = async (which: PrayerKey, value: boolean) => {
    if (!preferences) return;
    const updated = {
      ...preferences.notifications,
      prayerReminders: {
        ...preferences.notifications.prayerReminders,
        [which]: {
          ...preferences.notifications.prayerReminders?.[which],
          enabled: value,
        },
      },
    };
    await UserPreferencesService.setNotificationPreferences(updated);
    await NotificationService.reschedule();
    loadPreferences();
  };

  const onShabbosClockEnabledChange = async (value: boolean) => {
    if (value) {
      const granted = await NotificationService.requestPermissions();
      if (!granted) {
        promptNotificationsDenied();
        return;
      }
    }
    await updateNotificationPreference('shabbosClockEnabled', value);
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
    setRefuahError(null);
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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setRefuahError("Enter the choleh's Hebrew name and the mother's Hebrew name.");
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
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRefuahNameModalVisible(false);
    loadPreferences();
  };

  const deleteRefuahName = async (id: string) => {
    if (!preferences) return;
    const list = (preferences.refuahPersonalNames ?? []).filter((x) => x.id !== id);
    await UserPreferencesService.setRefuahPersonalNames(list);
    loadPreferences();
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

  const editReminder = (reminder: CustomReminder) => {
    (navigation as any).navigate('AddCustomReminder', { reminder });
  };

  const confirmDeleteReminder = (reminder: CustomReminder) => {
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
  };

  const openReminderMenu = (reminder: CustomReminder) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: reminder.title,
          options: ['Edit', 'Delete', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) editReminder(reminder);
          else if (index === 1) confirmDeleteReminder(reminder);
        },
      );
    } else {
      setReminderMenuId(reminder.id);
    }
  };

  const menuReminder = (preferences?.customReminders || []).find((r) => r.id === reminderMenuId) ?? null;

  /* ------------------------------ render helpers ----------------------------- */

  const timedToggle = (
    enabledKey: keyof NotificationPreferences,
    timeKey: keyof NotificationPreferences,
    fallback: string,
    kind: TimePickerKind,
    title: string,
  ) => {
    const n = preferences!.notifications;
    const enabled = Boolean(n[enabledKey]);
    return (
      <ToggleRow
        title={title}
        value={enabled}
        onValueChange={(v) => updateNotificationPreference(enabledKey, v)}
      >
        {enabled ? (
          <ValueRow
            nested
            label="Remind me at"
            value={formatTehillimTimeForDisplay((n[timeKey] as string | undefined) || fallback)}
            onPress={() => openTimePicker(kind)}
          />
        ) : null}
      </ToggleRow>
    );
  };

  const emptyHint = (text: string) => (
    <Text
      style={[
        type.textStyles.bodySmall,
        { color: theme.colors.text.secondary, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
      ]}
    >
      {text}
    </Text>
  );

  if (loading) {
    return <Screen state="loading" contentStyle={{ paddingTop: spacing.sm }} />;
  }

  if (!preferences) {
  return (
      <Screen
        state="error"
        errorMessage="Could not load your settings."
        onRetry={() => {
          setLoading(true);
          loadPreferences();
        }}
        contentStyle={{ paddingTop: spacing.sm }}
      />
    );
  }

  const n = preferences.notifications;
  const shabbosEnabled = n.shabbosClockEnabled;
  const customReminders = preferences.customReminders || [];
  const refuahNames = preferences.refuahPersonalNames ?? [];
  const hebrewBody = {
    fontFamily: type.fonts.hebrew.medium,
    fontSize: type.fontSize.lg,
    writingDirection: 'rtl' as const,
  };

  return (
    <Screen contentStyle={{ paddingTop: spacing.sm }}>
      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: spacing.lg }}>
        <LiquidGlassSegmentedControl
          tabs={[
            { key: 'notifications', label: 'Notifications' },
            { key: 'general', label: 'General' },
            { key: 'about', label: 'About' },
          ]}
            activeIndex={TAB_KEYS.indexOf(activeTab)}
            onIndexChange={(index) => setActiveTab(TAB_KEYS[index])}
          />
        </View>

        {/* ============ NOTIFICATIONS TAB ============ */}
        {activeTab === 'notifications' && (
        <>
            <View ref={shabbosAlarmBlockRef} collapsable={false}>
              <Section
                title="Shabbos alarm"
                footer={
                  shabbosEnabled
                    ? "Keep the ringer on. To stop other apps from interrupting, use Airplane mode, or set up a custom Focus that only allows notifications from this app."
                    : undefined
                }
              >
                <ToggleRow
                  title="Shabbos alarm"
                  subtitle="Wake up without touching your phone"
                  value={shabbosEnabled}
                    onValueChange={onShabbosClockEnabledChange}
                >
                  {shabbosEnabled ? (
                    <>
                      <ValueRow
                        nested
                        label="Wake-up time"
                        value={formatTehillimTimeForDisplay(n.shabbosClockTime || '08:00')}
                      onPress={() => openTimePicker('shabbosClock')}
                      />
                      <Hairline />
                      <DurationSlider
                        label="Ring minutes"
                        valueText={String(shabbosRingMin)}
                        value={shabbosRingMin}
                        max={5}
                        onValueChange={(v) => {
                          const m = Math.round(v);
                          setShabbosRingMin(m);
                          if (m === 5) setShabbosRingSec(0);
                        }}
                        onSlidingComplete={(v) => {
                          const m = Math.round(v);
                          const s = m === 5 ? 0 : shabbosRingSec;
                          void saveShabbosRingDuration(m, s);
                        }}
                      />
                      <Hairline />
                      <DurationSlider
                        label="Ring seconds"
                        valueText={String(shabbosRingMin >= 5 ? 0 : shabbosRingSec)}
                        value={shabbosRingMin >= 5 ? 0 : shabbosRingSec}
                        max={shabbosRingMin >= 5 ? 0 : 59}
                        disabled={shabbosRingMin >= 5}
                        onValueChange={(v) => {
                          if (shabbosRingMin >= 5) return;
                          setShabbosRingSec(Math.round(v));
                        }}
                        onSlidingComplete={(v) => {
                          if (shabbosRingMin >= 5) return;
                          void saveShabbosRingDuration(shabbosRingMin, Math.round(v));
                        }}
                      />
                  </>
                  ) : null}
                </ToggleRow>
              </Section>
            </View>

            <Section title="Reminders">
              <ToggleRow
                title="Enable notifications"
                subtitle="Turn all reminders on or off"
                value={n.enabled}
                  onValueChange={(value) => onNotificationsEnabledChange(value)}
              />
            </Section>

            {n.enabled && (
              <>
                <Section title="Daily prayers" footer="Shacharis, Mincha and Maariv">
                  {PRAYERS.map((p) => {
                    const cfg = n.prayerReminders?.[p.key];
                    return (
                      <ToggleRow
                        key={p.key}
                        title={p.title}
                        subtitle={p.subtitle}
                        value={cfg?.enabled || false}
                        onValueChange={(value) => setPrayerEnabled(p.key, value)}
                      >
                        {cfg?.enabled ? (
                          <ValueRow
                            nested
                            label="Daily at"
                            value={cfg?.time || p.fallback}
                            onPress={() => openTimePicker(p.key)}
                          />
                        ) : null}
                      </ToggleRow>
                    );
                  })}
                </Section>

                <Section title="Daily reminders" footer="Tehillim and gratitude">
                  {timedToggle('dailyTehillim', 'dailyTehillimTime', '09:00', 'tehillim', 'Daily Tehillim')}
                  <View ref={gratitudeBlockRef} collapsable={false}>
                    {timedToggle('dailyGratitude', 'dailyGratitudeTime', '20:00', 'dailyGratitude', 'Daily gratitude')}
                      </View>
                </Section>

                <Section title="Shabbos and zmanim" footer="Candle lighting, sunset and Shabbos prep">
                  <ToggleRow
                    title="Shabbos reminders"
                    value={n.shabbosReminders}
                      onValueChange={(value) => updateNotificationPreference('shabbosReminders', value)}
                  >
                    {n.shabbosReminders ? (
                      <ValueRow
                        nested
                        note
                        label="Candle lighting and Friday afternoon reminders based on your location's zmanim"
                      />
                    ) : null}
                  </ToggleRow>
                  <ToggleRow
                    title="Shekiya (sunset)"
                    value={n.shekiyaReminder}
                      onValueChange={(value) => updateNotificationPreference('shekiyaReminder', value)}
                  >
                    {n.shekiyaReminder ? (
                      <ValueRow
                        nested
                        label="Remind me"
                        value={`${n.shekiyaMinutesBefore ?? 15} min before sunset`}
                        onPress={() => setShekiyaMinutesPickerOpen(true)}
                      />
                    ) : null}
                  </ToggleRow>
                </Section>

                <Section title="Calendar and seasonal" footer="Hallel, Rosh Chodesh, fast days and more">
                  {timedToggle('hallelAnenu', 'hallelAnenuTime', '08:00', 'hallelAnenu', 'Hallel')}
                  {timedToggle('roshChodesh', 'roshChodeshTime', '08:00', 'roshChodesh', 'Rosh Chodesh')}
                  {timedToggle('fastDays', 'fastDaysTime', '08:00', 'fastDays', 'Fast days')}
                  <ToggleRow
                    title="Sefiras HaOmer"
                    value={n.sefirasHaomer}
                      onValueChange={(value) => updateNotificationPreference('sefirasHaomer', value)}
                  >
                    {n.sefirasHaomer ? (
                      <ValueRow nested note label="At tzeit (nightfall) for your location" />
                    ) : null}
                  </ToggleRow>
                  <ToggleRow
                    title="Davening add-ons"
                    subtitle="Yaaleh V'Yavo, Al HaNisim and more"
                    value={n.daveningAddOns}
                    onValueChange={(value) => updateNotificationPreference('daveningAddOns', value)}
                    onPressTitle={() => setDaveningAddOnsExpanded((v) => !v)}
                    leading={
                      <Ionicons
                        name={daveningAddOnsExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={type.fontSize.lg}
                        color={theme.colors.text.tertiary}
                      />
                    }
                  >
                    {daveningAddOnsExpanded ? (
                      <>
                        {DAVENING_ADDONS.map((a, i) => (
                          <React.Fragment key={a.kind}>
                            {i > 0 ? <Hairline /> : null}
                            <ToggleRow
                              title={a.label}
                              value={Boolean(n[a.enabledKey])}
                              onValueChange={(value) => updateNotificationPreference(a.enabledKey, value)}
                              trailingExtra={
                                <TimePill
                                  label={`${a.label} time`}
                                  text={formatTehillimTimeForDisplay((n[a.timeKey] as string | undefined) ?? '08:00')}
                                  onPress={() => openTimePicker(a.kind)}
                                />
                              }
                            />
                          </React.Fragment>
                        ))}
                      </>
                    ) : null}
                  </ToggleRow>
                </Section>

                <Section title="Custom reminders">
                  {customReminders.length > 0
                    ? customReminders.map((reminder) => (
                        <ToggleRow
                          key={reminder.id}
                          title={reminder.title}
                          subtitle={reminder.time}
                          value={reminder.enabled}
                          onValueChange={async (value) => {
                            await UserPreferencesService.updateCustomReminder(reminder.id, { enabled: value });
                            const prefs = await UserPreferencesService.getPreferences();
                            await NotificationService.reschedule(prefs ?? undefined);
                            loadPreferences();
                          }}
                          trailingExtra={
                            <IconButton
                              name="ellipsis-horizontal"
                              label={`More options for ${reminder.title}`}
                              tone="muted"
                              onPress={() => openReminderMenu(reminder)}
                            />
                          }
                        />
                      ))
                    : emptyHint('No custom reminders yet')}
                  <ListRow
                    title="Add reminder"
                    leading={<Ionicons name="add" size={type.fontSize.xl} color={theme.colors.primary.dark} />}
                    onPress={() => navigation.navigate('AddCustomReminder' as never)}
                  />
                </Section>
              </>
              )}
        </>
        )}

        {/* ============ GENERAL TAB ============ */}
        {activeTab === 'general' && (
        <>
            <Section title="Nusach">
              <CheckRow
                title="אשכנז"
                subtitle="Ashkenaz"
                titleStyle={hebrewBody}
                selected={preferences.nusach === 'ashkenaz'}
              onPress={() => UserPreferencesService.setNusach('ashkenaz').then(loadPreferences)}
              />
              <CheckRow
                title="ספרד"
                subtitle="Sfard"
                titleStyle={hebrewBody}
                selected={preferences.nusach === 'sfard'}
              onPress={() => UserPreferencesService.setNusach('sfard').then(loadPreferences)}
              />
            </Section>

            <Section
              title="Refuah names"
              footer={'Optional in רְפָאֵנוּ. After "רְפוּאָה שְׁלֵמָה לְכָל מַכּוֹתֵינוּ" in the Amidah, a short paragraph is added for each person you list (Hebrew names only). Choose male (בן) or female (בת), then enter the choleh\'s name and the mother\'s name.'}
            >
              {refuahNames.map((entry) => (
                <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <PressableScale
                    onPress={() => openRefuahNameModal(entry)}
                    pressedScale={0.99}
                    accessibilityLabel={`Edit ${entry.nameHebrew}`}
                    style={{ flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 44 }}
                  >
                    <Text style={[hebrewBody, { color: theme.colors.text.primary, alignSelf: 'flex-start' }]}>
                      {entry.gender === 'female'
                        ? `${entry.nameHebrew} בת ${entry.motherNameHebrew}`
                        : `${entry.nameHebrew} בן ${entry.motherNameHebrew}`}
                    </Text>
                    <Text
                      style={[
                        type.textStyles.caption,
                        { color: theme.colors.text.secondary, marginTop: spacing['2xs'] },
                      ]}
                    >
                      {entry.gender === 'female' ? 'Female (בת)' : 'Male (בן)'}
                    </Text>
                  </PressableScale>
                  <IconButton
                    name="trash-outline"
                    label={`Delete ${entry.nameHebrew}`}
                    tone="danger"
                    onPress={() => deleteRefuahName(entry.id)}
                  />
                </View>
              ))}
              <ListRow
                title="Add name"
                leading={<Ionicons name="add" size={type.fontSize.xl} color={theme.colors.primary.dark} />}
                onPress={() => openRefuahNameModal()}
              />
            </Section>

            <Section title="Display">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  minHeight: 44 + spacing.sm,
                }}
              >
                <Text style={[type.textStyles.body, { color: theme.colors.text.primary }]}>Text size</Text>
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  {TEXT_SIZES.map((size, i) => {
                    const selected = preferences.display?.textSize === size;
                    const sizes = [type.fontSize.xs, type.fontSize.sm, type.fontSize.base, type.fontSize.lg];
                    return (
                      <PressableScale
                        key={size}
                        onPress={() => updateDisplayPreference('textSize', size)}
                        accessibilityRole="radio"
                        accessibilityLabel={`Text size ${size}`}
                        accessibilityState={{ selected }}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: radii.md,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: selected ? theme.colors.primary.main : theme.colors.background.secondary,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: type.fonts.body.semibold,
                            fontSize: sizes[i],
                            color: selected ? theme.colors.text.inverse : theme.colors.text.primary,
                          }}
                        >
                          A
                        </Text>
                      </PressableScale>
                    );
                  })}
                  </View>
                </View>
              <ToggleRow
                title="Show transliteration"
                subtitle="English translations are coming in a future update"
                    value={false}
                disabled
                onValueChange={() => {}}
                  />
            </Section>
        </>
        )}

        {/* ============ ABOUT TAB ============ */}
        {activeTab === 'about' && (
        <>
            <Section title="Support" footer="Project by Avi Taub at Sheva Studios">
              <ListRow
                title="Visit support site"
                subtitle="siddur24seven.com/support"
                showChevron
                  onPress={() => Linking.openURL(LEGAL.supportUrl)}
              />
              <ListRow
                title="Call"
                subtitle={LEGAL.supportPhoneDisplay}
                showChevron
                  onPress={() => Linking.openURL(LEGAL.supportPhoneTel)}
              />
              <ListRow
                title="Email"
                subtitle={LEGAL.supportEmail}
                showChevron
                  onPress={() => Linking.openURL(mailtoSupport())}
              />
              <ListRow title="Privacy Policy" showChevron onPress={() => Linking.openURL(LEGAL.privacyUrl)} />
              <ListRow title="Terms of Use" showChevron onPress={() => Linking.openURL(LEGAL.termsUrl)} />
            </Section>

            <Section
              title="About"
              footer="Prayer texts and Tehillim are provided by Sefaria under Creative Commons license (CC-BY-SA)."
            >
              <ValueRow
                label="Version"
                value={Constants.expoConfig?.version ?? (Constants.manifest as any)?.version ?? '1.0.0'}
              />
              <ValueRow
                label="Text source"
                value="Sefaria.org"
                onPress={() => Linking.openURL('https://www.sefaria.org')}
              />
            </Section>

            <Section>
              <View style={{ paddingHorizontal: spacing.xs }}>
                <TextAction label="Reset app" tone="danger" onPress={handleResetOnboarding} />
              </View>
            </Section>

            <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
              <Text style={[type.textStyles.h3, { color: theme.colors.text.primary }]}>24/7</Text>
              <Text style={[type.textStyles.caption, { color: theme.colors.text.tertiary, marginTop: spacing.xs }]}>
                With you, when you choose.
                  </Text>
                </View>
        </>
        )}
      </ScrollView>

      {/* Reminder menu (Android / web; iOS uses the native action sheet) */}
      <SheetModal
        visible={menuReminder != null}
        title={menuReminder?.title ?? ''}
        onClose={() => setReminderMenuId(null)}
      >
        <Section>
          <ListRow
            title="Edit"
            onPress={() => {
              const r = menuReminder;
              setReminderMenuId(null);
              if (r) editReminder(r);
            }}
          />
          <ListRow
            title="Delete"
            onPress={() => {
              const r = menuReminder;
              setReminderMenuId(null);
              if (r) confirmDeleteReminder(r);
            }}
            trailing={<Ionicons name="trash-outline" size={type.fontSize.lg} color={theme.colors.semantic.error} />}
          />
        </Section>
      </SheetModal>

      {/* Refuah name add / edit */}
      <SheetModal
        visible={refuahNameModalVisible}
        title={refuahEditingId ? 'Edit name' : 'Add name'}
        onClose={() => setRefuahNameModalVisible(false)}
        actionLabel="Save"
        onAction={saveRefuahNameModal}
      >
        {refuahError ? <InlineError message={refuahError} /> : null}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          <Chip
            label="Male · בן"
            selected={refuahDraftGender === 'male'}
                onPress={() => setRefuahDraftGender('male')}
          />
          <Chip
            label="Female · בת"
            selected={refuahDraftGender === 'female'}
                onPress={() => setRefuahDraftGender('female')}
          />
            </View>
        <PracticeField
          label="Choleh's Hebrew name"
              value={refuahDraftName}
              onChangeText={setRefuahDraftName}
          placeholder="e.g. שְׁמוּאֵל"
          style={{ ...hebrewBody, textAlign: 'right' }}
        />
        <PracticeField
          label="Mother's Hebrew name"
              value={refuahDraftMother}
              onChangeText={setRefuahDraftMother}
          placeholder="e.g. שָׂרָה"
          style={{ ...hebrewBody, textAlign: 'right' }}
        />
      </SheetModal>

      {/* Time picker for notification reminders */}
      <SheetModal
        visible={timePickerFor !== null}
        title={timePickerFor ? TIME_PICKER_TITLES[timePickerFor] : ''}
        onClose={() => setTimePickerFor(null)}
        actionLabel="Save"
        onAction={saveTimePicker}
      >
        {timePickerFor !== 'shabbosClock' ? (
          <Text
            style={[
              type.textStyles.bodySmall,
              { color: theme.colors.text.secondary, textAlign: 'center', marginBottom: spacing.xs },
            ]}
          >
            Set reminder time
              </Text>
        ) : null}
        <View style={{ alignItems: 'center' }}>
              <DateTimePicker
                value={pickerDate}
                mode="time"
            display="spinner"
                onChange={(_, date) => date != null && setPickerDate(date)}
                textColor={theme.colors.text.primary}
                themeVariant={theme.isDark ? 'dark' : 'light'}
              />
            </View>
      </SheetModal>

      {/* Shekiya: minutes before sunset */}
      <SheetModal
        visible={shekiyaMinutesPickerOpen}
        title="Shekiya reminder"
        onClose={() => setShekiyaMinutesPickerOpen(false)}
      >
        <Text
                  style={[
            type.textStyles.bodySmall,
            { color: theme.colors.text.secondary, textAlign: 'center', marginBottom: spacing.md },
          ]}
        >
          Minutes before sunset
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' }}>
          {SHEKIYA_MINUTES.map((mins) => (
            <Chip
              key={mins}
              label={`${mins} min`}
              selected={preferences.notifications.shekiyaMinutesBefore === mins}
                  onPress={async () => {
                    await updateNotificationPreference('shekiyaMinutesBefore', mins);
                    setShekiyaMinutesPickerOpen(false);
                  }}
            />
              ))}
            </View>
      </SheetModal>
    </Screen>
  );
};
