import React from 'react';
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
import { TaskCard } from '@components/TaskCard';
import { useProgress } from '@context/ProgressContext';
import { EMERGENCY_KIT_ITEMS } from '@constants/preparedness';

export const EmergencyInfoScreen: React.FC = () => {
  const { isKitItemComplete, toggleKitItem } = useProgress();

  const completedItems = EMERGENCY_KIT_ITEMS.filter((item) =>
    isKitItemComplete(item.id)
  ).length;
  const completionPercentage = Math.round(
    (completedItems / EMERGENCY_KIT_ITEMS.length) * 100
  );

  const resources = [
    {
      title: 'Earthquake Safety',
      tips: [
        'DROP, COVER, HOLD ON at first shake',
        'Get under sturdy table or against interior wall',
        'Stay away from windows and heavy objects',
        'Do not run outside',
      ],
    },
    {
      title: 'Flood Preparedness',
      tips: [
        'Evacuate immediately if ordered',
        'Move to higher ground',
        'Do not drive through flooded areas',
        'Turn off utilities if instructed',
      ],
    },
    {
      title: 'Heat Wave Safety',
      tips: [
        'Stay hydrated - drink water constantly',
        'Stay in cool, air-conditioned places',
        'Avoid strenuous activity during peak heat',
        'Check on elderly neighbors',
      ],
    },
    {
      title: 'General Emergency Response',
      tips: [
        'Call emergency services only if necessary',
        'Listen to official broadcasts',
        'Account for all family members',
        'Help others if safe to do so',
      ],
    },
  ];

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
    progressContainer: {
      backgroundColor: COLORS.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.accent,
    },
    progressText: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.md,
      fontWeight: '600',
      marginBottom: theme.spacing.sm,
    },
    progressBar: {
      height: 8,
      backgroundColor: COLORS.border,
      borderRadius: theme.borderRadius.xs,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: COLORS.success,
    },
    resourceCard: {
      backgroundColor: COLORS.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.accent,
    },
    resourceTitle: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.md,
      fontWeight: '600',
      marginBottom: theme.spacing.md,
    },
    tipsList: {
      gap: theme.spacing.sm,
    },
    tipText: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
      paddingLeft: theme.spacing.md,
      lineHeight: 20,
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
          <Text style={styles.title}>Emergency Info</Text>
          <Text style={styles.subtitle}>Resources & preparedness guide</Text>
        </View>

        {/* Household Emergency Kit Audit */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Household Emergency Kit</Text>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Completion: {completedItems}/{EMERGENCY_KIT_ITEMS.length} ({completionPercentage}%)
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${completionPercentage}%` },
                ]}
              />
            </View>
          </View>
          <GlassmorphicCard>
            <View>
              {EMERGENCY_KIT_ITEMS.map((item) => (
                <TaskCard
                  key={item.id}
                  task={{ ...item, completed: isKitItemComplete(item.id) }}
                  onToggle={toggleKitItem}
                />
              ))}
            </View>
          </GlassmorphicCard>
        </View>

        {/* Emergency Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Response Guide</Text>
          <GlassmorphicCard>
            <View>
              {resources.map((resource, idx) => (
                <View key={idx} style={styles.resourceCard}>
                  <Text style={styles.resourceTitle}>{resource.title}</Text>
                  <View style={styles.tipsList}>
                    {resource.tips.map((tip, tipIdx) => (
                      <Text key={tipIdx} style={styles.tipText}>
                        • {tip}
                      </Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </GlassmorphicCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EmergencyInfoScreen;
