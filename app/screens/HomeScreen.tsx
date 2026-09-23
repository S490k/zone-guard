import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';
import { useLocationMonitor } from '@hooks/useLocationMonitor';
import { GlassmorphicCard } from '@components/GlassmorphicCard';
import { StressIndicator } from '@components/StressIndicator';
import { GeofenceMap } from '@components/GeofenceMap';

export const HomeScreen: React.FC = () => {
  const { location, activeZones, error } = useLocationMonitor();
  const [preparednessScore, setPreparednessScore] = useState(45);

  useEffect(() => {
    // Initialize preparedness score from Firestore
    // TODO: Fetch from db
    setPreparednessScore(45);
  }, []);

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
    scoreContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
    },
    statusText: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
      marginTop: theme.spacing.md,
      textAlign: 'center',
    },
    zonesList: {
      gap: theme.spacing.md,
    },
    zoneItem: {
      backgroundColor: COLORS.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.accent,
    },
    zoneTitle: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.md,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
    },
    zoneDistance: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
    },
    errorText: {
      color: COLORS.alertCritical,
      fontSize: theme.fontSize.sm,
      paddingHorizontal: theme.spacing.md,
    },
  });

  const closestZone = activeZones.length > 0 ? activeZones[0] : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>
            Your disaster preparedness overview
          </Text>
        </View>

        {/* Error Alert */}
        {error && (
          <GlassmorphicCard
            style={{
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              borderColor: COLORS.alertCritical,
              marginBottom: theme.spacing.lg,
            }}
          >
            <Text style={styles.errorText}>{error.message}</Text>
          </GlassmorphicCard>
        )}

        {/* Preparedness Score */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preparedness Score</Text>
          <GlassmorphicCard>
            <View style={styles.scoreContainer}>
              <StressIndicator score={preparednessScore} size="lg" />
              <Text style={styles.statusText}>
                Complete more tasks and quizzes to improve your score
              </Text>
            </View>
          </GlassmorphicCard>
        </View>

        {/* Location & Zones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Location</Text>
          <GlassmorphicCard>
            <GeofenceMap
              userLat={location?.latitude}
              userLon={location?.longitude}
            />
            <Text style={styles.statusText}>
              {location
                ? `📍 ${location.latitude.toFixed(3)}°, ${location.longitude.toFixed(3)}°`
                : 'Waiting for location...'}
            </Text>
          </GlassmorphicCard>
        </View>

        {/* Nearby Zones */}
        {closestZone && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nearest Zone</Text>
            <GlassmorphicCard>
              <View style={styles.zonesList}>
                <View style={styles.zoneItem}>
                  <Text style={styles.zoneTitle}>Zone: {closestZone.zoneId}</Text>
                  <Text style={styles.zoneDistance}>
                    Distance: {closestZone.distance.toFixed(2)} km
                  </Text>
                  <Text style={styles.zoneDistance}>
                    Status: {closestZone.isInZone ? '🔴 IN ZONE' : closestZone.isNearZone ? '🟡 NEARBY' : '🟢 CLEAR'}
                  </Text>
                </View>
              </View>
            </GlassmorphicCard>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
