import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';
import { rtlText } from '../i18n/rtl';
import { useLanguage } from '@context/LanguageContext';
import { SUPPORTED_LOCALES, LOCALE_NAMES } from '../i18n/translations';

export const LanguageToggle: React.FC = () => {
  const { locale, setLocale, t, isRTL } = useLanguage();

  const styles = StyleSheet.create({
    row: { flexDirection: 'row', gap: theme.spacing.sm },
    label: {
      color: COLORS.textSecondary,
      fontSize: theme.fontSize.sm,
      fontWeight: '600',
      marginBottom: theme.spacing.sm,
      ...rtlText(isRTL),
    },
    option: {
      flex: 1,
      borderWidth: 1,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    optionText: { fontSize: theme.fontSize.base, fontWeight: '600' },
  });

  return (
    <View>
      <Text style={styles.label}>{t('common.language')}</Text>
      <View style={styles.row}>
        {SUPPORTED_LOCALES.map((option) => {
          const isActive = option === locale;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.option,
                {
                  borderColor: isActive ? COLORS.accent : COLORS.border,
                  backgroundColor: isActive ? COLORS.accent : 'transparent',
                },
              ]}
              onPress={() => setLocale(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={LOCALE_NAMES[option]}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: isActive ? COLORS.textOnAccent : COLORS.textPrimary },
                ]}
              >
                {LOCALE_NAMES[option]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default LanguageToggle;
