import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import * as Location from 'expo-location';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';
import { rtlText } from '../i18n/rtl';
import { SEVERITY_COLORS } from '@constants/zones';
import { useLanguage } from '@context/LanguageContext';
import { SEVERITY_LABEL_KEY } from '@components/EmergencyBanner';
import { fetchDisasterNews, relativeTime, NewsItem } from '@utils/disasterNews';

const TIME_KEY: Record<string, string> = {
  now: 'alerts.timeNow',
  minutes: 'alerts.timeMinutes',
  hours: 'alerts.timeHours',
  days: 'alerts.timeDays',
};

export const DisasterNewsFeed: React.FC<{ refreshToken?: number }> = ({ refreshToken }) => {
  const { t, isRTL } = useLanguage();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async () => {
    // Last known position rather than a live watch: this screen only needs a
    // rough distance, and a second watcher would duplicate the dashboard's.
    let latitude: number | undefined;
    let longitude: number | undefined;
    try {
      const last = await Location.getLastKnownPositionAsync();
      latitude = last?.coords.latitude;
      longitude = last?.coords.longitude;
    } catch {
      // Distance is an enhancement; the feed is still worth showing without it.
    }

    const result = await fetchDisasterNews(latitude, longitude);
    setItems(result.items);
    setFromCache(result.fromCache);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const styles = StyleSheet.create({
    subtitle: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
      marginBottom: theme.spacing.md,
      ...rtlText(isRTL),
    },
    item: {
      backgroundColor: COLORS.surface,
      borderRadius: theme.borderRadius.md,
      borderLeftWidth: 5,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      minHeight: 44,
      ...theme.shadows.sm,
    },
    severity: {
      fontSize: theme.fontSize.xs,
      fontWeight: '700',
      letterSpacing: 0.8,
      marginBottom: 2,
      ...rtlText(isRTL),
    },
    title: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.md,
      fontWeight: '600',
      marginBottom: 2,
      ...rtlText(isRTL),
    },
    summary: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
      marginBottom: theme.spacing.xs,
      ...rtlText(isRTL),
    },
    meta: {
      color: COLORS.textTertiary,
      fontSize: theme.fontSize.xs,
      ...rtlText(isRTL),
    },
    empty: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.base,
      textAlign: 'center',
      paddingVertical: theme.spacing.lg,
    },
  });

  if (isLoading) {
    return <Text style={styles.empty}>{t('alerts.newsLoading')}</Text>;
  }

  if (items.length === 0) {
    return <Text style={styles.empty}>{t('alerts.newsEmpty')}</Text>;
  }

  return (
    <View>
      <Text style={styles.subtitle}>
        {fromCache ? t('alerts.newsCached') : t('alerts.newsSubtitle')}
      </Text>

      {items.map((item) => {
        const age = relativeTime(item.publishedAt);
        const when = t(TIME_KEY[age.unit], { value: age.value });
        const distance =
          item.distanceKm !== undefined
            ? ` · ${t('alerts.newsDistance', { distance: Math.round(item.distanceKm) })}`
            : '';

        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.item, { borderLeftColor: SEVERITY_COLORS[item.severity] }]}
            onPress={() => item.url && Linking.openURL(item.url).catch(() => {})}
            disabled={!item.url}
            accessibilityRole="link"
            accessibilityLabel={`${t(SEVERITY_LABEL_KEY[item.severity])}. ${item.title}. ${when}${distance}`}
          >
            <Text style={[styles.severity, { color: SEVERITY_COLORS[item.severity] }]}>
              {t(SEVERITY_LABEL_KEY[item.severity])}
            </Text>
            <Text style={styles.title}>{item.title}</Text>
            {Boolean(item.summary) && (
              <Text style={styles.summary} numberOfLines={2}>
                {item.summary}
              </Text>
            )}
            <Text style={styles.meta}>
              {item.source.toUpperCase()} · {when}
              {distance}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default DisasterNewsFeed;
