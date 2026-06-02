'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

// Steps shown in the progress bar — only step 1 is built.
// Steps 2 + 3 will be filled in during onboarding after email verification.
const STEPS = ['About you', 'About your parent', 'Connect WhatsApp']

export default function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [role, setRole]           = useState<UserRole | null>(null)
  const [agreed, setAgreed]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [sent, setSent]           = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role)   { setError('Please choose your role.'); return }
    if (!agreed) { setError('Please confirm you have permission to set this up.'); return }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { name: `${firstName} ${lastName}`.trim(), role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)
    if (error) { setError(error.message) } else { setSent(true) }
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
          Setup · 6 minutes · ₹0 for the first 14 days
        </div>

        {/* Middle headline */}
        <div>
          <h1
            className="font-serif font-medium text-[52px] leading-[1.05]"
            style={{ letterSpacing: '-0.03em', color: 'var(--pc-ink)' }}
          >
            Hand the worrying over.
          </h1>
          <p
            className="mt-6 text-[17px] leading-relaxed"
            style={{ color: 'var(--pc-ink2)', maxWidth: '38ch' }}
          >
            Tell us about your parent once. Saathi will text them in the
            morning, watch their day, and write you a paragraph on Sunday.
          </p>
          <p
            className="mt-3 text-[17px] font-serif italic"
            style={{ color: 'var(--pc-ink3)' }}
          >
            — no apps for them to learn, no dashboards to check.
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
            Saathi · onboarding · step 1 of 3
          </span>
        </div>
      </div>

      {/* ── RIGHT — signup form ── */}
      <div
        className="w-full lg:w-1/2 flex flex-col"
        style={{ background: 'var(--pc-surface)' }}
      >
        {/* Top nav bar */}
        <div
          className="flex items-center justify-between px-8 py-5"
          style={{ borderBottom: '0.5px solid var(--pc-hair)' }}
        >
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
              Already a member?
            </span>
            <Link
              href="/auth/login"
              className="pc-btn-ghost"
              style={{ fontSize: 13, padding: '7px 14px' }}
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-[400px]">

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
                  Click it to complete your account.
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
              <>
                {/* ── 3-step progress indicator ── */}
                <div className="flex items-center gap-0 mb-8">
                  {STEPS.map((step, i) => (
                    <div key={step} className="flex items-center">
                      {/* Step pill */}
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0"
                          style={{
                            background: i === 0 ? 'var(--pc-brand)' : 'var(--pc-surface2)',
                            color:      i === 0 ? '#fff' : 'var(--pc-ink4)',
                          }}
                        >
                          {i + 1}
                        </div>
                        <span
                          className="text-[12px] font-medium whitespace-nowrap"
                          style={{ color: i === 0 ? 'var(--pc-ink)' : 'var(--pc-ink4)' }}
                        >
                          {step}
                        </span>
                      </div>
                      {/* Connector line between steps */}
                      {i < STEPS.length - 1 && (
                        <div
                          className="mx-3 flex-1 h-px"
                          style={{ background: 'var(--pc-hair)', minWidth: 20 }}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* ── Heading ── */}
                <div className="mb-7">
                  <h2
                    className="font-serif text-[30px] font-medium leading-tight"
                    style={{ letterSpacing: '-0.02em', color: 'var(--pc-ink)' }}
                  >
                    First, about you.
                  </h2>
                  <p className="mt-1 text-[14px]" style={{ color: 'var(--pc-ink3)' }}>
                    Just so Saathi knows who to send the weekly note to.
                  </p>
                </div>

                {/* ── Form ── */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                  {/* First + Last name row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="pc-label">First name</label>
                      <input
                        type="text"
                        className="pc-input"
                        placeholder="Rohan"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="pc-label">Last name</label>
                      <input
                        type="text"
                        className="pc-input"
                        placeholder="Malhotra"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="pc-label" style={{ marginBottom: 0 }}>Email</label>
                      <span className="font-mono text-[10px]" style={{ color: 'var(--pc-ink4)' }}>
                        we send the Sunday note here
                      </span>
                    </div>
                    <input
                      type="email"
                      className="pc-input"
                      placeholder="rohan.malhotra@gmail.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {/* Role picker */}
                  <div>
                    <label className="pc-label">I am a…</label>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      {([
                        { value: 'kid',    emoji: '👦', label: 'Son / Daughter' },
                        { value: 'parent', emoji: '👴', label: 'Mom / Dad' },
                      ] as const).map(({ value, emoji, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setRole(value)}
                          style={{
                            border:     `1.5px solid ${role === value ? 'var(--pc-brand)' : 'var(--pc-hair)'}`,
                            background: role === value ? 'var(--pc-brand-tint)' : 'var(--pc-surface)',
                          }}
                          className="py-4 rounded-[12px] text-center transition-all"
                        >
                          <div className="text-2xl mb-1">{emoji}</div>
                          <div
                            className="text-[13px] font-semibold"
                            style={{ color: role === value ? 'var(--pc-brand-deep)' : 'var(--pc-ink2)' }}
                          >
                            {label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Consent checkbox */}
                  <label
                    className="flex items-start gap-3 cursor-pointer"
                    style={{ marginTop: 2 }}
                  >
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={e => setAgreed(e.target.checked)}
                      className="mt-0.5 flex-shrink-0 accent-[#D26B26]"
                    />
                    <span className="text-[13px] leading-relaxed" style={{ color: 'var(--pc-ink2)' }}>
                      I have my parent&apos;s permission to set this up. Saathi will
                      introduce itself before sending any reminder, and you can
                      revoke access at any time.
                    </span>
                  </label>

                  {/* Error */}
                  {error && (
                    <p className="text-[13px] font-medium" style={{ color: 'var(--pc-bad)' }}>
                      {error}
                    </p>
                  )}

                  {/* Submit */}
                  <div className="flex items-center gap-3 mt-1">
                    <Link
                      href="/auth/login"
                      className="pc-btn-ghost"
                      style={{ fontSize: 14, padding: '13px 18px', borderRadius: 12 }}
                    >
                      ← Back
                    </Link>
                    <button
                      type="submit"
                      disabled={loading || !firstName || !email || !role || !agreed}
                      className="pc-btn flex-1 justify-center"
                      style={{ fontSize: 15, padding: '13px 18px', borderRadius: 12 }}
                    >
                      {loading ? 'Sending…' : 'Continue · meet your parent →'}
                    </button>
                  </div>

                  {/* Fine print */}
                  <p className="text-center text-[11px]" style={{ color: 'var(--pc-ink4)' }}>
                    ● 14 days free · cancel any time · no card now
                  </p>
                </form>
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
          <span>onboarding takes 6 minutes</span>
        </div>
      </div>

    </main>
  )
}
