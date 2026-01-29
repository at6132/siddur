import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { IntroScreen } from '../../app/intro/IntroScreen';
import { OnboardingScreen } from '../../app/onboarding/OnboardingScreen';
import { HomeScreen } from '../../app/home/HomeScreen';
import { CalendarScreen } from '../../app/calendar/CalendarScreen';
import { TehillimListScreen } from '../../app/tehillim/TehillimListScreen';
import { TehillimReaderScreen } from '../../app/tehillim/TehillimReaderScreen';
import { TehillimSettingsScreen } from '../../app/tehillim/TehillimSettingsScreen';
import { LibraryScreen } from '../../app/library/LibraryScreen';
import { CustomizeHome } from '../../app/home/CustomizeHome';
import { PanelsMarketplace } from '../../app/home/PanelsMarketplace';
import { OmerScreen } from '../../app/omer/OmerScreen';
import { HabitsScreen } from '../../app/habits/HabitsScreen';
import { SettingsScreen } from '../../app/settings/SettingsScreen';
import { LiquidGlassTabBar } from '../../components/navigation/LiquidGlassTabBar';
import { UserPreferencesService } from '../storage/UserPreferences';
import { colors } from '../design/colors';
import { textStyles } from '../design/typography';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      sceneContainerStyle={styles.sceneContainer}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ tabBarLabel: 'Calendar' }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{ tabBarLabel: 'Library' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    backgroundColor: 'transparent',
  },
});

// Wrapper component to pass onComplete callback to OnboardingScreen
function OnboardingWrapper({ onComplete }: { onComplete: () => void }) {
  return <OnboardingScreen onComplete={onComplete} />;
}

export default function AppNavigator() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    const completed = await UserPreferencesService.hasCompletedOnboarding();
    setIsOnboardingComplete(completed);
    // Only show intro if onboarding not complete
    setShowIntro(!completed);
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleOnboardingComplete = () => {
    setIsOnboardingComplete(true);
  };

  if (isOnboardingComplete === null) {
    // Loading state - could add a splash screen here
    return null;
  }

  // Show intro screen first (before onboarding)
  if (showIntro && !isOnboardingComplete) {
    return <IntroScreen onBegin={handleIntroComplete} />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background.secondary },
      }}
    >
      {!isOnboardingComplete ? (
        <Stack.Screen name="Onboarding">
          {() => <OnboardingWrapper onComplete={handleOnboardingComplete} />}
        </Stack.Screen>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="TehillimReader"
            component={TehillimReaderScreen}
            options={{
              headerShown: true,
              headerStyle: {
                backgroundColor: colors.background.glass,
              },
              headerTintColor: colors.text.primary,
              headerTitleStyle: {
                ...textStyles.h4,
              },
            }}
          />
          <Stack.Screen
            name="Omer"
            component={OmerScreen}
            options={{
              headerShown: true,
              headerStyle: {
                backgroundColor: colors.background.glass,
              },
              headerTintColor: colors.text.primary,
              headerTitleStyle: {
                ...textStyles.h4,
              },
            }}
          />
          <Stack.Screen
            name="Habits"
            component={HabitsScreen}
            options={{
              headerShown: true,
              headerStyle: {
                backgroundColor: colors.background.glass,
              },
              headerTintColor: colors.text.primary,
              headerTitleStyle: {
                ...textStyles.h4,
              },
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerShown: true,
              headerStyle: {
                backgroundColor: colors.background.glass,
              },
              headerTintColor: colors.text.primary,
              headerTitleStyle: {
                ...textStyles.h4,
              },
            }}
          />
          <Stack.Screen
            name="TehillimSettings"
            component={TehillimSettingsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="TehillimList"
            component={TehillimListScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="CustomizeHome"
            component={CustomizeHome}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="PanelsMarketplace"
            component={PanelsMarketplace}
            options={{
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
