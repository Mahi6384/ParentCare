'use client'

/*
  ThemeToggle — a two-segment control (Light | Dark) for the Profile screen.

  It's a client component because it reads/writes interactive state via
  useTheme(). It can still be dropped straight into a Server Component
  (Profile) — Next.js renders the server tree and hands this island to the
  browser to hydrate.
*/

import { useTheme } from '@/components/theme/ThemeProvider'
import type { Theme } from '@/lib/theme'

// Labels are props (defaulting to English) so the component stays reusable
// outside the parent app where the i18n provider isn't mounted.
export default function ThemeToggle({
  labels = { light: 'Light', dark: 'Dark' },
}: {
  labels?: { light: string; dark: string }
}) {
  const { theme, setTheme } = useTheme()

  const OPTIONS: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: labels.light, icon: '☀️' },
    { value: 'dark', label: labels.dark, icon: '🌙' },
  ]

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        background: 'var(--pc-surface2)',
        border: '0.5px solid var(--pc-hair)',
        borderRadius: 12,
      }}
    >
      {OPTIONS.map((opt) => {
        const active = theme === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 0',
              borderRadius: 9,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--pc-body)',
              fontSize: 15,
              fontWeight: 600,
              background: active ? 'var(--pc-surface)' : 'transparent',
              color: active ? 'var(--pc-ink)' : 'var(--pc-ink3)',
              boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <span style={{ fontSize: 16 }}>{opt.icon}</span>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
