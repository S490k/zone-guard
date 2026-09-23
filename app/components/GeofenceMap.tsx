import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';

interface GeofenceMapProps {
  style?: ViewStyle;
  userLat?: number;
  userLon?: number;
}

// Placeholder for react-native-maps integration
// Will be fully implemented with MapView and Circle markers
export const GeofenceMap: React.FC<GeofenceMapProps> = ({
  style,
  userLat,
  userLon,
}) => {
  const styles = StyleSheet.create({
    container: {
      backgroundColor: COLORS.surfaceOpaque,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: COLORS.border,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 300,
      ...theme.shadows.md,
    },
    placeholder: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.base,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.placeholder}>
        Map Component
        {userLat && userLon ? `\nYou are at ${userLat.toFixed(3)}, ${userLon.toFixed(3)}` : ''}
      </Text>
    </View>
  );
};

export default GeofenceMap;
