import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, AppState, AppStateStatus } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { WidgetUpdateService } from './src/widgets/WidgetUpdateService';
import { NotificationService } from './src/notifications/NotificationService';

export default function App() {
  useEffect(() => {
    // Initialize notifications
    NotificationService.initialize();

    // Update widgets on app start
    WidgetUpdateService.updateOnAppActive();

    // Update widgets when app becomes active
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        WidgetUpdateService.updateOnAppActive();
      }
    });

    // Schedule periodic widget updates
    WidgetUpdateService.schedulePeriodicUpdates();

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

