import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../design/spacing';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { IntroScreen } from '../../app/intro/IntroScreen';
import { OnboardingScreen } from '../../app/onboarding/OnboardingScreen';
import { HomeScreen } from '../../app/home/HomeScreen';
import { CalendarScreen } from '../../app/calendar/CalendarScreen';
import { TehillimListScreen } from '../../app/tehillim/TehillimListScreen';
import { TehillimReaderScreen } from '../../app/tehillim/TehillimReaderScreen';
import { TehillimSettingsScreen } from '../../app/tehillim/TehillimSettingsScreen';
import { CreateSharedTehillimScreen } from '../../app/tehillim/CreateSharedTehillimScreen';
import { SharedTehillimViewScreen } from '../../app/tehillim/SharedTehillimViewScreen';
import { LibraryScreen } from '../../app/library/LibraryScreen';
import { ParshaScreen } from '../../app/library/ParshaScreen';
import { CustomizeHome } from '../../app/home/CustomizeHome';
import { PanelsMarketplace } from '../../app/home/PanelsMarketplace';
import { SiddurReaderScreen } from '../../app/siddur/SiddurReaderScreen';
import { GemaraScreen } from '../../app/gemara/GemaraScreen';
import { GemaraTractateScreen } from '../../app/gemara/GemaraTractateScreen';
import { GemaraReaderScreen } from '../../app/gemara/GemaraReaderScreen';
import { NachScreen } from '../../app/nach/NachScreen';
import { NachBookScreen } from '../../app/nach/NachBookScreen';
import { NachReaderScreen } from '../../app/nach/NachReaderScreen';
import { MishnaScreen } from '../../app/mishna/MishnaScreen';
import { MishnaTractateScreen } from '../../app/mishna/MishnaTractateScreen';
import { MishnaReaderScreen } from '../../app/mishna/MishnaReaderScreen';
import { RambamScreen } from '../../app/rambam/RambamScreen';
import { RambamBookScreen } from '../../app/rambam/RambamBookScreen';
import { RambamSectionScreen } from '../../app/rambam/RambamSectionScreen';
import { RambamReaderScreen } from '../../app/rambam/RambamReaderScreen';
import { ChumashScreen } from '../../app/chumash/ChumashScreen';
import { ChumashParshahPickerScreen } from '../../app/chumash/ChumashParshahPickerScreen';
import { ChumashReaderScreen } from '../../app/chumash/ChumashReaderScreen';
import { PirkeiAvosScreen } from '../../app/library/PirkeiAvosScreen';
import { AddCustomReminderScreen } from '../../app/settings/AddCustomReminderScreen';
import { OmerScreen } from '../../app/omer/OmerScreen';
import { HabitsScreen } from '../../app/habits/HabitsScreen';
import { HubOverviewScreen } from '../../app/hub/HubOverviewScreen';
import { DailyGoalsScreen } from '../../app/hub/DailyGoalsScreen';
import { GoalsHistoryScreen } from '../../app/hub/GoalsHistoryScreen';
import { GratitudeScreen } from '../../app/hub/GratitudeScreen';
import { AddGratitudeScreen } from '../../app/hub/AddGratitudeScreen';
import { TzedakahScreen } from '../../app/tzedakah/TzedakahScreen';
import { AddTzedakahScreen } from '../../app/tzedakah/AddTzedakahScreen';
import { SettingsScreen } from '../../app/settings/SettingsScreen';
import { LiquidGlassTabBar } from '../../components/navigation/LiquidGlassTabBar';
import { UserPreferencesService } from '../storage/UserPreferences';
import { useTheme } from '../design/theme';
import { textStyles } from '../design/typography';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const HubStack = createStackNavigator();
const LibraryStack = createStackNavigator();

function HubNavigator() {
  return (
    <HubStack.Navigator screenOptions={{ headerShown: false }}>
      <HubStack.Screen name="HubOverview" component={HubOverviewScreen} />
      <HubStack.Screen name="DailyGoals" component={DailyGoalsScreen} />
      <HubStack.Screen name="GoalsHistory" component={GoalsHistoryScreen} />
      <HubStack.Screen name="Gratitude" component={GratitudeScreen} />
      <HubStack.Screen name="AddGratitude" component={AddGratitudeScreen} />
    </HubStack.Navigator>
  );
}

function LibraryNavigator() {
  return (
    <LibraryStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="LibraryHome">
      <LibraryStack.Screen name="LibraryHome" component={LibraryScreen} />
      <LibraryStack.Screen name="SiddurReader" component={SiddurReaderScreen} />
    </LibraryStack.Navigator>
  );
}

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
        name="Hub"
        component={HubNavigator}
        options={{ tabBarLabel: 'Hub' }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ tabBarLabel: 'Calendar' }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryNavigator}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'LibraryHome';
          return {
            tabBarLabel: 'Library',
            tabBarStyle: routeName === 'SiddurReader' ? { display: 'none' } : undefined,
          };
        }}
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
  const { theme } = useTheme();
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
        cardStyle: { backgroundColor: theme.colors.background.secondary },
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
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Omer"
            component={OmerScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Habits"
            component={HabitsScreen}
            options={{
              headerShown: true,
              headerStyle: {
                backgroundColor: theme.colors.background.glass,
              },
              headerTintColor: theme.colors.text.primary,
              headerTitleStyle: {
                ...textStyles.h4,
              },
            }}
          />
          <Stack.Screen
            name="Tzedakah"
            component={TzedakahScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddTzedakah"
            component={AddTzedakahScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerShown: true,
              headerStyle: {
                backgroundColor: theme.colors.background.glass,
              },
              headerTintColor: theme.colors.text.primary,
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
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CreateSharedTehillim"
            component={CreateSharedTehillimScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SharedTehillimView"
            component={SharedTehillimViewScreen}
            options={{ headerShown: false }}
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
          <Stack.Screen
            name="SiddurReader"
            component={SiddurReaderScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Parsha"
            component={ParshaScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Gemara"
            component={GemaraScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="GemaraTractate"
            component={GemaraTractateScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="GemaraReader"
            component={GemaraReaderScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Nach"
            component={NachScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="NachBook"
            component={NachBookScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="NachReader"
            component={NachReaderScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Mishna"
            component={MishnaScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="MishnaTractate"
            component={MishnaTractateScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="MishnaReader"
            component={MishnaReaderScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Rambam"
            component={RambamScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="RambamBook"
            component={RambamBookScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="RambamSection"
            component={RambamSectionScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="RambamReader"
            component={RambamReaderScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Chumash"
            component={ChumashScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ChumashParshahPicker"
            component={ChumashParshahPickerScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ChumashReader"
            component={ChumashReaderScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PirkeiAvos"
            component={PirkeiAvosScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddCustomReminder"
            component={AddCustomReminderScreen}
            options={{
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
