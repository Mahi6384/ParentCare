'use client'

import { useState } from 'react'

/*
  CopyInviteCode — client component for the clipboard copy button.
  Lives here because the parent page (family/page.tsx) is a server
  component and can't hold useState — only the interactive part
  needs to be a client component.
*/
export default function CopyInviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="rounded-2xl p-6 mb-4 text-center"
      style={{ background: 'var(--pc-surface2)', border: '0.5px solid var(--pc-hair)' }}
    >
      <p className="pc-label mb-3">Your invite code</p>

      {/* The code itself — mono, large, spaced for easy reading */}
      <p
        className="font-mono text-4xl font-bold tracking-[0.18em] text-ink mb-5"
      >
        {code}
      </p>

      <button
        onClick={handleCopy}
        className="w-full py-3 rounded-[10px] font-semibold text-sm transition-all"
        style={{
          background:  copied ? 'var(--pc-brand-tint)' : 'var(--pc-surface)',
          color:       copied ? 'var(--pc-brand-deep)' : 'var(--pc-ink2)',
          border:      `1px solid ${copied ? 'var(--pc-brand-soft)' : 'var(--pc-hair)'}`,
        }}
      >
        {copied ? '✓ Copied!' : 'Copy Code'}
      </button>
    </div>
  )
}
