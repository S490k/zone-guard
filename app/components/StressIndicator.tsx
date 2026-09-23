import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';

interface StressIndicatorProps {
  // Preparedness score: 0-100
  score: number;
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
}

export const StressIndicator: React.FC<StressIndicatorProps> = ({
  score,
  style,
  size = 'md',
}) => {
  const getStatusColor = (score: number) => {
    if (score >= 75) return COLORS.success;
    if (score >= 50) return COLORS.alertMedium;
    if (score >= 25) return COLORS.alertHigh;
    return COLORS.alertCritical;
  };

  const getStatusLabel = (score: number) => {
    if (score >= 75) return 'Well Prepared';
    if (score >= 50) return 'Moderately Prepared';
    if (score >= 25) return 'Needs Work';
    return 'Critical Gap';
  };

  const statusColor = useMemo(() => getStatusColor(score), [score]);
  const statusLabel = useMemo(() => getStatusLabel(score), [score]);

  const sizeConfig = {
    sm: {
      containerSize: 60,
      fontSize: theme.fontSize.sm,
      scoreSize: theme.fontSize.md,
    },
    md: {
      containerSize: 100,
      fontSize: theme.fontSize.base,
      scoreSize: theme.fontSize.xxxl,
    },
    lg: {
      containerSize: 140,
      fontSize: theme.fontSize.lg,
      scoreSize: 48,
    },
  }[size];

  const styles = StyleSheet.create({
    container: {
      width: sizeConfig.containerSize,
      height: sizeConfig.containerSize,
      borderRadius: sizeConfig.containerSize / 2,
      backgroundColor: COLORS.surface,
      borderWidth: 3,
      borderColor: statusColor,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.md,
    },
    score: {
      color: statusColor,
      fontSize: sizeConfig.scoreSize,
      fontWeight: 'bold',
    },
    label: {
      color: statusColor,
      fontSize: sizeConfig.fontSize,
      marginTop: theme.spacing.sm,
      textAlign: 'center',
    },
  });

  // Read as one unit: the digits and the label are meaningless apart.
  return (
    <View
      style={style}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Preparedness score ${Math.round(score)} out of 100. ${statusLabel}.`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(score) }}
    >
      <View style={styles.container}>
        <Text style={styles.score}>{Math.round(score)}</Text>
      </View>
      <Text style={styles.label}>{statusLabel}</Text>
    </View>
  );
};

export default StressIndicator;
