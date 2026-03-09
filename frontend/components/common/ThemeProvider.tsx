'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'

/**
 * Reads theme from Zustand store and applies 'dark' class to <html>.
 * Watches system preference when theme is set to 'system'.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useUIStore()

  useEffect(() => {
    const root = document.documentElement

    function applyTheme(isDark: boolean) {
      root.classList.toggle('dark', isDark)
    }

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mq.matches)
      mq.addEventListener('change', (e) => applyTheme(e.matches))
      return () => mq.removeEventListener('change', (e) => applyTheme(e.matches))
    }

    applyTheme(theme === 'dark')
  }, [theme])

  return <>{children}</>
}
