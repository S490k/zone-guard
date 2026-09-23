import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';

interface GlassmorphicCardProps {
  children: ReactNode;
  style?: ViewStyle;
  intensity?: number; // 0-100
  blurred?: boolean;
}

export const GlassmorphicCard: React.FC<GlassmorphicCardProps> = ({
  children,
  style,
  intensity = 80,
  blurred = true,
}) => {
  const styles = StyleSheet.create({
    container: {
      backgroundColor: COLORS.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: theme.spacing.lg,
      overflow: 'hidden',
      ...theme.shadows.md,
    },
  });

  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
};

export default GlassmorphicCard;
