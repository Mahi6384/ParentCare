'use client'

/*
  ThemeProvider — owns the dark/light state for the whole app.

  Why a Context (not just a hook)?
  The toggle UI lives in Profile, but the *value* (which theme is active)
  may be read elsewhere later (e.g. an icon that flips). Context lets any
  descendant call useTheme() without prop-drilling.

  The class on <html> is the real source of truth for styling; React state
  here is just a mirror so the UI (e.g. the toggle's active segment) re-renders.
*/

import { createContext, useContext, useEffect, useState } from 'react'
import { THEME_STORAGE_KEY, type Theme } from '@/lib/theme'

interface ThemeContextValue {
  theme: Theme
  setTheme: (next: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start as 'light' to match the server-rendered HTML (which has no class).
  // The real value is read from the DOM in the effect below, after hydration.
  const [theme, setThemeState] = useState<Theme>('light')

  // On mount, sync React state to whatever the inline no-flash script applied.
  // This runs once and corrects 'light' -> 'dark' for dark-mode users with
  // zero visible flash (the DOM was already dark; only our state catches up).
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setThemeState(isDark ? 'dark' : 'light')
  }, [])

  function setTheme(next: Theme) {
    setThemeState(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // private-mode Safari etc. — persistence fails silently, UI still works
    }
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
