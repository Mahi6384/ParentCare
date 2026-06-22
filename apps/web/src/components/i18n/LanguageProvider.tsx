'use client'

/*
  LanguageProvider — owns the active language for the parent app.

  Why initialLang is a PROP (not read from cookie here):
  The server already read the cookie and rendered the page in that language.
  If the client guessed a different default, React would scream about a
  hydration mismatch. So the server hands us the value it used, and we start
  from it — guaranteeing server and client agree on render #1.

  setLang flow:
    1. write the cookie (so the NEXT server render uses the new language)
    2. router.refresh() — re-runs the Server Components, which now read the
       updated cookie and stream back HTML in the new language.
*/

import { createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { LANG_COOKIE, type Lang } from '@/lib/i18n/config'
import { dictionaries, type Dict } from '@/lib/i18n/dictionaries'

interface LanguageContextValue {
  lang: Lang
  t: Dict
  setLang: (next: Lang) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({
  initialLang,
  children,
}: {
  initialLang: Lang
  children: React.ReactNode
}) {
  const router = useRouter()

  function setLang(next: Lang) {
    // max-age ~1 year, path=/ so it applies to every route, SameSite=Lax is
    // the safe default for a same-site preference cookie.
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`
    document.documentElement.lang = next
    router.refresh()
  }

  return (
    <LanguageContext.Provider value={{ lang: initialLang, t: dictionaries[initialLang], setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

// Client components call this to read the current language + dictionary.
export function useT() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useT must be used inside <LanguageProvider>')
  return ctx
}
