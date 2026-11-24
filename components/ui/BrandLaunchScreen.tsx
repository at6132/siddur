import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { lightColors } from '../../src/design/colors';

/**
 * Matches the native splash / Expo Go launch icon while JS bootstraps
 * (fonts, onboarding gate). Renders before ThemeProvider, so uses light tokens.
 * Hides the native splash on mount so Expo Go's cached icon is replaced ASAP.
 */
export function BrandLaunchScreen() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <View
      style={[styles.root, { backgroundColor: lightColors.primary.main }]}
      accessibilityLabel="24/7"
    >
      <Image
        source={require('../../assets/icon-24-7.png')}
        style={styles.icon}
        resizeMode="contain"
        accessible={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 200,
    height: 200,
  },
});
