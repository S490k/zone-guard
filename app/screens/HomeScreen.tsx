import React from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';
import { rtlText } from '../i18n/rtl';
import { useLocationMonitor } from '@hooks/useLocationMonitor';
import { useZones, ZonesSource } from '@context/ZonesContext';
import { useProgress } from '@context/ProgressContext';
import { useLanguage } from '@context/LanguageContext';
import { SCORE_WEIGHTS } from '@utils/preparednessScore';
import { SEVERITY_COLORS } from '@constants/zones';
import { GlassmorphicCard } from '@components/GlassmorphicCard';
import { StressIndicator } from '@components/StressIndicator';
import { GeofenceMap } from '@components/GeofenceMap';
import { DashboardHeader } from '@components/DashboardHeader';
import {
  EmergencyBanner,
  SEVERITY_RANK,
  SEVERITY_LABEL_KEY,
} from '@components/EmergencyBanner';

const SOURCE_KEY: Record<ZonesSource, string> = {
  firestore: 'home.sourceLive',
  cache: 'home.sourceCache',
  bundled: 'home.sourceBundled',
};

export const HomeScreen: React.FC = () => {
  const { zones, source, isLoading } = useZones();
  const { location, activeZones, error } = useLocationMonitor(zones);
  const { score } = useProgress();
  const { t, isRTL } = useLanguage();

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
    scoreContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
    },
    statusText: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
      marginTop: theme.spacing.md,
      textAlign: 'center',
      ...rtlText(isRTL),
    },
    zonesList: {
      gap: theme.spacing.md,
    },
    zoneItem: {
      backgroundColor: COLORS.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      borderLeftWidth: 5,
      borderLeftColor: COLORS.accent,
      ...theme.shadows.sm,
    },
    zoneSeverity: {
      fontSize: theme.fontSize.xs,
      fontWeight: '700',
      letterSpacing: 0.8,
      marginBottom: 2,
      ...rtlText(isRTL),
    },
    zoneTitle: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.md,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
      ...rtlText(isRTL),
    },
    zoneDistance: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
      ...rtlText(isRTL),
    },
    errorText: {
      color: COLORS.alertCritical,
      fontSize: theme.fontSize.sm,
      paddingHorizontal: theme.spacing.md,
      ...rtlText(isRTL),
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

  // When zones overlap, the banner reports the most serious one.
  const primaryAlert = [...zonesContainingUser].sort(
    (a, b) => SEVERITY_RANK[b.zone.severity] - SEVERITY_RANK[a.zone.severity]
  )[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <DashboardHeader activeAlertCount={zonesContainingUser.length} />

        {primaryAlert && (
          <EmergencyBanner
            zone={primaryAlert.zone}
            distanceKm={primaryAlert.proximity.distance}
          />
        )}

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
          <Text style={styles.sectionTitle}>{t('home.scoreTitle')}</Text>
          <GlassmorphicCard>
            <View style={styles.scoreContainer}>
              <StressIndicator score={score.total} size="lg" />
              <Text style={styles.statusText}>
                {t('home.scoreBreakdown', {
                  tasks: `${score.tasks}/${SCORE_WEIGHTS.tasks}`,
                  kit: `${score.kit}/${SCORE_WEIGHTS.kit}`,
                  quiz: `${score.quiz}/${SCORE_WEIGHTS.quiz}`,
                })}
              </Text>
            </View>
          </GlassmorphicCard>
        </View>

        {/* Location & Zones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.locationTitle')}</Text>
          <GlassmorphicCard>
            <GeofenceMap
              userLat={location?.latitude}
              userLon={location?.longitude}
              zones={zones}
            />
            <Text style={styles.statusText}>
              {location
                ? `📍 ${location.latitude.toFixed(3)}°, ${location.longitude.toFixed(3)}°`
                : t('home.awaitingFix')}
            </Text>
          </GlassmorphicCard>
        </View>

        {/* Monitored Zones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {zonesContainingUser.length > 0 ? t('home.inZone') : t('home.monitoredZones')}
          </Text>
          <Text style={styles.zoneDistance}>
            {isLoading
              ? t('home.loadingZones')
              : `${t('home.zonesMonitored', { count: zones.length })} · ${t(SOURCE_KEY[source])}`}
          </Text>

          {rankedZones.length === 0 ? (
            <GlassmorphicCard style={{ marginTop: theme.spacing.md }}>
              <Text style={styles.statusText}>
                {zones.length === 0 ? t('home.noZones') : t('home.waitingLocation')}
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
                  accessible
                  // Entering a zone is the app's most consequential state change,
                  // so it is announced rather than left for the user to discover.
                  accessibilityLiveRegion={proximity.isInZone ? 'assertive' : 'none'}
                  accessibilityLabel={
                    proximity.isInZone
                      ? `Warning. You are inside ${zone.name}, ${zone.severity} severity, ${proximity.distance.toFixed(1)} kilometres from the centre.`
                      : `${zone.name}, ${proximity.distance.toFixed(1)} kilometres away, ${zone.radiusKm} kilometre radius.`
                  }
                >
                  <Text
                    style={[styles.zoneSeverity, { color: SEVERITY_COLORS[zone.severity] }]}
                  >
                    {t(SEVERITY_LABEL_KEY[zone.severity])}
                  </Text>
                  <Text style={styles.zoneTitle}>{zone.name}</Text>
                  <Text style={styles.zoneDistance}>
                    {proximity.isInZone
                      ? t('home.insideZone', { distance: proximity.distance.toFixed(1) })
                      : t('home.awayFromZone', {
                          distance: proximity.distance.toFixed(1),
                          radius: zone.radiusKm,
                        })}
                  </Text>
                  <Text style={[styles.zoneDistance, { color: SEVERITY_COLORS[zone.severity] }]}>
                    {proximity.isInZone
                      ? t('home.statusInZone', { severity: zone.severity.toUpperCase() })
                      : proximity.isNearZone
                        ? proximity.estimatedTimeToZone
                          ? t('home.statusApproachingEta', { minutes: proximity.estimatedTimeToZone })
                          : t('home.statusApproaching')
                        : t('home.statusClear')}
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
