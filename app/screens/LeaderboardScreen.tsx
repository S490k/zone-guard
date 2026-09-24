import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';
import { rtlText } from '../i18n/rtl';
import { GlassmorphicCard } from '@components/GlassmorphicCard';
import { useLanguage } from '@context/LanguageContext';
import { useProgress } from '@context/ProgressContext';
import { useAuth } from '@hooks/useAuth';
import { fetchTopScores, LeaderboardEntry, LEADERBOARD_SIZE } from '@utils/leaderboard';
import { BadgeGrid } from '@components/BadgeGrid';
import { evaluateBadges, earnedCount, tierForScore } from '@utils/achievements';
import {
  PREPAREDNESS_TASKS,
  EMERGENCY_KIT_ITEMS,
  QUIZ_QUESTIONS,
  QUIZ_TOPICS,
} from '@constants/preparedness';

export const LeaderboardScreen: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const { score, progress } = useProgress();

  const badges = evaluateBadges(progress, {
    taskCount: PREPAREDNESS_TASKS.length,
    kitCount: EMERGENCY_KIT_ITEMS.length,
    questionCount: QUIZ_QUESTIONS.length,
    topicCount: QUIZ_TOPICS.length,
  });
  const { user } = useAuth();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    const top = await fetchTopScores(user?.uid);
    setEntries(top);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load, score.total]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  const userInTop = entries.some((entry) => entry.isCurrentUser);
  const tier = tierForScore(score.total);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
    header: { marginBottom: theme.spacing.xl },
    title: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.xxxl,
      fontWeight: 'bold',
      marginBottom: theme.spacing.sm,
      ...rtlText(isRTL),
    },
    subtitle: { color: COLORS.textSecondary, fontSize: theme.fontSize.base, ...rtlText(isRTL) },
    badgesSection: { marginBottom: theme.spacing.xl },
    tierPill: {
      alignSelf: isRTL ? 'flex-end' : 'flex-start',
      borderWidth: 1.5,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
      marginTop: theme.spacing.md,
    },
    tierText: { fontSize: theme.fontSize.sm, fontWeight: '700' },
    sectionTitle: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.lg,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
      ...rtlText(isRTL),
    },
    row: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderLight,
      minHeight: 44,
    },
    rank: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.md,
      fontWeight: 'bold',
      width: 36,
      textAlign: isRTL ? 'right' : 'left',
    },
    handle: { flex: 1, color: COLORS.textPrimary, fontSize: theme.fontSize.base, ...rtlText(isRTL) },
    currentUser: { color: COLORS.accent, fontWeight: 'bold' },
    score: {
      color: COLORS.success,
      fontSize: theme.fontSize.md,
      fontWeight: 'bold',
      minWidth: 44,
      textAlign: isRTL ? 'left' : 'right',
    },
    empty: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.base,
      textAlign: 'center',
      paddingVertical: theme.spacing.xl,
      ...rtlText(isRTL),
    },
    ownStanding: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
      marginTop: theme.spacing.lg,
      ...rtlText(isRTL),
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('leaderboard.title')}</Text>
          <Text style={styles.subtitle}>{t('leaderboard.subtitle')}</Text>

          {/* Gives the bare score a name, which a number alone does not carry. */}
          <View
            style={[styles.tierPill, { borderColor: tier.colour }]}
            accessible
            accessibilityLabel={t('leaderboard.tierLabel', {
              tier: t(`content.tiers.${tier.id}`),
              score: score.total,
            })}
          >
            <Text style={[styles.tierText, { color: tier.colour }]}>
              {t(`content.tiers.${tier.id}`)} · {score.total}
            </Text>
          </View>
        </View>

        <View style={styles.badgesSection}>
          <Text style={styles.sectionTitle}>{t('leaderboard.badgesTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('leaderboard.badgesEarned', {
              earned: earnedCount(badges),
              total: badges.length,
            })}
          </Text>
          <GlassmorphicCard style={{ marginTop: theme.spacing.md }}>
            <BadgeGrid badges={badges} />
          </GlassmorphicCard>
        </View>

        <GlassmorphicCard>
          {isLoading ? (
            <Text style={styles.empty}>{t('leaderboard.loading')}</Text>
          ) : entries.length === 0 ? (
            <Text style={styles.empty}>{t('leaderboard.empty')}</Text>
          ) : (
            entries.map((entry) => (
              <View
                key={entry.uid}
                style={styles.row}
                accessible
                accessibilityLabel={t('leaderboard.rowLabel', {
                  rank: entry.rank,
                  handle: entry.isCurrentUser ? t('leaderboard.you') : entry.handle,
                  score: entry.score,
                })}
              >
                <Text style={styles.rank}>{entry.rank}</Text>
                <Text style={[styles.handle, entry.isCurrentUser && styles.currentUser]}>
                  {entry.isCurrentUser ? t('leaderboard.you') : entry.handle}
                </Text>
                <Text style={styles.score}>{entry.score}</Text>
              </View>
            ))
          )}
        </GlassmorphicCard>

        {!isLoading && !userInTop && (
          <Text style={styles.ownStanding}>
            {t('leaderboard.yourScore', { score: score.total })}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default LeaderboardScreen;
