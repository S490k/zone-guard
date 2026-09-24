import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '@constants/colors';
import theme from '@theme/colors';
import { useLanguage } from '@context/LanguageContext';
import { SUPPORTED_LOCALES, SupportedLocale } from '../i18n/translations';

/** Short forms for the header. Urdu keeps its own script rather than "UR". */
const SHORT_LABEL: Record<SupportedLocale, string> = {
  en: 'ENG',
  ur: 'اردو',
};

/**
 * Compact locale switch for the dashboard header — a pair of segments rather
 * than the full-width control used in a settings list, so it sits beside the
 * greeting without competing with it.
 */
export const LanguageSwitch: React.FC = () => {
  const { locale, setLocale, t } = useLanguage();

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: theme.borderRadius.md,
      backgroundColor: COLORS.surface,
      overflow: 'hidden',
      // The row is the 44pt target; each segment is narrower on its own.
      minHeight: 34,
    },
    segment: {
      minWidth: 44,
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
      justifyContent: 'center',
      minHeight: 34,
    },
    divider: {
      width: 1,
      alignSelf: 'stretch',
      backgroundColor: COLORS.border,
    },
    label: {
      fontWeight: '700',
      color: COLORS.textTertiary,
    },
    /**
     * Nastaliq renders smaller than Latin at the same point size, so ENG and
     * اردو look mismatched when set identically. The Urdu label takes a larger
     * size and line height to read as an equal-weight sibling.
     */
    latinLabel: {
      fontSize: theme.fontSize.xs,
    },
    urduLabel: {
      fontSize: theme.fontSize.base,
      lineHeight: theme.fontSize.base + 6,
    },
    activeLabel: {
      color: COLORS.accent,
    },
  });

  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {SUPPORTED_LOCALES.map((option, index) => {
        const isActive = option === locale;
        return (
          <React.Fragment key={option}>
            {index > 0 && <View style={styles.divider} />}
            <TouchableOpacity
              style={styles.segment}
              onPress={() => setLocale(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={t('common.switchTo', { language: SHORT_LABEL[option] })}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text
                style={[
                  styles.label,
                  option === 'ur' ? styles.urduLabel : styles.latinLabel,
                  isActive && styles.activeLabel,
                ]}
              >
                {SHORT_LABEL[option]}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
};

export default LanguageSwitch;
