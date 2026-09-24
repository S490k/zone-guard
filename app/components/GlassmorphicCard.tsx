import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';

interface GlassmorphicCardProps {
  children: ReactNode;
  style?: ViewStyle;
  intensity?: number;
  blurred?: boolean;
}

export const GlassmorphicCard: React.FC<GlassmorphicCardProps> = ({
  children,
  style,
  intensity = 40,
  blurred = true,
}) => {
  const styles = StyleSheet.create({
    container: {
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: 'hidden',
      ...theme.shadows.md,
    },
    inner: {
      padding: theme.spacing.lg,
    },
    // The blur samples what is behind the card; a translucent wash over it
    // keeps text contrast stable regardless of the backdrop.
    tint: {
      backgroundColor: COLORS.surface,
    },
    opaque: {
      backgroundColor: COLORS.surfaceOpaque,
    },
  });

  if (!blurred) {
    return (
      <View style={[styles.container, styles.opaque, style]}>
        <View style={styles.inner}>{children}</View>
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint="light"
      // Android has no native backdrop blur; this opts into Expo's software
      // implementation rather than silently rendering a flat surface.
      experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      style={[styles.container, style]}
    >
      <View style={[styles.inner, styles.tint]}>{children}</View>
    </BlurView>
  );
};

export default GlassmorphicCard;
