import React, { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS } from '@constants/colors';

import OnboardingScreen from '@screens/OnboardingScreen';
import { OfflineBanner } from '@components/OfflineBanner';
import HomeScreen from '@screens/HomeScreen';
import PrepareScreen from '@screens/PrepareScreen';
import AlertsScreen from '@screens/AlertsScreen';
import EmergencyInfoScreen from '@screens/EmergencyInfoScreen';
import LeaderboardScreen from '@screens/LeaderboardScreen';

import { setupPushNotifications, setupNotificationListeners } from '@utils/fcmSetup';
import { useAuth } from '@hooks/useAuth';
import { ZonesProvider } from '@context/ZonesContext';
import { ProgressProvider } from '@context/ProgressContext';
import { LanguageProvider, useLanguage } from '@context/LanguageContext';
// Importing this file registers the background tasks with TaskManager (must happen at startup).
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
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
  Leaderboard: 'trophy',
};

function TabNavigator() {
  const { t } = useLanguage();

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
          // Android's gesture bar sits tighter under the tab bar than iOS's
          // home indicator, so the row needs explicit room to avoid clipping.
          height: Platform.OS === 'android' ? 68 : undefined,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'android' ? 10 : undefined,
        },
        // Five tabs leave roughly 72dp each on a narrow screen. At the default
        // size the longer labels ellipsise; fixed scaling keeps that true
        // regardless of the device's font-size accessibility setting.
        tabBarLabelStyle: {
          fontSize: 10,
          lineHeight: 13,
        },
        tabBarAllowFontScaling: false,
        tabBarItemStyle: { paddingHorizontal: 2 },
      })}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} options={{ title: t('tabs.dashboard') }} />
      <Tab.Screen name="Prepare" component={PrepareScreen} options={{ title: t('tabs.prepare') }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ title: t('tabs.alerts') }} />
      <Tab.Screen
        name="EmergencyInfo"
        component={EmergencyInfoScreen}
        options={{ title: t('tabs.emergencyInfo') }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ title: t('tabs.leaderboard') }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const { user, error: authError } = useAuth();

  useEffect(() => {
    let removeListeners: () => void = () => {};

    (async () => {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
        setHasSeenOnboarding(seen === 'true');
        removeListeners = setupNotificationListeners();
      } catch (error) {
        console.error('Error preparing app:', error);
      } finally {
        setIsReady(true);
      }
    })();

    return () => {
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
      <LanguageProvider>
        <ZonesProvider>
          <ProgressProvider>
            {hasSeenOnboarding ? (
              <NavigationContainer theme={navigationTheme}>
                <TabNavigator />
                <OfflineBanner />
              </NavigationContainer>
            ) : (
              <OnboardingScreen onComplete={completeOnboarding} />
            )}
          </ProgressProvider>
        </ZonesProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
