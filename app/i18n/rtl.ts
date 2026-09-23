import { TextStyle } from 'react-native';

/**
 * Text-level direction for right-to-left languages.
 *
 * Applied per text style rather than through `I18nManager.forceRTL`, which
 * mirrors the whole layout tree — reordering the tab bar and every icon row —
 * and only takes effect after an app restart. Scoping it here keeps navigation
 * and controls where the user expects them, and makes the switch immediate.
 */
export function rtlText(isRTL: boolean): TextStyle {
  return isRTL ? { textAlign: 'right', writingDirection: 'rtl' } : {};
}
