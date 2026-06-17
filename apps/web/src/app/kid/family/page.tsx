import { createClient } from '@/lib/supabase/server'
import KidNavBar from '@/components/kid/KidNavBar'
import CopyInviteCode from '@/app/onboarding/family/CopyInviteCode'

export default async function KidFamilyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: family }] = await Promise.all([
    supabase.from('users').select('name').eq('id', user!.id).single(),
    supabase.from('families').select('invite_code, parent_id').eq('kid_id', user!.id).single(),
  ])

  const parentLinked = !!family?.parent_id

  return (
    <div style={{ background: 'var(--pc-bg)', minHeight: '100vh', color: 'var(--pc-ink)', fontFamily: 'var(--pc-body)' }}>
      <KidNavBar activeTab="family" userName={profile?.name ?? ''} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 40px' }}>
        <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 8 }}>
          Family
        </h1>
        <p style={{ color: 'var(--pc-ink2)', fontSize: 16, marginBottom: 32 }}>
          {parentLinked
            ? 'Your parent is connected. They receive tasks and Saathi monitors their progress.'
            : 'Share your invite code with your parent so they can join and start their health journey.'}
        </p>

        {/* Connection status */}
        <div
          style={{
            padding: 24, borderRadius: 16,
            border: '0.5px solid var(--pc-hair)', background: 'var(--pc-surface)',
            display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: parentLinked ? 'var(--pc-ok-tint, #dcfce7)' : 'var(--pc-surface2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            }}
          >
            {parentLinked ? '✓' : '👤'}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {parentLinked ? 'Parent connected' : 'No parent connected yet'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--pc-ink2)', marginTop: 2 }}>
              {parentLinked
                ? 'Tasks you create are sent directly to their dashboard.'
                : 'Ask your parent to sign up and enter your invite code.'}
            </div>
          </div>
          <div
            style={{
              marginLeft: 'auto', width: 10, height: 10, borderRadius: '50%',
              background: parentLinked ? 'var(--pc-ok)' : 'var(--pc-ink4)',
            }}
          />
        </div>

        {/* Invite code */}
        {!parentLinked && family?.invite_code && (
          <div
            style={{
              padding: 24, borderRadius: 16,
              border: '0.5px solid var(--pc-hair)', background: 'var(--pc-surface)',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pc-ink2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Your invite code
            </div>
            <CopyInviteCode code={family.invite_code} />
            <p style={{ fontSize: 13, color: 'var(--pc-ink3)', marginTop: 12 }}>
              Share this with your parent. They enter it when they sign up to link to your family.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
