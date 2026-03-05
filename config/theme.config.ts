/**
 * Theme configuration.
 * Change accent color here — it propagates to all components via CSS variables.
 * In the future this can be wired to a user settings panel.
 */

export const themeConfig = {
  // HSL values for the accent color (green)
  // These map to --primary CSS variable in globals.css
  accent: {
    hsl: '142 71% 45%',
    hslDark: '142 71% 45%',
    name: 'green',
  },

  // Default theme on first load
  defaultTheme: 'light' as 'light' | 'dark' | 'system',

  // Border radius scale
  radius: '0.5rem',
} as const
