import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';
import { GlassmorphicCard } from '@components/GlassmorphicCard';
import { TaskCard } from '@components/TaskCard';
import { QuizRunner } from '@components/QuizRunner';
import { useProgress } from '@context/ProgressContext';
import { PREPAREDNESS_TASKS, QUIZ_QUESTIONS, QUIZ_TOPICS } from '@constants/preparedness';
import { MASTERY_REPETITIONS } from '@utils/preparednessScore';

export const PrepareScreen: React.FC = () => {
  const { progress, isTaskComplete, toggleTask } = useProgress();
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const completedTasks = PREPAREDNESS_TASKS.filter((task) => isTaskComplete(task.id)).length;

  const topicSummaries = QUIZ_TOPICS.map((topic) => {
    const questions = QUIZ_QUESTIONS.filter((question) => question.topic === topic);
    const mastered = questions.filter(
      (question) => (progress.quizStates[question.id]?.repetitions ?? 0) >= MASTERY_REPETITIONS
    ).length;

    // The soonest scheduled review across the topic's questions.
    const dueDates = questions
      .map((question) => progress.quizStates[question.id]?.nextReviewDate)
      .filter((date): date is string => Boolean(date))
      .sort();

    return { topic, questions, mastered, nextReview: dueDates[0] };
  });

  const completedQuizzes = topicSummaries.filter(
    (summary) => summary.mastered === summary.questions.length
  ).length;

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
            {completedTasks} of {PREPAREDNESS_TASKS.length} completed
          </Text>
          <GlassmorphicCard>
            <View style={styles.tasksList}>
              {PREPAREDNESS_TASKS.map((task) => (
                <TaskCard
                  key={task.id}
                  task={{ ...task, completed: isTaskComplete(task.id) }}
                  onToggle={toggleTask}
                />
              ))}
            </View>
          </GlassmorphicCard>
        </View>

        {/* Quizzes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Knowledge Quizzes</Text>
          <Text style={styles.progressText}>
            {completedQuizzes} of {topicSummaries.length} mastered
          </Text>
          <GlassmorphicCard>
            <View style={styles.quizGrid}>
              {topicSummaries.map(({ topic, questions, mastered, nextReview }) => {
                const isMastered = mastered === questions.length;
                return (
                  <TouchableOpacity
                    key={topic}
                    style={[
                      styles.quizCard,
                      { borderLeftColor: isMastered ? COLORS.success : COLORS.accent },
                    ]}
                    onPress={() => setActiveTopic(topic)}
                    accessibilityRole="button"
                    accessibilityLabel={`${topic} quiz, ${mastered} of ${questions.length} mastered`}
                  >
                    <Text style={styles.quizTitle}>{topic}</Text>
                    <Text style={styles.quizMeta}>
                      {questions.length} questions • {mastered}/{questions.length} mastered
                    </Text>
                    {nextReview && (
                      <Text style={styles.quizMeta}>
                        Next review {new Date(nextReview).toLocaleDateString()}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassmorphicCard>
        </View>
      </ScrollView>

      <Modal
        visible={activeTopic !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveTopic(null)}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          {activeTopic && (
            <QuizRunner
              topic={activeTopic}
              questions={QUIZ_QUESTIONS.filter((question) => question.topic === activeTopic)}
              onClose={() => setActiveTopic(null)}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default PrepareScreen;
