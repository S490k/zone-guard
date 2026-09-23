import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';
import { rtlText } from '../i18n/rtl';
import { GlassmorphicCard } from '@components/GlassmorphicCard';
import { useZones } from '@context/ZonesContext';
import { useLanguage } from '@context/LanguageContext';
import { presentZoneAlert } from '@utils/localAlerts';
import { requestNotificationPermissions } from '@utils/fcmSetup';

export const AlertsScreen: React.FC = () => {
  const { zones, source, isLoading } = useZones();
  const { t, isRTL } = useLanguage();
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const handleTestAlert = async () => {
    const zone = zones[0];
    if (!zone) {
      setTestStatus(t('alerts.testNoZones'));
      return;
    }

    if (!(await requestNotificationPermissions())) {
      setTestStatus(t('alerts.testNoPermission'));
      return;
    }

    // bypassDedup so repeated presses always deliver; a real entry alert stays
    // subject to the cooldown.
    const delivered = await presentZoneAlert(zone, {
      isTest: true,
      bypassDedup: true,
    });
    setTestStatus(
      delivered ? t('alerts.testSent', { zone: zone.name }) : t('alerts.testFailed')
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return COLORS.alertLow;
      case 'medium':
        return COLORS.alertMedium;
      case 'high':
        return COLORS.alertHigh;
      case 'critical':
        return COLORS.alertCritical;
      default:
        return COLORS.accent;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      default:
        return 'ℹ️';
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    header: {
      marginBottom: theme.spacing.xl,
    },
    title: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.xxxl,
      fontWeight: 'bold',
      marginBottom: theme.spacing.sm,
      ...rtlText(isRTL),
    },
    subtitle: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.base,
      ...rtlText(isRTL),
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.lg,
      fontWeight: '600',
      marginBottom: theme.spacing.md,
      ...rtlText(isRTL),
    },
    testButton: {
      backgroundColor: COLORS.accent,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      minHeight: 44,
      justifyContent: 'center',
    },
    testButtonText: {
      color: COLORS.background,
      fontSize: theme.fontSize.md,
      fontWeight: '600',
      textAlign: 'center',
      ...rtlText(isRTL),
    },
    alertsList: {
      gap: theme.spacing.md,
    },
    alertItem: {
      backgroundColor: COLORS.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      borderLeftWidth: 4,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    alertHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    alertIcon: {
      fontSize: theme.fontSize.xl,
      marginRight: theme.spacing.sm,
    },
    alertTitle: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.md,
      fontWeight: '600',
      flex: 1,
      ...rtlText(isRTL),
    },
    alertDescription: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
      marginBottom: theme.spacing.sm,
      ...rtlText(isRTL),
    },
    alertMeta: {
      color: COLORS.textTertiary,
      fontSize: theme.fontSize.xs,
      ...rtlText(isRTL),
    },
    emptyState: {
      textAlign: 'center',
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.base,
      paddingVertical: theme.spacing.xl,
      ...rtlText(isRTL),
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('alerts.title')}</Text>
          <Text style={styles.subtitle}>
            {isLoading
              ? t('alerts.loading')
              : source === 'firestore'
                ? t('alerts.live')
                : source === 'cache'
                  ? t('alerts.cached')
                  : t('alerts.defaults')}
          </Text>
        </View>

        {/* Test Alert Button */}
        <TouchableOpacity
          style={styles.testButton}
          onPress={handleTestAlert}
          accessibilityRole="button"
          accessibilityLabel="Send a test alert notification"
          accessibilityHint="Delivers a clearly marked test notification so you can confirm alerts work"
        >
          <Text style={styles.testButtonText}>{t('alerts.testButton')}</Text>
        </TouchableOpacity>
        {testStatus && (
          <Text style={styles.alertMeta} accessibilityLiveRegion="polite">
            {testStatus}
          </Text>
        )}

        {/* Active Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('alerts.activeAlerts', { count: zones.length })}
          </Text>
          {zones.length === 0 ? (
            <Text style={styles.emptyState}>{t('alerts.none')}</Text>
          ) : (
            <GlassmorphicCard>
              <View style={styles.alertsList}>
                {zones.map((zone) => (
                  <View
                    key={zone.id}
                    style={[
                      styles.alertItem,
                      { borderLeftColor: getSeverityColor(zone.severity) },
                    ]}
                    accessible
                    accessibilityLabel={`${zone.severity} severity. ${zone.name}. ${zone.description}. ${zone.radiusKm} kilometre radius.`}
                  >
                    <View style={styles.alertHeader}>
                      <Text style={styles.alertIcon} importantForAccessibility="no">
                        {getSeverityIcon(zone.severity)}
                      </Text>
                      <Text style={styles.alertTitle}>{zone.name}</Text>
                    </View>
                    <Text style={styles.alertDescription}>{zone.description}</Text>
                    <Text style={styles.alertMeta}>
                      {t('alerts.radius', { radius: zone.radiusKm })}
                      {zone.expiresAt
                        ? t('alerts.expires', { date: zone.expiresAt.toLocaleString() })
                        : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </GlassmorphicCard>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AlertsScreen;
