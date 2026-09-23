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
import { useLanguage } from '@context/LanguageContext';
import { PREPAREDNESS_TASKS, QUIZ_QUESTIONS, QUIZ_TOPICS, QuizTopicId } from '@constants/preparedness';
import { rtlText } from '../i18n/rtl';
import { MASTERY_REPETITIONS } from '@utils/preparednessScore';

export const PrepareScreen: React.FC = () => {
  const { progress, isTaskComplete, toggleTask } = useProgress();
  const { t, isRTL } = useLanguage();
  const [activeTopic, setActiveTopic] = useState<QuizTopicId | null>(null);

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
    progressText: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
      marginBottom: theme.spacing.md,
      ...rtlText(isRTL),
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
      minHeight: 44,
      justifyContent: 'center',
    },
    quizTitle: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.md,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
      ...rtlText(isRTL),
    },
    quizMeta: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
      ...rtlText(isRTL),
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
          <Text style={styles.title}>{t('prepare.title')}</Text>
          <Text style={styles.subtitle}>{t('prepare.subtitle')}</Text>
        </View>

        {/* Tasks Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('prepare.tasksTitle')}</Text>
          <Text style={styles.progressText}>
            {t('prepare.tasksProgress', {
              done: completedTasks,
              total: PREPAREDNESS_TASKS.length,
            })}
          </Text>
          <GlassmorphicCard>
            <View style={styles.tasksList}>
              {PREPAREDNESS_TASKS.map((task) => (
                <TaskCard
                  key={task.id}
                  task={{
                    id: task.id,
                    priority: task.priority,
                    title: t(`content.tasks.${task.id}.title`),
                    description: t(`content.tasks.${task.id}.description`),
                    completed: isTaskComplete(task.id),
                  }}
                  onToggle={toggleTask}
                  isRTL={isRTL}
                />
              ))}
            </View>
          </GlassmorphicCard>
        </View>

        {/* Quizzes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('prepare.quizzesTitle')}</Text>
          <Text style={styles.progressText}>
            {t('prepare.quizProgress', {
              done: completedQuizzes,
              total: topicSummaries.length,
            })}
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
                    accessibilityLabel={`${t(`content.topics.${topic}`)}, ${mastered}/${questions.length}`}
                  >
                    <Text style={styles.quizTitle}>{t(`content.topics.${topic}`)}</Text>
                    <Text style={styles.quizMeta}>
                      {t('prepare.questionsMastered', {
                        done: mastered,
                        total: questions.length,
                      })}
                    </Text>
                    {nextReview && (
                      <Text style={styles.quizMeta}>
                        {t('prepare.nextReview', {
                          date: new Date(nextReview).toLocaleDateString(),
                        })}
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
