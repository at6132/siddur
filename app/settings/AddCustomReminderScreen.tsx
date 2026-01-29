import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { CustomReminder } from '../../src/types/preferences';

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
        colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
        style={styles.glassBlur}
      >
        <View style={styles.glassInner}>{children}</View>
      </LinearGradient>
    )}
  </View>
);

const TIME_OPTIONS = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM',
];

const DAYS = [
  { id: 'sun', label: 'Sun' },
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
];

export const AddCustomReminderScreen: React.FC = () => {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTime, setSelectedTime] = useState('9:00 AM');
  const [selectedDays, setSelectedDays] = useState<string[]>(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
  const [saving, setSaving] = useState(false);

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
      Alert.alert('Missing Title', 'Please enter a title for your reminder.');
      return;
    }

    setSaving(true);
    try {
      const reminder: CustomReminder = {
        id: `reminder-${Date.now()}`,
        title: title.trim(),
        message: message.trim() || title.trim(),
        time: selectedTime,
        enabled: true,
        days: selectedDays as ('sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat')[],
      };

      await UserPreferencesService.addCustomReminder(reminder);
      Alert.alert('Reminder Added', `"${title}" will remind you daily at ${selectedTime}.`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
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
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <FadeIn delay={0}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Text style={styles.backText}>← Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>New Reminder</Text>
            <Text style={styles.subtitle}>Set a custom daily reminder</Text>
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
            />
          </GlassCard>
        </FadeIn>

        {/* Time Selection */}
        <FadeIn delay={150}>
          <GlassCard>
            <Text style={styles.inputLabel}>Time</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timeScrollContent}
            >
              {TIME_OPTIONS.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeOption,
                    selectedTime === time && styles.timeOptionSelected,
                  ]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text style={[
                    styles.timeOptionText,
                    selectedTime === time && styles.timeOptionTextSelected,
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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

        {/* Save Button */}
        <FadeIn delay={250}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Create Reminder'}
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
    paddingTop: spacing.xl,
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.md,
  },
  glassBlur: {
    overflow: 'hidden',
  },
  glassInner: {
    padding: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },

  // Input
  inputLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  textInput: {
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Time Selection
  timeScrollContent: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  timeOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.03)',
    marginRight: spacing.xs,
  },
  timeOptionSelected: {
    backgroundColor: colors.primary.main,
  },
  timeOptionText: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.text.secondary,
  },
  timeOptionTextSelected: {
    color: '#fff',
  },

  // Days Selection
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dayOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOptionSelected: {
    backgroundColor: colors.primary.main,
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

  // Save Button
  saveButton: {
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
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
