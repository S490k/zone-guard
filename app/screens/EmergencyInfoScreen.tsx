import React, { useState } from 'react';
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

export const EmergencyInfoScreen: React.FC = () => {
  const [kitItems, setKitItems] = useState<Task[]>([
    {
      id: 'kit-1',
      title: 'Water',
      description: '3-day supply (1 gallon per person per day)',
      completed: false,
      priority: 'high',
    },
    {
      id: 'kit-2',
      title: 'Non-perishable Food',
      description: '3-day supply (high-calorie items)',
      completed: false,
      priority: 'high',
    },
    {
      id: 'kit-3',
      title: 'First Aid Kit',
      description: 'Bandages, medications, antiseptic',
      completed: false,
      priority: 'high',
    },
    {
      id: 'kit-4',
      title: 'Flashlight & Batteries',
      description: 'Extra batteries included',
      completed: false,
      priority: 'high',
    },
    {
      id: 'kit-5',
      title: 'Radio (Battery/Hand-crank)',
      description: 'For emergency broadcasts',
      completed: false,
      priority: 'medium',
    },
    {
      id: 'kit-6',
      title: 'Medications & Glasses',
      description: '7-day supply of prescription medications',
      completed: false,
      priority: 'high',
    },
    {
      id: 'kit-7',
      title: 'Documents & Cash',
      description: 'ID, insurance, cash in waterproof bag',
      completed: false,
      priority: 'high',
    },
    {
      id: 'kit-8',
      title: 'Personal Hygiene Items',
      description: 'Toiletries, feminine products, diapers',
      completed: false,
      priority: 'medium',
    },
    {
      id: 'kit-9',
      title: 'Phone Charger & Power Bank',
      description: 'Multiple charging options',
      completed: false,
      priority: 'medium',
    },
    {
      id: 'kit-10',
      title: 'Emergency Contact Card',
      description: 'Written copy of important numbers',
      completed: false,
      priority: 'medium',
    },
  ]);

  const handleItemToggle = (itemId: string) => {
    setKitItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const completedItems = kitItems.filter((i) => i.completed).length;
  const completionPercentage = Math.round((completedItems / kitItems.length) * 100);

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
              Completion: {completedItems}/{kitItems.length} ({completionPercentage}%)
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
              {kitItems.map((item) => (
                <TaskCard
                  key={item.id}
                  task={item}
                  onToggle={handleItemToggle}
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
