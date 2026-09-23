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
import { GlassmorphicCard } from '@components/GlassmorphicCard';
import { TaskCard, Task } from '@components/TaskCard';

export const PrepareScreen: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Create Emergency Contact List',
      description: 'Add 3-5 emergency contacts',
      completed: false,
      priority: 'high',
    },
    {
      id: '2',
      title: 'Prepare Go-Bag',
      description: 'Pack essential items (documents, cash, medications)',
      completed: false,
      priority: 'high',
    },
    {
      id: '3',
      title: 'Identify Safe Meeting Point',
      description: 'Choose a location to meet family members',
      completed: false,
      priority: 'medium',
    },
    {
      id: '4',
      title: 'Review Emergency Procedures',
      description: 'Read through earthquake/flood procedures',
      completed: false,
      priority: 'medium',
    },
    {
      id: '5',
      title: 'Update Insurance Information',
      description: 'Ensure your insurance details are current',
      completed: false,
      priority: 'low',
    },
  ]);

  const [quizzes, setQuizzes] = useState<any[]>([
    {
      id: 'quiz-1',
      title: 'Earthquake Safety',
      questions: 5,
      completed: false,
      score: null,
    },
    {
      id: 'quiz-2',
      title: 'Flood Preparedness',
      questions: 5,
      completed: false,
      score: null,
    },
    {
      id: 'quiz-3',
      title: 'First Aid Basics',
      questions: 5,
      completed: false,
      score: null,
    },
  ]);

  const handleTaskToggle = (taskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const completedTasks = tasks.filter((t) => t.completed).length;
  const completedQuizzes = quizzes.filter((q) => q.completed).length;

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
    progressText: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
      marginBottom: theme.spacing.md,
    },
    tasksList: {
      gap: theme.spacing.sm,
    },
    quizGrid: {
      gap: theme.spacing.md,
    },
    quizCard: {
      backgroundColor: COLORS.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.accent,
    },
    quizTitle: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.md,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
    },
    quizMeta: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Prepare</Text>
          <Text style={styles.subtitle}>Build your emergency readiness</Text>
        </View>

        {/* Tasks Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preparation Tasks</Text>
          <Text style={styles.progressText}>
            {completedTasks} of {tasks.length} completed
          </Text>
          <GlassmorphicCard>
            <View style={styles.tasksList}>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={handleTaskToggle}
                />
              ))}
            </View>
          </GlassmorphicCard>
        </View>

        {/* Quizzes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Knowledge Quizzes</Text>
          <Text style={styles.progressText}>
            {completedQuizzes} of {quizzes.length} completed
          </Text>
          <GlassmorphicCard>
            <View style={styles.quizGrid}>
              {quizzes.map((quiz) => (
                <View key={quiz.id} style={styles.quizCard}>
                  <Text style={styles.quizTitle}>{quiz.title}</Text>
                  <Text style={styles.quizMeta}>
                    {quiz.questions} questions • {quiz.completed ? '✓ Completed' : 'Not started'}
                  </Text>
                  {quiz.completed && quiz.score !== null && (
                    <Text style={[styles.quizMeta, { color: COLORS.success }]}>
                      Score: {quiz.score}%
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </GlassmorphicCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrepareScreen;
