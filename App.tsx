import React, { useEffect, useState, useCallback } from 'react';
import {
  Platform,
  Keyboard,
  StyleSheet,
  View,
  InputAccessoryView,
  TouchableOpacity,
  Text,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  NavigationContainer,
  useNavigationContainerRef,
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
} from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { StorageService } from './src/storage/StorageService';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import AppNavigator from './src/navigation/AppNavigator';
import { NotificationService } from './src/notifications/NotificationService';
import { ThemeProvider, useTheme } from './src/design/theme';
import { bootstrapLifecycle } from './src/analytics/lifecycle';
import { track, getPreviousScreenInfo, SCREEN_EVENTS, events } from './src/analytics';
import { AnalyticsErrorBoundary } from './components/analytics/AnalyticsErrorBoundary';
import { parseCampaignIdFromLink } from './src/api/tehillimApi';

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

const ROUTE_TO_FEATURE: Record<string, string> = {
  Home: 'home',
  Hub: 'hub',
  HubOverview: 'hub',
  DailyGoals: 'daily_goals',
  Gratitude: 'gratitude',
  AddGratitude: 'gratitude',
  GoalsHistory: 'goals_history',
  Calendar: 'calendar',
  Library: 'library',
  Parsha: 'parsha',
  PirkeiAvos: 'pirkei_avos',
  TehillimList: 'tehillim',
  TehillimReader: 'tehillim',
  TehillimSettings: 'tehillim',
  SiddurReader: 'siddur',
  Omer: 'omer',
  Habits: 'habits',
  Tzedakah: 'tzedakah',
  AddTzedakah: 'tzedakah',
  Settings: 'settings',
  AddCustomReminder: 'custom_reminder',
  Gemara: 'gemara',
  GemaraTractate: 'gemara',
  GemaraReader: 'gemara',
  Mishna: 'mishna',
  MishnaTractate: 'mishna',
  MishnaReader: 'mishna',
  Rambam: 'rambam',
  RambamBook: 'rambam',
  RambamSection: 'rambam',
  RambamReader: 'rambam',
  Chumash: 'chumash',
  ChumashReader: 'chumash',
  Nach: 'nach',
  NachBook: 'nach',
  NachReader: 'nach',
  CustomizeHome: 'customize_home',
  PanelsMarketplace: 'panels_marketplace',
};

function getActiveRouteName(state: any): string | null {
  if (!state?.routes?.[state.index]) return null;
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state);
  return route.name ?? null;
}

