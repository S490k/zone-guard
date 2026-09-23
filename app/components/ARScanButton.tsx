import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';

interface ARScanButtonProps {
  onPress?: () => void;
  style?: ViewStyle;
}

// Placeholder for future AR scanner integration
export const ARScanButton: React.FC<ARScanButtonProps> = ({
  onPress,
  style,
}) => {
  const styles = StyleSheet.create({
    button: {
      backgroundColor: COLORS.accent,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.md,
    },
    text: {
      color: COLORS.background,
      fontSize: theme.fontSize.md,
      fontWeight: '600',
    },
  });

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.text}>📷 Scan Items</Text>
    </TouchableOpacity>
  );
};

export default ARScanButton;
