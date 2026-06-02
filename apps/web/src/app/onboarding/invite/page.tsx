'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SaathiMark from '@/components/ui/SaathiMark'

/*
  Parent onboarding: enter the 8-char code their kid shared.
  This screen is intentionally large and touch-friendly — it's
  shown to elderly parents who may not be comfortable with small UI.
*/
export default function InviteOnboardingPage() {
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/family/join', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Something went wrong.')
      return
    }

    router.push('/onboarding/chat')
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
            Enter your family code
          </h2>
          <p className="text-ink-2 text-sm leading-relaxed">
            Your son or daughter should have sent you an 8-letter code.
            Enter it below to connect.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/*
            Big centered mono input — designed for elderly users.
            - text-4xl: large enough to read without squinting
            - tracking-[0.2em]: spaced so each letter is distinct
            - text-center: code reads naturally as a unit
            - focus ring uses brand color (saffron)
          */}
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD1234"
            maxLength={8}
            required
            autoFocus
            className="w-full py-5 rounded-2xl text-center text-4xl font-bold tracking-[0.2em] font-mono text-ink bg-surface placeholder-ink-4 outline-none transition-all"
            style={{
              border:    '1.5px solid var(--pc-hair)',
              boxShadow: 'none',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--pc-brand)'
              e.target.style.boxShadow   = '0 0 0 3px var(--pc-brand-tint)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--pc-hair)'
              e.target.style.boxShadow   = 'none'
            }}
          />

          {error && (
            <p className="text-bad text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="pc-btn w-full justify-center py-4 text-base"
          >
            {loading ? 'Connecting…' : 'Connect to Family →'}
          </button>
        </form>

        <p className="text-center text-xs text-ink-3 mt-6">
          Don't have a code? Ask your son or daughter to share it
          from their ParentCare app.
        </p>

      </div>
    </div>
  )
}
