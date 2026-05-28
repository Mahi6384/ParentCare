import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SaathiMark from '@/components/ui/SaathiMark'
import CopyInviteCode from './CopyInviteCode'

export default async function FamilyOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let { data: family } = await supabase
    .from('families')
    .select('*')
    .eq('kid_id', user.id)
    .single()

  if (!family) {
    const { data: newFamily, error } = await supabase
      .from('families')
      .insert({ kid_id: user.id })
      .select()
      .single()

    if (error || !newFamily) redirect('/auth/login?error=family_creation_failed')
    family = newFamily
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: 'var(--pc-bg)' }}
    >
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <SaathiMark size={48} />
          <h2
            className="font-serif font-medium text-2xl text-ink mt-4 mb-2"
            style={{ letterSpacing: '-0.02em' }}
          >
            Share with your parent
          </h2>
          <p className="text-ink-2 text-sm leading-relaxed">
            Send this code to your mom or dad.
            They'll use it to connect to you on ParentCare.
          </p>
        </div>

        <CopyInviteCode code={family!.invite_code} />

        <p className="text-xs text-ink-3 text-center mb-6">
          They enter this on their signup screen.
        </p>

        <Link
          href="/kid/dashboard"
          className="pc-btn w-full justify-center py-3 text-sm"
          style={{ display: 'flex' }}
        >
          Go to Dashboard →
        </Link>

      </div>
    </div>
  )
}
