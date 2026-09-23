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
import { GlassmorphicCard } from '@components/GlassmorphicCard';
import { useZones } from '@context/ZonesContext';
import { presentZoneAlert } from '@utils/localAlerts';
import { requestNotificationPermissions } from '@utils/fcmSetup';

export const AlertsScreen: React.FC = () => {
  const { zones, isLive, isLoading } = useZones();
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const handleTestAlert = async () => {
    const zone = zones[0];
    if (!zone) {
      setTestStatus('No zones available to test against.');
      return;
    }

    if (!(await requestNotificationPermissions())) {
      setTestStatus('Notifications are turned off for ZoneGuard.');
      return;
    }

    // bypassDedup so repeated presses always deliver; a real entry alert stays
    // subject to the cooldown.
    const delivered = await presentZoneAlert(zone, {
      isTest: true,
      bypassDedup: true,
    });
    setTestStatus(
      delivered ? `Test alert sent for ${zone.name}.` : 'Test alert could not be delivered.'
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
    },
    subtitle: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.base,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.lg,
      fontWeight: '600',
      marginBottom: theme.spacing.md,
    },
    testButton: {
      backgroundColor: COLORS.accent,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    testButtonText: {
      color: COLORS.background,
      fontSize: theme.fontSize.md,
      fontWeight: '600',
      textAlign: 'center',
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
    },
    alertDescription: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
      marginBottom: theme.spacing.sm,
    },
    alertMeta: {
      color: COLORS.textTertiary,
      fontSize: theme.fontSize.xs,
    },
    emptyState: {
      textAlign: 'center',
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.base,
      paddingVertical: theme.spacing.xl,
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
          <Text style={styles.title}>Alerts</Text>
          <Text style={styles.subtitle}>
            {isLoading
              ? 'Loading active alerts…'
              : isLive
                ? 'Live from the national alert feed'
                : 'Offline — showing cached alerts'}
          </Text>
        </View>

        {/* Test Alert Button */}
        <TouchableOpacity style={styles.testButton} onPress={handleTestAlert}>
          <Text style={styles.testButtonText}>Send Test Alert</Text>
        </TouchableOpacity>
        {testStatus && <Text style={styles.alertMeta}>{testStatus}</Text>}

        {/* Active Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Alerts ({zones.length})</Text>
          {zones.length === 0 ? (
            <Text style={styles.emptyState}>
              No active alerts. Published alerts appear here automatically.
            </Text>
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
                  >
                    <View style={styles.alertHeader}>
                      <Text style={styles.alertIcon}>
                        {getSeverityIcon(zone.severity)}
                      </Text>
                      <Text style={styles.alertTitle}>{zone.name}</Text>
                    </View>
                    <Text style={styles.alertDescription}>{zone.description}</Text>
                    <Text style={styles.alertMeta}>
                      {zone.radiusKm}km radius
                      {zone.expiresAt ? ` • expires ${zone.expiresAt.toLocaleString()}` : ''}
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
