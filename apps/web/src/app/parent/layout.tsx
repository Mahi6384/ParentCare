import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LanguageProvider } from '@/components/i18n/LanguageProvider'
import { getLang } from '@/lib/i18n/server'

// This layout protects ALL /parent/* routes.

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'parent') redirect('/auth/login')

  // Read the language cookie on the server so the whole parent tree renders
  // in the chosen language from the first paint, then hand the same value to
  // the client provider so hydration agrees.
  const lang = await getLang()

  return <LanguageProvider initialLang={lang}>{children}</LanguageProvider>
}
