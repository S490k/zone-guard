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
import { Alert } from '@utils/zonesSync';

export const AlertsScreen: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertHistory, setAlertHistory] = useState<Alert[]>([
    {
      id: 'alert-1',
      zoneId: 'zone-taunsa-barrage',
      title: 'Flood Warning - Taunsa Barrage',
      description: 'Heavy rainfall expected in the next 24 hours',
      severity: 'high',
      latitude: 30.6987,
      longitude: 70.8503,
      radiusKm: 15,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000), // 22 hours from now
      isActive: true,
    },
  ]);

  const handleTestAlert = () => {
    const testAlert: Alert = {
      id: `test-${Date.now()}`,
      zoneId: 'zone-jacobabad',
      title: 'Test Alert',
      description: 'This is a test alert',
      severity: 'medium',
      latitude: 27.2822,
      longitude: 68.4501,
      radiusKm: 30,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      isActive: true,
    };
    setAlertHistory([testAlert, ...alertHistory]);
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

  const activeAlerts = alertHistory.filter((a) => a.isActive);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Alerts</Text>
          <Text style={styles.subtitle}>Disaster zone notifications</Text>
        </View>

        {/* Test Alert Button */}
        <TouchableOpacity style={styles.testButton} onPress={handleTestAlert}>
          <Text style={styles.testButtonText}>🧪 Send Test Alert</Text>
        </TouchableOpacity>

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Alerts</Text>
            <GlassmorphicCard>
              <View style={styles.alertsList}>
                {activeAlerts.map((alert) => (
                  <View
                    key={alert.id}
                    style={[
                      styles.alertItem,
                      { borderLeftColor: getSeverityColor(alert.severity) },
                    ]}
                  >
                    <View style={styles.alertHeader}>
                      <Text style={styles.alertIcon}>
                        {getSeverityIcon(alert.severity)}
                      </Text>
                      <Text style={styles.alertTitle}>{alert.title}</Text>
                    </View>
                    <Text style={styles.alertDescription}>
                      {alert.description}
                    </Text>
                    <Text style={styles.alertMeta}>
                      Zone: {alert.zoneId} • {alert.radiusKm}km radius
                    </Text>
                  </View>
                ))}
              </View>
            </GlassmorphicCard>
          </View>
        )}

        {/* Alert History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Alert History ({alertHistory.length})
          </Text>
          {alertHistory.length === 0 ? (
            <Text style={styles.emptyState}>No alerts yet</Text>
          ) : (
            <GlassmorphicCard>
              <View style={styles.alertsList}>
                {alertHistory.map((alert) => (
                  <View
                    key={alert.id}
                    style={[
                      styles.alertItem,
                      { borderLeftColor: getSeverityColor(alert.severity) },
                    ]}
                  >
                    <View style={styles.alertHeader}>
                      <Text style={styles.alertIcon}>
                        {getSeverityIcon(alert.severity)}
                      </Text>
                      <Text style={styles.alertTitle}>{alert.title}</Text>
                    </View>
                    <Text style={styles.alertDescription}>
                      {alert.description}
                    </Text>
                    <Text style={styles.alertMeta}>
                      {alert.createdAt.toLocaleString()}
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
