import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NusachSelection } from './NusachSelection';
import { WelcomeScreen } from './WelcomeScreen';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { spacing } from '../../src/design/spacing';
import { DEFAULT_SCREEN_BACKGROUND_LOOP } from '../../src/design/screenGradient';
import { Nusach } from '../../src/types/nusach';
import { track, ONBOARDING_EVENTS } from '../../src/analytics';
import { NotificationService } from '../../src/notifications/NotificationService';

type OnboardingStep = 'nusach' | 'welcome';

const STEP_IDS: OnboardingStep[] = ['nusach', 'welcome'];
const STEP_NAMES: Record<OnboardingStep, string> = { nusach: 'Nusach', welcome: 'Welcome' };

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<OnboardingStep>('nusach');
  const onboardingStartedAt = useRef<number>(Date.now());
  const stepStartedAt = useRef<number>(Date.now());

  useEffect(() => {
    track(ONBOARDING_EVENTS.ONBOARDING_STARTED, {});
    track(ONBOARDING_EVENTS.ONBOARDING_STEP_VIEWED, {
      step_id: 'nusach',
      step_name: STEP_NAMES.nusach,
      step_index: 0,
    });
    stepStartedAt.current = Date.now();
  }, []);

  useEffect(() => {
    const idx = STEP_IDS.indexOf(step);
    if (idx > 0) {
      track(ONBOARDING_EVENTS.ONBOARDING_STEP_VIEWED, {
        step_id: step,
        step_name: STEP_NAMES[step],
        step_index: idx,
      });
      stepStartedAt.current = Date.now();
    }
  }, [step]);

  const handleNusachSelect = async (selectedNusach: Nusach) => {
    const completionTimeMs = Date.now() - stepStartedAt.current;
    track(ONBOARDING_EVENTS.ONBOARDING_STEP_COMPLETED, { step_id: 'nusach', completion_time_ms: completionTimeMs });
    await UserPreferencesService.setNusach(selectedNusach);
    await UserPreferencesService.setSpiritualGoals([]);
    setStep('welcome');
  };

  const handleStart = async () => {
    const totalTimeMs = Date.now() - onboardingStartedAt.current;
    track(ONBOARDING_EVENTS.ONBOARDING_COMPLETED, { total_time_ms: totalTimeMs });
    await UserPreferencesService.markOnboardingComplete();
    track(ONBOARDING_EVENTS.PERMISSION_PROMPT_SHOWN, { permission_type: 'notifications' });
    const granted = await NotificationService.requestPermissionsAndSchedule();
    track(ONBOARDING_EVENTS.PERMISSION_RESPONSE, {
      permission_type: 'notifications',
      result: granted ? 'granted' : 'denied',
    });
    onComplete();
  };

  const renderStep = () => {
    switch (step) {
      case 'nusach':
        return (
          <NusachSelection
            onSelect={handleNusachSelect}
            onSkip={async () => {
              track(ONBOARDING_EVENTS.ONBOARDING_SKIPPED, { step_id: 'nusach' });
              await UserPreferencesService.setSpiritualGoals([]);
              setStep('welcome');
            }}
          />
        );
      case 'welcome':
        return <WelcomeScreen onStart={handleStart} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Enhanced background gradient with subtle animation feel */}
      <LinearGradient
        colors={[...DEFAULT_SCREEN_BACKGROUND_LOOP]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {renderStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.safeTopInset,
  },
});
