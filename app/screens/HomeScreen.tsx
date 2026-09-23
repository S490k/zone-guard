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
import { useZones } from '@context/ZonesContext';
import { SEVERITY_COLORS } from '@constants/zones';
import { GlassmorphicCard } from '@components/GlassmorphicCard';
import { StressIndicator } from '@components/StressIndicator';
import { GeofenceMap } from '@components/GeofenceMap';

export const HomeScreen: React.FC = () => {
  const { zones, isLive, isLoading } = useZones();
  const { location, activeZones, error } = useLocationMonitor(zones);
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

  // activeZones is sorted nearest-first and carries only ids; pair each with its
  // zone so the UI can show a name rather than "zone-taunsa-barrage".
  const rankedZones = activeZones
    .map((proximity) => ({
      proximity,
      zone: zones.find((candidate) => candidate.id === proximity.zoneId),
    }))
    .filter((entry): entry is { proximity: typeof entry.proximity; zone: NonNullable<typeof entry.zone> } =>
      Boolean(entry.zone)
    );

  const zonesContainingUser = rankedZones.filter((entry) => entry.proximity.isInZone);

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

        {/* Monitored Zones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {zonesContainingUser.length > 0 ? 'You are in a disaster zone' : 'Monitored Zones'}
          </Text>
          <Text style={styles.zoneDistance}>
            {isLoading
              ? 'Loading zones…'
              : `${zones.length} zone${zones.length === 1 ? '' : 's'} monitored` +
                (isLive ? '' : ' · offline, using cached data')}
          </Text>

          {rankedZones.length === 0 ? (
            <GlassmorphicCard style={{ marginTop: theme.spacing.md }}>
              <Text style={styles.statusText}>
                {zones.length === 0
                  ? 'No active zones. Alerts will appear here when one is published.'
                  : 'Waiting for your location to compare against zones…'}
              </Text>
            </GlassmorphicCard>
          ) : (
            <View style={[styles.zonesList, { marginTop: theme.spacing.md }]}>
              {rankedZones.map(({ proximity, zone }) => (
                <View
                  key={zone.id}
                  style={[
                    styles.zoneItem,
                    { borderLeftColor: SEVERITY_COLORS[zone.severity] },
                  ]}
                >
                  <Text style={styles.zoneTitle}>{zone.name}</Text>
                  <Text style={styles.zoneDistance}>
                    {proximity.isInZone
                      ? `Inside · ${proximity.distance.toFixed(1)}km from centre`
                      : `${proximity.distance.toFixed(1)}km away · ${zone.radiusKm}km radius`}
                  </Text>
                  <Text style={[styles.zoneDistance, { color: SEVERITY_COLORS[zone.severity] }]}>
                    {proximity.isInZone
                      ? `IN ZONE · ${zone.severity.toUpperCase()}`
                      : proximity.isNearZone
                        ? `APPROACHING${proximity.estimatedTimeToZone ? ` · ~${proximity.estimatedTimeToZone} min away` : ''}`
                        : 'CLEAR'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
