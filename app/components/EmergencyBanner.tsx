import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';
import { rtlText } from '../i18n/rtl';
import { DisasterZone, SEVERITY_COLORS } from '@constants/zones';
import { useLanguage } from '@context/LanguageContext';

interface EmergencyBannerProps {
  zone: DisasterZone;
  distanceKm: number;
}

/**
 * Severity ranked so the most serious zone wins when several overlap. Exported
 * because the dashboard needs the same ordering to choose which zone to show.
 */
export const SEVERITY_RANK: Record<DisasterZone['severity'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const SEVERITY_LABEL_KEY: Record<DisasterZone['severity'], string> = {
  critical: 'severity.emergency',
  high: 'severity.urgent',
  medium: 'severity.important',
  low: 'severity.advisory',
};

/**
 * Shown only while the user is inside a zone. It is the single most urgent
 * thing the app can say, so it sits above everything else and takes the full
 * severity colour rather than a tint.
 */
export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({ zone, distanceKm }) => {
  const { t, isRTL } = useLanguage();
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();

  const fill = SEVERITY_COLORS[zone.severity];

  const styles = StyleSheet.create({
    container: {
      backgroundColor: fill,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
      ...theme.shadows.md,
    },
    body: { flex: 1 },
    severityLabel: {
      color: COLORS.textOnAccent,
      fontSize: theme.fontSize.xs,
      fontWeight: '700',
      letterSpacing: 0.8,
      opacity: 0.9,
      marginBottom: 2,
      ...rtlText(isRTL),
    },
    title: {
      color: COLORS.textOnAccent,
      fontSize: theme.fontSize.lg,
      fontWeight: 'bold',
      marginBottom: theme.spacing.xs,
      ...rtlText(isRTL),
    },
    description: {
      color: COLORS.textOnAccent,
      fontSize: theme.fontSize.sm,
      lineHeight: 20,
      opacity: 0.95,
      ...rtlText(isRTL),
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate('Alerts')}
      accessibilityRole="button"
      // Assertive: entering a zone is the most consequential state the app reports.
      accessibilityLiveRegion="assertive"
      accessibilityLabel={t('home.bannerA11y', {
        severity: t(SEVERITY_LABEL_KEY[zone.severity]),
        zone: zone.name,
        distance: distanceKm.toFixed(1),
      })}
    >
      <Ionicons
        name="warning"
        size={28}
        color={COLORS.textOnAccent}
        importantForAccessibility="no"
      />
      <View style={styles.body}>
        <Text style={styles.severityLabel}>{t(SEVERITY_LABEL_KEY[zone.severity])}</Text>
        <Text style={styles.title}>{zone.name}</Text>
        <Text style={styles.description}>
          {t('home.bannerBody', { distance: distanceKm.toFixed(1) })}
        </Text>
      </View>
      <Ionicons
        name={isRTL ? 'chevron-back' : 'chevron-forward'}
        size={20}
        color={COLORS.textOnAccent}
        importantForAccessibility="no"
      />
    </TouchableOpacity>
  );
};

export default EmergencyBanner;
