import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';
import { useLanguage } from '@context/LanguageContext';

/** Height of the bottom tab bar, so the banner clears it. */
const TAB_BAR_HEIGHT = 49;

export const OfflineBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // isInternetReachable distinguishes a connected-but-captive network from a
    // genuinely usable one; isConnected alone reports Wi-Fi with no route out.
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false || state.isInternetReachable === false);
    });
    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      bottom: insets.bottom + TAB_BAR_HEIGHT + theme.spacing.sm,
      backgroundColor: COLORS.alertHigh,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    text: {
      // Dark text on amber: the palette's light text would not meet contrast.
      color: COLORS.background,
      fontSize: theme.fontSize.sm,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessibilityLabel="You are offline. ZoneGuard is using cached data and location monitoring continues."
    >
      <Text style={styles.text}>{t('common.offline')}</Text>
    </View>
  );
};

export default OfflineBanner;
