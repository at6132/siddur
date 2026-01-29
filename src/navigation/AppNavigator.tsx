import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { IntroScreen } from '../../app/intro/IntroScreen';
import { OnboardingScreen } from '../../app/onboarding/OnboardingScreen';
import { HomeScreen } from '../../app/home/HomeScreen';
import { CalendarScreen } from '../../app/calendar/CalendarScreen';
import { TehillimListScreen } from '../../app/tehillim/TehillimListScreen';
import { TehillimReaderScreen } from '../../app/tehillim/TehillimReaderScreen';
import { OmerScreen } from '../../app/omer/OmerScreen';
import { HabitsScreen } from '../../app/habits/HabitsScreen';
import { SettingsScreen } from '../../app/settings/SettingsScreen';
import { UserPreferencesService } from '../storage/UserPreferences';
import { colors } from '../design/colors';
import { textStyles } from '../design/typography';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background.glass,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: {
          ...textStyles.caption,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: 'Calendar',
        }}
      />
      <Tab.Screen
        name="Tehillim"
        component={TehillimListScreen}
        options={{
          tabBarLabel: 'Tehillim',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
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
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
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
        </>
      )}
    </Stack.Navigator>
  );
}
