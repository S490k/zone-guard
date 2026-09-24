import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, Easing, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';
import { useLanguage } from '@context/LanguageContext';
import { useAchievements } from '@context/AchievementsContext';

/** How long the toast stays before retiring itself. */
const VISIBLE_MS = 5000;
const FADE_MS = 250;

export const AchievementToast: React.FC = () => {
  const { celebrating, dismissCelebration } = useAchievements();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!celebrating) return;

    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: FADE_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    timer.current = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: FADE_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        // Only advance the queue once the exit animation has actually run;
        // bailing early would leave the next toast starting mid-fade.
        if (finished) dismissCelebration();
      });
    }, VISIBLE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [celebrating, anim, dismissCelebration]);

  if (!celebrating) return null;

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: insets.top + theme.spacing.md,
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      backgroundColor: COLORS.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: COLORS.success,
      ...theme.shadows.md,
    },
    row: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      minHeight: 44,
    },
    medallion: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: COLORS.success,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1 },
    kicker: {
      color: COLORS.success,
      fontSize: theme.fontSize.xs,
      fontWeight: '700',
      letterSpacing: 0.6,
      textAlign: isRTL ? 'right' : 'left',
    },
    title: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.md,
      fontWeight: 'bold',
      textAlign: isRTL ? 'right' : 'left',
    },
  });

  const title = t(`content.badges.${celebrating.id}.title`);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) },
          ],
        },
      ]}
      // Polite, not assertive: a celebration should never interrupt a zone warning.
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <TouchableOpacity
        style={styles.row}
        onPress={dismissCelebration}
        accessibilityRole="button"
        accessibilityLabel={t('achievements.unlockedA11y', { title })}
      >
        <View style={styles.medallion}>
          <Ionicons
            name={celebrating.icon as keyof typeof Ionicons.glyphMap}
            size={22}
            color={COLORS.textOnAccent}
          />
        </View>
        <View style={styles.body}>
          <Text style={styles.kicker}>{t('achievements.unlocked')}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default AchievementToast;
