/**
 * Theme configuration.
 * Change accent color here — it propagates to all components via CSS variables.
 * In the future this can be wired to a user settings panel.
 */

export const themeConfig = {
  // Accent color — maps to --primary CSS variable in globals.css
  accent: {
    hsl: "0 0% 32%",
    hslDark: "0 0% 60%",
    name: "gray",
  },

  // Default theme on first load
  defaultTheme: "light" as "light" | "dark" | "system",

  // Border radius scale
  radius: "0.5rem",
} as const;
