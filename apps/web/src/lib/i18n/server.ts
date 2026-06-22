/*
  Server-side i18n access.

  Server Components call `getDict()` to get the dictionary for the language
  stored in the request cookie. Because this reads the cookie on the server,
  the very first HTML the user receives is already in their chosen language.
*/

import { cookies } from 'next/headers'
import { LANG_COOKIE, DEFAULT_LANG, isLang, type Lang } from './config'
import { dictionaries, type Dict } from './dictionaries'

// Read + validate the language cookie. Falls back to the default if absent/garbage.
export async function getLang(): Promise<Lang> {
  const store = await cookies()
  const raw = store.get(LANG_COOKIE)?.value
  return isLang(raw) ? raw : DEFAULT_LANG
}

// The dictionary for the current request's language.
export async function getDict(): Promise<Dict> {
  return dictionaries[await getLang()]
}
