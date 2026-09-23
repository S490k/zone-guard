import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated, Easing, Platform } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';
import { DisasterZone, SEVERITY_COLORS } from '@constants/zones';
import { useLanguage } from '@context/LanguageContext';

interface GeofenceMapProps {
  style?: ViewStyle;
  userLat?: number;
  userLon?: number;
  zones?: DisasterZone[];
}

/** Hex to rgba, so zone fills can reuse the severity palette at low opacity. */
function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const GeofenceMap: React.FC<GeofenceMapProps> = ({
  style,
  userLat,
  userLon,
  zones = [],
}) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const { t } = useLanguage();

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        // Driven on the JS thread because opacity and scale are interpolated
        // together onto a view layered over the map.
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const styles = StyleSheet.create({
    container: {
      height: 300,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    placeholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.surfaceOpaque,
    },
    placeholderText: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.base,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    pulseWrapper: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      pointerEvents: 'none',
    },
    pulse: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: COLORS.accent,
    },
  });

  if (userLat === undefined || userLon === undefined) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{t('home.waitingLocation')}</Text>
        </View>
      </View>
    );
  }

  // Frame the view so the widest zone stays visible rather than fixing a span.
  const widestRadiusKm = zones.reduce((widest, zone) => Math.max(widest, zone.radiusKm), 10);
  const delta = Math.min(8, (widestRadiusKm / 111) * 4);

  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityLabel={`Map showing your position and ${zones.length} disaster zone${zones.length === 1 ? '' : 's'}`}
    >
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        region={{
          latitude: userLat,
          longitude: userLon,
          latitudeDelta: delta,
          longitudeDelta: delta,
        }}
        userInterfaceStyle="dark"
        showsUserLocation={Platform.OS === 'ios'}
        toolbarEnabled={false}
      >
        <Marker
          coordinate={{ latitude: userLat, longitude: userLon }}
          title="Your location"
          pinColor={COLORS.accent}
        />
        {zones.map((zone) => (
          <Circle
            key={zone.id}
            center={{ latitude: zone.latitude, longitude: zone.longitude }}
            radius={zone.radiusKm * 1000}
            strokeColor={SEVERITY_COLORS[zone.severity]}
            fillColor={withAlpha(SEVERITY_COLORS[zone.severity], 0.2)}
            strokeWidth={2}
          />
        ))}
      </MapView>

      <View style={styles.pulseWrapper}>
        <Animated.View
          style={[
            styles.pulse,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
              transform: [
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.4] }) },
              ],
            },
          ]}
        />
      </View>
    </View>
  );
};

export default GeofenceMap;
