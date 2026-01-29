import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NusachSelection } from './NusachSelection';
import { SpiritualGoals } from './SpiritualGoals';
import { WelcomeScreen } from './WelcomeScreen';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { Nusach } from '../../src/types/nusach';
import { SpiritualGoal } from '../../src/types/preferences';
import * as Location from 'expo-location';

type OnboardingStep = 'nusach' | 'goals' | 'welcome';

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation();
  const [step, setStep] = useState<OnboardingStep>('nusach');

  useEffect(() => {
    // Request location permission early
    Location.requestForegroundPermissionsAsync();
  }, []);

  const handleNusachSelect = async (selectedNusach: Nusach) => {
    await UserPreferencesService.setNusach(selectedNusach);
    setStep('goals');
  };

  const handleGoalsSelect = async (selectedGoals: SpiritualGoal[]) => {
    await UserPreferencesService.setSpiritualGoals(selectedGoals);
    
    // Get location
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        await UserPreferencesService.setLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (e) {
      console.warn('Location error:', e);
    }

    setStep('welcome');
  };

  const handleStart = async () => {
    // Mark onboarding complete
    await UserPreferencesService.markOnboardingComplete();

    // Navigate to main app (reset navigation stack)
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      })
    );
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
