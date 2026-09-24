/**
 * Light theme.
 *
 * Every pair below was measured against WCAG 2.1 AA rather than picked by eye.
 * Body text clears 4.5:1 on both the canvas and white cards; white text on a
 * solid severity surface clears 4.5:1 too, so severity cards are safe for
 * normal-size text and not only for headings.
 *
 * Note on the source mockup: its orange (#F57C00) and yellow (#F9A825) measure
 * 2.70:1 and 1.97:1 against white text — well under the threshold. The darker
 * equivalents here keep the same visual hierarchy while remaining legible.
 */
export const COLORS = {
  // Canvas and surfaces
  background: '#F5F6F8',
  backgroundAlt: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceOpaque: '#FFFFFF',
  surfaceLight: '#F9FAFB',

  // Text — 16.41:1, 6.99:1 and 4.60:1 on the canvas respectively
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textTertiary: '#667085',
  /** For text and icons sitting on a solid severity or accent surface. */
  textOnAccent: '#FFFFFF',

  /**
   * Severity, ordered by urgency. Doubles as card fills: white text on each
   * clears 4.5:1 (critical 6.54, high 5.18, medium 4.92, low 5.02).
   */
  alertCritical: '#B3261E',
  alertHigh: '#C2410C',
  alertMedium: '#A16207',
  alertLow: '#15803D',

  /** Tinted backgrounds for severity rows, where the text stays dark. */
  alertCriticalSoft: '#FEF2F2',
  alertHighSoft: '#FFF7ED',
  alertMediumSoft: '#FEFCE8',
  alertLowSoft: '#F0FDF4',

  // Semantic
  success: '#15803D',
  warning: '#A16207',
  error: '#B3261E',
  info: '#1A56DB',

  // Accent
  accent: '#1A56DB',
  accentSecondary: '#7C3AED',

  // Lines and dividers
  border: '#E5E7EB',
  borderLight: '#F1F3F5',

  disabled: '#9CA3AF',
  overlay: 'rgba(17, 24, 39, 0.45)',

  // Preparedness meter stops
  gradientGood: '#15803D',
  gradientWarning: '#A16207',
  gradientDanger: '#B3261E',
};

export default COLORS;
