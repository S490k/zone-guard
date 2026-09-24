import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';
import { rtlText } from '../i18n/rtl';
import { useLanguage } from '@context/LanguageContext';
import { LanguageSwitch } from '@components/LanguageSwitch';

interface DashboardHeaderProps {
  /** Zones the user is currently inside — surfaced as the bell badge. */
  activeAlertCount: number;
}

/** Local hour decides the greeting; nothing here depends on the device locale. */
function greetingKey(hour: number): string {
  if (hour < 12) return 'home.greetingMorning';
  if (hour < 17) return 'home.greetingAfternoon';
  return 'home.greetingEvening';
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ activeAlertCount }) => {
  const { t, isRTL } = useLanguage();
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();

  const hasAlerts = activeAlertCount > 0;

  const styles = StyleSheet.create({
    container: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xl,
    },
    textColumn: {
      flex: 1,
      // Keeps the greeting clear of the controls on a narrow screen.
      marginRight: isRTL ? 0 : theme.spacing.md,
      marginLeft: isRTL ? theme.spacing.md : 0,
    },
    greeting: {
      color: COLORS.textPrimary,
      fontSize: theme.fontSize.xxxl,
      fontWeight: 'bold',
      marginBottom: theme.spacing.xs,
      ...rtlText(isRTL),
    },
    subtitle: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.base,
      ...rtlText(isRTL),
    },
    controls: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    bell: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: 4,
      right: 2,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: COLORS.alertCritical,
      alignItems: 'center',
      justifyContent: 'center',
      // Separates the badge from the icon beneath it.
      borderWidth: 2,
      borderColor: COLORS.background,
    },
    badgeText: {
      color: COLORS.textOnAccent,
      fontSize: 10,
      fontWeight: '700',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.textColumn}>
        <Text style={styles.greeting}>{t(greetingKey(new Date().getHours()))}</Text>
        <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
      </View>

      <View style={styles.controls}>
        <LanguageSwitch />

        <TouchableOpacity
          style={styles.bell}
          onPress={() => navigation.navigate('Alerts')}
          accessibilityRole="button"
          accessibilityLabel={
            hasAlerts
              ? t('home.bellWithAlerts', { count: activeAlertCount })
              : t('home.bellNoAlerts')
          }
        >
          <Ionicons
            name={hasAlerts ? 'notifications' : 'notifications-outline'}
            size={24}
            color={hasAlerts ? COLORS.alertCritical : COLORS.textSecondary}
          />
          {hasAlerts && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeAlertCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DashboardHeader;
