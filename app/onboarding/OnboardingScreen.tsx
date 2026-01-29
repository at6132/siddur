import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { NusachSelection } from './NusachSelection';
import { SpiritualGoals } from './SpiritualGoals';
import { NotificationPreferences } from './NotificationPreferences';
import { WelcomeScreen } from './WelcomeScreen';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { NotificationService } from '../../src/notifications/NotificationService';
import { Nusach } from '../../src/types/nusach';
import { SpiritualGoal, NotificationPreferences as NotificationPrefsType } from '../../src/types/preferences';
import * as Location from 'expo-location';

interface OnboardingScreenProps {
  onComplete: () => void;
}

type OnboardingStep = 'nusach' | 'goals' | 'notifications' | 'welcome';

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
}) => {
  const [step, setStep] = useState<OnboardingStep>('nusach');
  const [nusach, setNusach] = useState<Nusach | null>(null);
  const [goals, setGoals] = useState<SpiritualGoal[]>([]);
  const [notifications, setNotifications] = useState<NotificationPrefsType | null>(null);

  useEffect(() => {
    // Request location permission early
    Location.requestForegroundPermissionsAsync();
  }, []);

  const handleNusachSelect = async (selectedNusach: Nusach) => {
    setNusach(selectedNusach);
    await UserPreferencesService.setNusach(selectedNusach);
    setStep('goals');
  };

  const handleGoalsSelect = async (selectedGoals: SpiritualGoal[]) => {
    setGoals(selectedGoals);
    await UserPreferencesService.setSpiritualGoals(selectedGoals);
    setStep('notifications');
  };

  const handleNotificationsComplete = async (prefs: NotificationPrefsType) => {
    setNotifications(prefs);
    await UserPreferencesService.setNotificationPreferences(prefs);

    // Get location
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const location = await Location.getCurrentPositionAsync({});
      await UserPreferencesService.setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    }

    setStep('welcome');
  };

  const handleStart = async () => {
    // Mark onboarding complete
    await UserPreferencesService.markOnboardingComplete();

    // Initialize notifications
    await NotificationService.initialize();

    // Complete onboarding
    onComplete();
  };

  const renderStep = () => {
    switch (step) {
      case 'nusach':
        return (
          <NusachSelection
            onSelect={handleNusachSelect}
            onSkip={() => setStep('goals')}
          />
        );
      case 'goals':
        return (
          <SpiritualGoals
            onSelect={handleGoalsSelect}
            onSkip={() => setStep('notifications')}
          />
        );
      case 'notifications':
        return (
          <NotificationPreferences
            onComplete={handleNotificationsComplete}
            onSkip={() => setStep('welcome')}
          />
        );
      case 'welcome':
        return <WelcomeScreen onStart={handleStart} />;
      default:
        return null;
    }
  };

  return <View style={styles.container}>{renderStep()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F7',
  },
});
