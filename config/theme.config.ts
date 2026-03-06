/**
 * Theme configuration.
 * Change accent color here — it propagates to all components via CSS variables.
 * In the future this can be wired to a user settings panel.
 */

export const themeConfig = {
  // HSL values for the accent color
  // These map to --primary CSS variable in globals.css
  accent: {
    hsl: '0 0% 45%',
    hslDark: '0 0% 75%',
    name: 'grey',
  },

  // Default theme on first load
  defaultTheme: 'light' as 'light' | 'dark' | 'system',

  // Border radius scale
  radius: '0.5rem',

  // File/folder icon colors
  fileIconColors: {
    folder:          'text-primary',
    'folder-filled': 'text-primary',
    pdf:             'text-primary',
    image:           'text-primary',
    video:           'text-primary',
    text:            'text-primary',
    md:              'text-primary',
    other:           'text-primary',
  },
} as const
