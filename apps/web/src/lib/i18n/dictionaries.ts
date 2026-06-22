/*
  The translation dictionary — one object per language.

  Design:
  - `en` is the source of truth. Its shape defines the Dict type.
  - `hi` is typed as `typeof en`, so TypeScript FORCES it to contain every
    key `en` has, with matching value types. Forget a translation and the
    build fails loudly — no silent missing strings.
  - Dynamic strings (needing a name, a count) are stored as functions, so
    interpolation stays type-checked too.

  Keys are grouped by screen/namespace. New screens add a new namespace.
*/

const en = {
  nav: {
    today: 'Today',
    history: 'History',
    profile: 'Profile',
  },
  profile: {
    title: 'Profile',
    appearance: 'Appearance',
    language: 'Language',
    logout: 'Log out',
  },
  theme: {
    light: 'Light',
    dark: 'Dark',
  },
  lang: {
    english: 'English',
    hindi: 'हिन्दी',
  },
}

const hi: typeof en = {
  nav: {
    today: 'आज',
    history: 'इतिहास',
    profile: 'प्रोफ़ाइल',
  },
  profile: {
    title: 'प्रोफ़ाइल',
    appearance: 'रूप-रंग',
    language: 'भाषा',
    logout: 'लॉग आउट',
  },
  theme: {
    light: 'लाइट',
    dark: 'डार्क',
  },
  lang: {
    english: 'English',
    hindi: 'हिन्दी',
  },
}

export type Dict = typeof en

export const dictionaries: Record<'en' | 'hi', Dict> = { en, hi }
