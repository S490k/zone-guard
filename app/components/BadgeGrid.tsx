import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';
import { useLanguage } from '@context/LanguageContext';
import { BadgeState } from '@utils/achievements';

interface BadgeGridProps {
  badges: BadgeState[];
}

export const BadgeGrid: React.FC<BadgeGridProps> = ({ badges }) => {
  const { t } = useLanguage();

  const styles = StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    badge: {
      // Three per row at typical phone widths, wrapping on narrower screens.
      width: '30%',
      alignItems: 'center',
    },
    medallion: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xs,
      borderWidth: 2,
    },
    title: {
      fontSize: theme.fontSize.xs,
      fontWeight: '600',
      // Centred rather than edge-aligned: the label sits under its medallion,
      // which reads the same in both directions.
      textAlign: 'center',
    },
    progress: {
      fontSize: 10,
      color: COLORS.textTertiary,
      textAlign: 'center',
      marginTop: 1,
    },
  });

  return (
    <View style={styles.grid}>
      {badges.map((badge) => {
        const title = t(`content.badges.${badge.id}.title`);
        const description = t(`content.badges.${badge.id}.description`);
        const percent = Math.round(badge.progress * 100);

        return (
          <View
            key={badge.id}
            style={styles.badge}
            accessible
            accessibilityLabel={
              badge.earned
                ? t('leaderboard.badgeEarned', { title, description })
                : t('leaderboard.badgeLocked', { title, description, percent })
            }
          >
            <View
              style={[
                styles.medallion,
                {
                  backgroundColor: badge.earned ? COLORS.success : COLORS.surfaceLight,
                  borderColor: badge.earned ? COLORS.success : COLORS.border,
                },
              ]}
            >
              <Ionicons
                name={badge.icon as keyof typeof Ionicons.glyphMap}
                size={26}
                color={badge.earned ? COLORS.textOnAccent : COLORS.textTertiary}
              />
            </View>
            <Text
              style={[
                styles.title,
                { color: badge.earned ? COLORS.textPrimary : COLORS.textTertiary },
              ]}
            >
              {title}
            </Text>
            {/* Partial progress is more motivating than a bare lock. */}
            {!badge.earned && percent > 0 && (
              <Text style={styles.progress}>{percent}%</Text>
            )}
          </View>
        );
      })}
    </View>
  );
};

export default BadgeGrid;
