import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';
import { useLanguage } from '@context/LanguageContext';

const { width } = Dimensions.get('window');

interface OnboardingStep {
  title: string;
  description: string;
  emoji: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to ZoneGuard',
    description:
      'Your personal disaster preparedness companion for Pakistan. Stay safe, stay prepared.',
    emoji: '🛡️',
  },
  {
    title: 'Real-time Alerts',
    description:
      'Receive instant notifications when you enter disaster-prone zones. Get updates on earthquakes, floods, and extreme weather.',
    emoji: '🚨',
  },
  {
    title: 'Prepare & Learn',
    description:
      'Build your emergency kit, learn safety procedures, and test your knowledge with interactive quizzes.',
    emoji: '📚',
  },
  {
    title: 'Track Progress',
    description:
      'Monitor your preparedness score and see how well your household is ready for emergencies.',
    emoji: '📊',
  },
];

interface OnboardingScreenProps {
  onComplete?: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const { t } = useLanguage();

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      scrollViewRef.current?.scrollTo({
        x: nextStep * width,
        animated: true,
      });
    } else {
      onComplete?.();
    }
  };

  const handleSkip = () => {
    onComplete?.();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    scrollView: {
      flex: 1,
    },
    slide: {
      width: width,
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    emoji: {
      fontSize: 80,
      marginBottom: theme.spacing.xl,
    },
    title: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.xxxl,
      fontWeight: 'bold',
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    description: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.base,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: theme.spacing.xl,
    },
    footer: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    skipButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      minHeight: 44,
      minWidth: 44,
      justifyContent: 'center',
    },
    skipText: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.base,
    },
    nextButton: {
      backgroundColor: COLORS.accent,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      minHeight: 44,
      justifyContent: 'center',
    },
    nextButtonText: {
      color: COLORS.textOnAccent,
      fontSize: theme.fontSize.md,
      fontWeight: '600',
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xl,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.border,
    },
    activeDot: {
      backgroundColor: COLORS.accent,
      width: 24,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        scrollIndicatorInsets={{ top: 1 }}
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        // Without this the dots and the button label only tracked the Next
        // button, so swiping by hand left them showing the wrong slide.
        onMomentumScrollEnd={(event) => {
          setCurrentStep(Math.round(event.nativeEvent.contentOffset.x / width));
        }}
      >
        {ONBOARDING_STEPS.map((step, index) => (
          <View
            key={step.title}
            style={styles.slide}
            accessible
            accessibilityLabel={`Step ${index + 1} of ${ONBOARDING_STEPS.length}. ${step.title}. ${step.description}`}
          >
            <Text style={styles.emoji} importantForAccessibility="no">
              {step.emoji}
            </Text>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.description}>{step.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip the introduction"
        >
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>

        {/* Dots */}
        <View
          style={styles.dots}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${currentStep + 1} of ${ONBOARDING_STEPS.length}`}
        >
          {ONBOARDING_STEPS.map((step, index) => (
            <View
              key={step.title}
              style={[styles.dot, index === currentStep && styles.activeDot]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={
            currentStep === ONBOARDING_STEPS.length - 1
              ? 'Get started and finish the introduction'
              : 'Next step'
          }
        >
          <Text style={styles.nextButtonText}>
            {currentStep === ONBOARDING_STEPS.length - 1
              ? t('onboarding.getStarted')
              : t('onboarding.next')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;
