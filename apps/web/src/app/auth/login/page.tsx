'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      if (error.message.toLowerCase().includes('not found') || error.status === 422) {
        setError('No account found. Please sign up first.')
      } else {
        setError(error.message)
      }
    } else {
      setSent(true)
    }
  }

  return (
    <main className="min-h-screen flex flex-col lg:flex-row">

      {/* ── LEFT — editorial marketing panel (desktop only) ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16"
        style={{ background: 'var(--pc-bg)', borderRight: '0.5px solid var(--pc-hair)' }}
      >
        {/* Top meta badge */}
        <div
          className="font-mono text-[11px] font-semibold tracking-widest uppercase"
          style={{ color: 'var(--pc-brand)' }}
        >
          Last week · 7 days verified · 0 missed
        </div>

        {/* Middle headline */}
        <div>
          <h1
            className="font-serif font-medium text-[52px] leading-[1.05]"
            style={{ letterSpacing: '-0.03em', color: 'var(--pc-ink)' }}
          >
            Welcome back.{' '}
            <em style={{ color: 'var(--pc-brand)' }}>Mummy</em>{' '}
            walked at 7:12 this morning.
          </h1>
          <p
            className="mt-6 text-[17px] leading-relaxed font-serif italic"
            style={{ color: 'var(--pc-ink2)', maxWidth: '38ch' }}
          >
            &ldquo;Six straight days now — the knee modification is clearly
            helping. I will keep the routine through next week and
            re-evaluate Sunday.&rdquo;
          </p>
        </div>

        {/* Bottom Saathi byline */}
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
            style={{ background: 'var(--pc-brand)' }}
          >
            S
          </div>
          <span className="font-mono text-[11px]" style={{ color: 'var(--pc-ink3)' }}>
            Saathi written for Rohan · Sunday 9:42 PM IST
          </span>
        </div>
      </div>

      {/* ── RIGHT — sign in form ── */}
      <div
        className="w-full lg:w-1/2 flex flex-col"
        style={{ background: 'var(--pc-surface)' }}
      >
        {/* Top nav bar */}
        <div
          className="flex items-center justify-between px-8 py-5"
          style={{ borderBottom: '0.5px solid var(--pc-hair)' }}
        >
          {/* Logo — visible on mobile (hidden on desktop where left panel shows it) */}
          <div className="flex items-center gap-2 lg:invisible">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[13px] font-bold"
              style={{ background: 'var(--pc-brand)' }}
            >
              P
            </div>
            <span className="font-serif font-medium text-[17px]" style={{ color: 'var(--pc-ink)' }}>
              ParentCare
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[13px]" style={{ color: 'var(--pc-ink3)' }}>
              New here?
            </span>
            <Link
              href="/auth/signup"
              className="pc-btn"
              style={{ fontSize: 13, padding: '7px 14px' }}
            >
              Create account
            </Link>
          </div>
        </div>

        {/* Form area — vertically centred */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-[360px]">

            {sent ? (
              /* ── Post-submit: magic link sent ── */
              <div className="text-center">
                <div className="text-5xl mb-4">📬</div>
                <h2
                  className="font-serif text-[28px] font-medium"
                  style={{ color: 'var(--pc-ink)' }}
                >
                  Check your email.
                </h2>
                <p className="mt-3 text-[15px]" style={{ color: 'var(--pc-ink2)' }}>
                  We sent a magic link to <strong>{email}</strong>.
                  Click it to open the household.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-6 text-[13px] underline"
                  style={{ color: 'var(--pc-ink3)' }}
                >
                  Use a different email
                </button>
              </div>
            ) : (
              /* ── Sign in form ── */
              <>
                {/* Heading */}
                <div className="mb-8">
                  <p
                    className="font-mono text-[11px] font-semibold tracking-widest uppercase mb-3"
                    style={{ color: 'var(--pc-ink3)' }}
                  >
                    Sign in
                  </p>
                  <h2
                    className="font-serif text-[34px] font-medium leading-tight"
                    style={{ letterSpacing: '-0.02em', color: 'var(--pc-ink)' }}
                  >
                    Open the household.
                  </h2>
                  <p className="mt-2 text-[15px]" style={{ color: 'var(--pc-ink2)' }}>
                    Sign in to see what your parents did today and what
                    Saathi is watching for.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Email */}
                  <div>
                    <label className="pc-label">Email</label>
                    <input
                      type="email"
                      className="pc-input"
                      placeholder="rohan.malhotra@gmail.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {/* Error message */}
                  {error && (
                    <p className="text-[13px] font-medium" style={{ color: 'var(--pc-bad)' }}>
                      {error}
                    </p>
                  )}

                  {/* Primary CTA */}
                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="pc-btn w-full justify-center"
                    style={{ fontSize: 16, padding: '14px 20px', borderRadius: 12, marginTop: 4 }}
                  >
                    {loading ? 'Sending…' : 'Continue to dashboard →'}
                  </button>
                </form>

                {/* OR divider */}
                <div className="pc-rule my-6 text-[12px]">or</div>

                {/* Secondary options */}
                <div className="flex flex-col gap-3">
                  <button
                    className="pc-btn-ghost w-full justify-center gap-3"
                    style={{ fontSize: 14, padding: '12px 20px', borderRadius: 12 }}
                    disabled
                  >
                    <span>📱</span> Send magic link to WhatsApp
                  </button>
                  <button
                    className="pc-btn-ghost w-full justify-center gap-3"
                    style={{ fontSize: 14, padding: '12px 20px', borderRadius: 12 }}
                    disabled
                  >
                    <span>👤</span> Continue with Google
                  </button>
                </div>

                {/* Legal */}
                <p className="mt-6 text-center text-[12px]" style={{ color: 'var(--pc-ink4)' }}>
                  By signing in you accept our{' '}
                  <span className="underline cursor-pointer">Terms</span> and{' '}
                  <span className="underline cursor-pointer">Privacy policy</span>.
                  <br />
                  Your parents&apos; data never leaves India.
                </p>
              </>
            )}

          </div>
        </div>

        {/* Bottom status bar */}
        <div
          className="flex items-center justify-between px-8 py-4 font-mono text-[11px]"
          style={{ borderTop: '0.5px solid var(--pc-hair)', color: 'var(--pc-ink4)' }}
        >
          <span>parentcare.in</span>
          <span>v2.1 · status: all systems operational</span>
        </div>
      </div>

    </main>
  )
}
