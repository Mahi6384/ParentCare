/*
  i18n config — language identity + how we persist the choice.

  Why a cookie (not localStorage)?
  Parent screens are Server Components: their text is rendered on the server.
  The server can read cookies (they ride along with every request) but CANNOT
  read localStorage (browser-only). Storing language in a cookie lets the server
  render the right language on the first paint — no flash, no hydration mismatch.
*/

export type Lang = 'en' | 'hi'

// Cookie name. Server reads it via next/headers cookies(); client writes it.
export const LANG_COOKIE = 'pc-lang'

export const DEFAULT_LANG: Lang = 'en'

// Narrowing guard: turns an unknown string (e.g. a raw cookie value) into a Lang.
export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'hi'
}
