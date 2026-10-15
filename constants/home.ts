/**
 * Soft palette used by the Home screen only.
 *
 * These live outside `COLORS` so the lighter cards and softer magenta tints
 * stay scoped to Home instead of changing every screen and the tab bar.
 */
export const HOME_COLORS = {
  /** Near-white card fill that sits cleanly on the app background. */
  card: '#FFFFFF',
  /** Very light neutral used for nested rows and the tab bar. */
  cardMuted: '#FBF7F4',
  /** Pink tint behind icon tiles, pills and badges. */
  accentSoft: '#FCE7F3',
  /** Deeper magenta for accent text so it stays readable on white. */
  accentInk: '#B3128F',
  /** Hairline separator tone. */
  divider: '#ECE8E4',
  /** Soft card elevation. */
  shadowOpacity: 0.06,
} as const;