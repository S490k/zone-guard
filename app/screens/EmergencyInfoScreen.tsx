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
import { useLanguage } from '@context/LanguageContext';
import { LanguageToggle } from '@components/LanguageToggle';
import { EMERGENCY_KIT_ITEMS } from '@constants/preparedness';
import { rtlText } from '../i18n/rtl';

const GUIDE_IDS = ['earthquake', 'flood', 'heat', 'general'] as const;

export const EmergencyInfoScreen: React.FC = () => {
  const { isKitItemComplete, toggleKitItem } = useProgress();
  const { t, tList, isRTL } = useLanguage();

  const completedItems = EMERGENCY_KIT_ITEMS.filter((item) =>
    isKitItemComplete(item.id)
  ).length;
  const completionPercentage = Math.round(
    (completedItems / EMERGENCY_KIT_ITEMS.length) * 100
  );

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
      ...rtlText(isRTL),
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
      ...rtlText(isRTL),
    },
    tipsList: {
      gap: theme.spacing.sm,
    },
    tipText: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
      paddingLeft: theme.spacing.md,
      lineHeight: 20,
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
          <Text style={styles.title}>{t('emergency.title')}</Text>
          <Text style={styles.subtitle}>{t('emergency.subtitle')}</Text>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <GlassmorphicCard>
            <LanguageToggle />
          </GlassmorphicCard>
        </View>

        {/* Household Emergency Kit Audit */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('emergency.kitTitle')}</Text>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {t('emergency.completion', {
                done: completedItems,
                total: EMERGENCY_KIT_ITEMS.length,
                percent: completionPercentage,
              })}
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
                  task={{
                    id: item.id,
                    priority: item.priority,
                    title: t(`content.kit.${item.id}.title`),
                    description: t(`content.kit.${item.id}.description`),
                    completed: isKitItemComplete(item.id),
                  }}
                  onToggle={toggleKitItem}
                  isRTL={isRTL}
                />
              ))}
            </View>
          </GlassmorphicCard>
        </View>

        {/* Emergency Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('emergency.guideTitle')}</Text>
          <GlassmorphicCard>
            <View>
              {GUIDE_IDS.map((guideId) => (
                <View key={guideId} style={styles.resourceCard}>
                  <Text style={styles.resourceTitle}>
                    {t(`content.guides.${guideId}.title`)}
                  </Text>
                  <View style={styles.tipsList}>
                    {tList(`content.guides.${guideId}.tips`).map((tip) => (
                      <Text key={tip} style={styles.tipText}>
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
