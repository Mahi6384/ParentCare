'use client'

/*
  LanguageToggle — English | हिन्दी segmented control for the Profile screen.
  Reads the active language and the setter from the LanguageProvider context.
*/

import { useT } from '@/components/i18n/LanguageProvider'
import type { Lang } from '@/lib/i18n/config'

export default function LanguageToggle() {
  const { lang, setLang, t } = useT()

  const options: { value: Lang; label: string }[] = [
    { value: 'en', label: t.lang.english },
    { value: 'hi', label: t.lang.hindi },
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
      {options.map((opt) => {
        const active = lang === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLang(opt.value)}
            style={{
              flex: 1,
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
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
