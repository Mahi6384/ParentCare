'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import SaathiMark from '@/components/ui/SaathiMark'
import type { UserRole } from '@/types'

export default function SignupPage() {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [role, setRole]       = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) { setError('Please choose your role'); return }

    setLoading(true)
    setError('')
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { name, role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)
    if (error) { setError(error.message) } else { setSent(true) }
  }

  // ── Magic link sent ────────────────────────────────────────
  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--pc-bg)' }}>
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="font-serif font-medium text-2xl text-ink mb-2" style={{ letterSpacing: '-0.02em' }}>
            Check your email
          </h2>
          <p className="text-ink-2 leading-relaxed text-sm">
            We sent a magic link to{' '}
            <span className="font-semibold text-ink">{email}</span>.{' '}
            Click it to complete signup.
          </p>
          <p className="text-xs text-ink-3 mt-4">
            No email? Check spam or{' '}
            <button onClick={() => setSent(false)} className="text-brand underline">
              try again
            </button>
          </p>
        </div>
      </div>
    )
  }

  // ── Signup form ───────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: 'var(--pc-bg)' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <SaathiMark size={48} />
          <div className="text-center">
            <h1 className="font-serif font-medium text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>
              ParentCare
            </h1>
            <p className="text-ink-3 text-sm mt-0.5">Create your account</p>
          </div>
        </div>

        {/* Card */}
        <div className="pc-card p-7">
          <form onSubmit={handleSignup} className="space-y-5">

            {/* Name */}
            <div>
              <label className="pc-label">Your name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rohan Sharma"
                required
                className="pc-input"
              />
            </div>

            {/* Email */}
            <div>
              <label className="pc-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rohan@gmail.com"
                required
                className="pc-input"
              />
            </div>

            {/* Role selector
                Design principle: two large tap targets.
                Selected state gets a brand-tinted background and saffron
                border — clear without being loud. */}
            <div>
              <label className="pc-label mb-2">I am a…</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'kid',    emoji: '👦', label: 'Son / Daughter' },
                  { value: 'parent', emoji: '👴', label: 'Mom / Dad' },
                ] as const).map(({ value, emoji, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    style={{
                      border: `1.5px solid ${role === value ? 'var(--pc-brand)' : 'var(--pc-hair)'}`,
                      background: role === value ? 'var(--pc-brand-tint)' : 'var(--pc-surface)',
                    }}
                    className="py-4 rounded-[12px] text-center transition-all"
                  >
                    <div className="text-2xl mb-1">{emoji}</div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: role === value ? 'var(--pc-brand-deep)' : 'var(--pc-ink2)' }}
                    >
                      {label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-bad text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="pc-btn w-full justify-center py-3"
            >
              {loading ? 'Sending…' : 'Send Magic Link →'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-3 mt-5">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand font-medium hover:underline">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}
