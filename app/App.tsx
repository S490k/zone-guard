import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS } from '@constants/colors';

import OnboardingScreen from '@screens/OnboardingScreen';
import HomeScreen from '@screens/HomeScreen';
import PrepareScreen from '@screens/PrepareScreen';
import AlertsScreen from '@screens/AlertsScreen';
import EmergencyInfoScreen from '@screens/EmergencyInfoScreen';

import { setupPushNotifications, setupNotificationListeners } from '@utils/fcmSetup';
import { startZonesSync } from '@utils/zonesSync';
import { cacheZones } from '@utils/zoneCache';
import { useAuth } from '@hooks/useAuth';
// Importing this file registers the background tasks with TaskManager (must happen at startup).
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  refreshGeofences,
} from '@tasks/backgroundLocationTask';

SplashScreen.preventAutoHideAsync().catch(() => {});

const ONBOARDING_KEY = 'zoneguard:onboardingComplete';

const Tab = createBottomTabNavigator();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.accent,
    background: COLORS.background,
    card: COLORS.surfaceOpaque,
    text: COLORS.textPrimary,
    border: COLORS.border,
    notification: COLORS.alertCritical,
  },
};

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'home',
  Prepare: 'list',
  Alerts: 'notifications',
  EmergencyInfo: 'information-circle',
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          backgroundColor: COLORS.surfaceOpaque,
          borderTopColor: COLORS.border,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="Prepare" component={PrepareScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen
        name="EmergencyInfo"
        component={EmergencyInfoScreen}
        options={{ title: 'Emergency Info' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const { user, error: authError } = useAuth();

  useEffect(() => {
    let unsubscribeZones: () => void = () => {};
    let removeListeners: () => void = () => {};

    (async () => {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
        setHasSeenOnboarding(seen === 'true');

        removeListeners = setupNotificationListeners();
        unsubscribeZones = startZonesSync(
          async (alerts) => {
            console.log(`[ZoneGuard] ${alerts.length} active alerts`);
            // Mirror to storage so the background task and offline mode can read them.
            await cacheZones(
              alerts.map((alert) => ({
                id: alert.id,
                name: alert.title,
                latitude: alert.latitude,
                longitude: alert.longitude,
                radiusKm: alert.radiusKm,
                severity: alert.severity,
                description: alert.description,
                createdAt: alert.createdAt,
                expiresAt: alert.expiresAt,
              }))
            );
            await refreshGeofences();
          },
          (error) => console.error('Zones sync error:', error)
        );
      } catch (error) {
        console.error('Error preparing app:', error);
      } finally {
        setIsReady(true);
      }
    })();

    return () => {
      unsubscribeZones();
      removeListeners();
    };
  }, []);

  useEffect(() => {
    if (authError) {
      console.error(
        '[ZoneGuard] Authentication unavailable — enable Anonymous sign-in in the Firebase console. Location sync is disabled.'
      );
    }
  }, [authError]);

  // Monitoring waits for both a session and a dismissed onboarding, so the
  // permission prompts do not interrupt the first-run tutorial.
  useEffect(() => {
    if (!user || !hasSeenOnboarding) return;

    setupPushNotifications().catch((e) => console.error(e));
    startBackgroundLocationTracking().then((result) => {
      if (!result.locationUpdates) {
        console.warn('[ZoneGuard] Background monitoring unavailable — permissions denied');
      }
    });

    return () => {
      stopBackgroundLocationTracking();
    };
  }, [user, hasSeenOnboarding]);

  const onLayoutReady = useCallback(async () => {
    if (isReady) await SplashScreen.hideAsync().catch(() => {});
  }, [isReady]);

  useEffect(() => {
    onLayoutReady();
  }, [onLayoutReady]);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setHasSeenOnboarding(true);
  }, []);

  if (!isReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {hasSeenOnboarding ? (
        <NavigationContainer theme={navigationTheme}>
          <TabNavigator />
        </NavigationContainer>
      ) : (
        <OnboardingScreen onComplete={completeOnboarding} />
      )}
    </SafeAreaProvider>
  );
}