function AppContent({ onLayoutRootView }: { onLayoutRootView: () => void }) {
  const { theme } = useTheme();
  const navigationRef = useNavigationContainerRef();

  // Ensure document and root have full height on web so ScrollView gets bounded height
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const root = document.getElementById('root');
    const style = document.createElement('style');
    style.textContent = [
      'html, body { height: 100%; margin: 0; overflow: hidden; }',
      '#root { height: 100%; min-height: 100%; }',
      '#app-scroll-container { overflow-y: scroll !important; -webkit-overflow-scrolling: touch; }',
      '#app-scroll-container::-webkit-scrollbar { width: 10px; }',
      '#app-scroll-container::-webkit-scrollbar-track { background: rgba(0,0,0,0.06); border-radius: 5px; }',
      '#app-scroll-container::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.25); border-radius: 5px; }',
      '#app-scroll-container::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.4); }',
    ].join(' ');
    document.head.appendChild(style);
    if (root) {
      root.style.height = '100%';
      root.style.minHeight = '100%';
    }
    return () => {
      document.head.removeChild(style);
      if (root) {
        root.style.height = '';
        root.style.minHeight = '';
      }
    };
  }, []);

  // Web: global wheel listener - find scrollable element under pointer and scroll it
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleWheel = (e: WheelEvent) => {
      const appScroll = document.getElementById('app-scroll-container');
      // If we have the app scroll container and the pointer is over it, scroll it
      if (appScroll && appScroll.scrollHeight > appScroll.clientHeight) {
        const rect = appScroll.getBoundingClientRect();
        const inside =
          e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
        if (inside) {
          const maxScroll = appScroll.scrollHeight - appScroll.clientHeight;
          const next = Math.max(0, Math.min(maxScroll, appScroll.scrollTop + e.deltaY));
          if (next !== appScroll.scrollTop) {
            e.preventDefault();
            e.stopPropagation();
            appScroll.scrollTop = next;
          }
          return;
        }
      }
      // Fallback: use elements under the pointer
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i] as HTMLElement;
        if (el === document.body || el === document.documentElement) break;
        const sh = el.scrollHeight;
        const ch = el.clientHeight;
        if (sh > ch) {
          const maxScroll = sh - ch;
          const next = Math.max(0, Math.min(maxScroll, el.scrollTop + e.deltaY));
          if (next !== el.scrollTop) {
            e.preventDefault();
            e.stopPropagation();
            el.scrollTop = next;
          }
          return;
        }
      }
    };
    document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => document.removeEventListener('wheel', handleWheel, { capture: true });
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const handleNotification = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as {
        screen?: string;
        omerDay?: number;
        action?: string;
      };
      const screenName = data?.screen;
      const doNav = () => {
        if (!navigationRef.isReady()) {
          setTimeout(doNav, 100);
          return;
        }
        const hubScreens = ['Gratitude', 'AddGratitude', 'DailyGoals', 'GoalsHistory', 'HubOverview'];
        if (screenName && hubScreens.includes(screenName)) {
          navigationRef.navigate('Main' as never, {
            screen: 'Hub',
            params: { screen: screenName },
          } as never);
          return;
        }
        if (screenName === 'Home' || screenName === 'Calendar' || screenName === 'Library' || screenName === 'Settings') {
          navigationRef.navigate('Main' as never, { screen: screenName } as never);
          return;
        }
        if (screenName === 'Omer' || screenName === 'omer') {
          if (typeof data.omerDay === 'number') {
            StorageService.markOmerDay(data.omerDay, true).catch(() => {});
          }
          navigationRef.navigate('Omer' as never);
          return;
        }
        if (screenName && ['TehillimList', 'Habits', 'Tzedakah', 'AddCustomReminder'].includes(screenName)) {
          navigationRef.navigate(screenName as never);
          return;
        }
        navigationRef.navigate('Main' as never, { screen: 'Home' } as never);
      };
      doNav();
    };
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotification(response);
    });
    const sub = Notifications.addNotificationResponseReceivedListener(handleNotification);
    return () => sub.remove();
  }, []);

  const navigationTheme =
    theme.mode === 'dark'
      ? {
          ...NavigationDarkTheme,
          colors: {
            ...NavigationDarkTheme.colors,
            background: 'transparent',
            card: theme.colors.background.secondary,
            text: theme.colors.text.primary,
            border: 'transparent',
          },
        }
      : {
          ...NavigationLightTheme,
          colors: {
            ...NavigationLightTheme.colors,
            background: 'transparent',
            card: theme.colors.background.secondary,
            text: theme.colors.text.primary,
            border: 'transparent',
          },
        };

  const onNavStateChange = useCallback(() => {
    const state = navigationRef.getRootState();
    if (!state) return;
    const route = getActiveRouteName(state);
    if (!route) return;
    const { previous_screen, time_on_previous_screen_ms } = getPreviousScreenInfo(route);
    track(SCREEN_EVENTS.SCREEN_VIEW, {
      screen_name: route,
      previous_screen: previous_screen ?? undefined,
      time_on_previous_screen_ms,
    });
    const featureName = ROUTE_TO_FEATURE[route];
    if (featureName) track(events.feature.entry(featureName), { context: 'screen', screen_name: route });
  }, []);

  // Deep link: siddur://tehillim/<id> or https://siddur24seven.com/tehillim/<id> → open SharedTehillimView
  useEffect(() => {
    const navigateToTehillimCampaign = (url: string | null) => {
      if (!url) return;
      const campaignId = parseCampaignIdFromLink(url);
      if (!campaignId) return;
      const go = () => {
        if (!navigationRef.isReady()) {
          setTimeout(go, 100);
          return;
        }
        navigationRef.navigate('SharedTehillimView' as never, { campaignId } as never);
      };
      go();
    };

    Linking.getInitialURL().then(navigateToTehillimCampaign);
    const sub = Linking.addEventListener('url', ({ url }) => navigateToTehillimCampaign(url));
    return () => sub.remove();
  }, []);

  const AppWrapper = Platform.OS === 'web' ? View : GestureHandlerRootView;
  return (
    <AppWrapper
      style={[
        styles.container,
        Platform.OS === 'web' && styles.containerWeb,
        { backgroundColor: theme.colors.background.primary },
      ]}
      onLayout={onLayoutRootView}
    >
      {Platform.OS === 'web' ? (
        <>
          <View style={styles.webScrollWrapper} nativeID="app-scroll-container">
            <NavigationContainer ref={navigationRef} theme={navigationTheme} onStateChange={onNavStateChange}>
              <AppNavigator />
              <StatusBar style={theme.statusBarStyle} />
            </NavigationContainer>
          </View>
        </>
      ) : (
        <>
          <NavigationContainer ref={navigationRef} theme={navigationTheme} onStateChange={onNavStateChange}>
            <AppNavigator />
            <StatusBar style={theme.statusBarStyle} />
          </NavigationContainer>
          {Platform.OS === 'ios' && (
            <InputAccessoryView nativeID="globalDone">
              <View style={styles.inputAccessory}>
                <TouchableOpacity
                  style={styles.inputAccessoryDone}
                  onPress={() => Keyboard.dismiss()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.inputAccessoryDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </InputAccessoryView>
          )}
        </>
      )}
    </AppWrapper>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  // Load fonts
  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  useEffect(() => {
    async function prepare() {
      try {
        await NotificationService.initialize();
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  const appStartTimeRef = React.useRef<number>(Date.now());
  useEffect(() => {
    if (!fontsLoaded || !appIsReady) return;
    const coldStartMs = Date.now() - appStartTimeRef.current;
    bootstrapLifecycle(coldStartMs);
  }, [fontsLoaded, appIsReady]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, appIsReady]);

  // Wait for fonts and app to be ready
  if (!fontsLoaded || !appIsReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <AnalyticsErrorBoundary>
        <AppContent onLayoutRootView={onLayoutRootView} />
      </AnalyticsErrorBoundary>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerWeb: {
    height: '100vh',
    overflow: 'hidden',
  },
  webScrollWrapper: {
    flex: 1,
    height: '100%',
    overflowY: 'scroll',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
  },
  inputAccessory: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#e8e8ed',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c8c8cc',
  },
  inputAccessoryDone: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  inputAccessoryDoneText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
});
