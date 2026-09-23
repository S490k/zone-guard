import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';
import { QuizQuestion } from '@constants/preparedness';
import { useProgress } from '@context/ProgressContext';
import { useLanguage } from '@context/LanguageContext';

interface QuizRunnerProps {
  topic: string;
  questions: QuizQuestion[];
  onClose: () => void;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({ topic, questions, onClose }) => {
  const { recordQuizAnswer } = useProgress();
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const questionShownAt = useRef(Date.now());

  const question = questions[index];
  const isAnswered = selected !== null;
  const isCorrect = isAnswered && selected === question?.correctIndex;

  const handleSelect = (optionIndex: number) => {
    if (isAnswered) return;

    const secondsTaken = (Date.now() - questionShownAt.current) / 1000;
    const answeredCorrectly = optionIndex === question.correctIndex;

    setSelected(optionIndex);
    if (answeredCorrectly) setCorrectCount((count) => count + 1);

    // Response time feeds the SM-2 quality grade: a slow correct answer
    // schedules a sooner review than an immediate one.
    recordQuizAnswer(question.id, answeredCorrectly, secondsTaken);
  };

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex((current) => current + 1);
    setSelected(null);
    questionShownAt.current = Date.now();
  };

  const optionColor = (optionIndex: number) => {
    if (!isAnswered) return COLORS.border;
    if (optionIndex === question.correctIndex) return COLORS.success;
    if (optionIndex === selected) return COLORS.alertCritical;
    return COLORS.border;
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.background },
        content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
        topic: { color: COLORS.accent, fontSize: theme.fontSize.sm, fontWeight: '600', marginBottom: theme.spacing.xs },
        counter: { color: COLORS.textSecondary, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.lg },
        question: { color: COLORS.textPrimary, fontSize: theme.fontSize.xl, fontWeight: 'bold', marginBottom: theme.spacing.xl },
        option: {
          borderWidth: 2,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.md,
          minHeight: 44,
          justifyContent: 'center',
        },
        optionText: { color: COLORS.textPrimary, fontSize: theme.fontSize.base },
        explanation: {
          color: COLORS.textSecondary,
          fontSize: theme.fontSize.sm,
          lineHeight: 20,
          marginTop: theme.spacing.md,
          marginBottom: theme.spacing.lg,
        },
        verdict: { fontSize: theme.fontSize.md, fontWeight: 'bold', marginTop: theme.spacing.md },
        button: {
          backgroundColor: COLORS.accent,
          borderRadius: theme.borderRadius.lg,
          paddingVertical: theme.spacing.md,
          alignItems: 'center',
          minHeight: 44,
          justifyContent: 'center',
        },
        buttonText: { color: COLORS.background, fontSize: theme.fontSize.md, fontWeight: '600' },
        secondaryButton: {
          borderColor: COLORS.border,
          borderWidth: 1,
          borderRadius: theme.borderRadius.lg,
          paddingVertical: theme.spacing.md,
          alignItems: 'center',
          marginTop: theme.spacing.md,
          minHeight: 44,
          justifyContent: 'center',
        },
        secondaryText: { color: COLORS.textSecondary, fontSize: theme.fontSize.base },
        summaryTitle: { color: COLORS.textPrimary, fontSize: theme.fontSize.xxxl, fontWeight: 'bold', marginBottom: theme.spacing.md },
        summaryBody: { color: COLORS.textSecondary, fontSize: theme.fontSize.base, lineHeight: 22, marginBottom: theme.spacing.xl },
      }),
    []
  );

  if (finished || !question) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.summaryTitle}>{correctCount} / {questions.length}</Text>
        <Text style={styles.summaryBody}>
          {correctCount === questions.length
            ? 'Full marks. These questions will return on a longer interval.'
            : 'Questions you found difficult will come back sooner, so the review schedule adapts to what you actually struggle with.'}
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Finish quiz and return"
        >
          <Text style={styles.buttonText}>{t('quiz.done')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.topic}>{topic}</Text>
      <Text style={styles.counter}>
        {t('quiz.questionOf', { current: index + 1, total: questions.length })}
      </Text>
      <Text style={styles.question}>{question.question}</Text>

      {question.options.map((option, optionIndex) => (
        <TouchableOpacity
          key={option}
          style={[styles.option, { borderColor: optionColor(optionIndex) }]}
          onPress={() => handleSelect(optionIndex)}
          disabled={isAnswered}
          accessibilityRole="button"
          accessibilityLabel={option}
          accessibilityState={{ disabled: isAnswered, selected: selected === optionIndex }}
        >
          <Text style={styles.optionText}>{option}</Text>
        </TouchableOpacity>
      ))}

      {isAnswered && (
        <>
          <Text
            style={[styles.verdict, { color: isCorrect ? COLORS.success : COLORS.alertCritical }]}
            accessibilityLiveRegion="polite"
          >
            {isCorrect ? t('quiz.correct') : t('quiz.incorrect')}
          </Text>
          <Text style={styles.explanation}>{question.explanation}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel={index + 1 >= questions.length ? 'See results' : 'Next question'}
          >
            <Text style={styles.buttonText}>
              {index + 1 >= questions.length ? t('quiz.seeResults') : t('quiz.next')}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Exit quiz"
      >
        <Text style={styles.secondaryText}>{t('quiz.exit')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default QuizRunner;
