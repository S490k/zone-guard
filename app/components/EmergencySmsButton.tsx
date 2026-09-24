import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';
import { rtlText } from '../i18n/rtl';
import { useLanguage } from '@context/LanguageContext';
import { useZones } from '@context/ZonesContext';
import { detectActiveZones } from '@utils/distance';
import { composeEmergencyMessage, sendEmergencySms } from '@utils/emergencySms';

export const EmergencySmsButton: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const { zones } = useZones();
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handlePress = async () => {
    setIsBusy(true);
    setStatus(null);

    // Last known rather than a fresh fix: waiting on GPS is the wrong tradeoff
    // when someone is trying to send an emergency message.
    let latitude: number | undefined;
    let longitude: number | undefined;
    try {
      const last = await Location.getLastKnownPositionAsync();
      latitude = last?.coords.latitude;
      longitude = last?.coords.longitude;
    } catch {
      // Message still worth sending without coordinates.
    }

    const zoneNames =
      latitude !== undefined && longitude !== undefined
        ? detectActiveZones(latitude, longitude, zones)
            .filter((p) => p.isInZone)
            .map((p) => zones.find((z) => z.id === p.zoneId)?.name)
            .filter((name): name is string => Boolean(name))
        : [];

    const message = composeEmergencyMessage(
      { latitude, longitude, zoneNames, timestamp: new Date() },
      {
        intro: t('emergency.smsIntro'),
        at: t('emergency.smsAt'),
        inZone: t('emergency.smsInZone'),
        noLocation: t('emergency.smsNoLocation'),
        sentAt: t('emergency.smsSentAt'),
      }
    );

    const outcome = await sendEmergencySms(message);
    setIsBusy(false);

    if (outcome === 'unavailable') setStatus(t('emergency.smsUnavailable'));
    else if (outcome === 'cancelled') setStatus(t('emergency.smsCancelled'));
    else if (outcome === 'failed') setStatus(t('emergency.smsFailed'));
  };

  const styles = StyleSheet.create({
    explainer: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
      lineHeight: 20,
      marginBottom: theme.spacing.md,
      ...rtlText(isRTL),
    },
    button: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      backgroundColor: COLORS.alertCritical,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.md,
      minHeight: 44,
    },
    buttonText: {
      color: COLORS.textOnAccent,
      fontSize: theme.fontSize.md,
      fontWeight: '700',
    },
    status: {
      color: COLORS.textTertiary,
      fontSize: theme.fontSize.sm,
      marginTop: theme.spacing.sm,
      ...rtlText(isRTL),
    },
  });

  return (
    <View>
      <Text style={styles.explainer}>{t('emergency.smsExplainer')}</Text>

      <TouchableOpacity
        style={[styles.button, isBusy && { opacity: 0.6 }]}
        onPress={handlePress}
        disabled={isBusy}
        accessibilityRole="button"
        accessibilityLabel={t('emergency.smsButton')}
        accessibilityHint={t('emergency.smsExplainer')}
        accessibilityState={{ disabled: isBusy }}
      >
        <Ionicons
          name="chatbubble-ellipses"
          size={20}
          color={COLORS.textOnAccent}
          importantForAccessibility="no"
        />
        <Text style={styles.buttonText}>{t('emergency.smsButton')}</Text>
      </TouchableOpacity>

      {status && (
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {status}
        </Text>
      )}
    </View>
  );
};

export default EmergencySmsButton;
