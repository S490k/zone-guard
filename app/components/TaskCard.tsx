import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high';
}

interface TaskCardProps {
  task: Task;
  onPress?: (taskId: string) => void;
  onToggle?: (taskId: string) => void;
  style?: ViewStyle;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onPress,
  onToggle,
  style,
}) => {
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return COLORS.alertHigh;
      case 'medium':
        return COLORS.alertMedium;
      case 'low':
        return COLORS.alertLow;
      default:
        return COLORS.accent;
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: COLORS.surface,
      borderRadius: theme.borderRadius.md,
      borderLeftWidth: 4,
      borderLeftColor: getPriorityColor(task.priority),
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      // WCAG 2.1 AA minimum target size; the row is the touch target.
      minHeight: 44,
      ...theme.shadows.sm,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 2,
      borderColor: task.completed ? COLORS.success : COLORS.border,
      backgroundColor: task.completed ? COLORS.success : 'transparent',
      marginRight: theme.spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkmark: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.base,
      fontWeight: 'bold',
    },
    content: {
      flex: 1,
    },
    title: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.md,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
      textDecorationLine: task.completed ? 'line-through' : 'none',
    },
    description: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
    },
  });

  // One touchable for the whole row rather than a checkbox nested inside a card.
  // Nesting gave screen readers two overlapping targets for a single action, and
  // left the card itself inert when only onToggle was supplied.
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => (onPress ? onPress(task.id) : onToggle?.(task.id))}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: task.completed }}
      accessibilityLabel={task.title}
      accessibilityHint={task.description}
    >
      <View style={styles.checkbox} importantForAccessibility="no">
        {task.completed && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{task.title}</Text>
        {task.description && (
          <Text style={styles.description}>{task.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default TaskCard;
