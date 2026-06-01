'use client'

import { useState } from 'react'
import PhotoUpload from '@/components/parent/PhotoUpload'

/*
  SubmitForm — client component that owns the full submission flow.

  Step 2 (now): photo selection + compression + preview + submit button.
  Step 3 (next): upload to Supabase Storage → POST /api/submissions/create → redirect.

  Props:
    instanceId — the task_instance UUID being submitted
    parentId   — the logged-in parent's user UUID (needed for storage path)
*/

interface Props {
  instanceId: string
  parentId: string
}

type FormState = 'idle' | 'uploading' | 'done' | 'error'

export default function SubmitForm({ instanceId, parentId }: Props) {
  const [file, setFile]       = useState<File | null>(null)
  const [formState, setFormState] = useState<FormState>('idle')
  const [errMsg, setErrMsg]   = useState<string | null>(null)

  // Called by PhotoUpload once compression is done
  function handleFileReady(compressed: File) {
    setFile(compressed)
    setFormState('idle')
  }

  async function handleSubmit() {
    if (!file) return
    setFormState('uploading')
    setErrMsg(null)

    // Step 3 will add: upload to Storage + POST /api/submissions/create
    // For now, simulate so the button + loading state can be tested
    console.log('TODO Step 3 — upload', { instanceId, parentId, fileSize: file.size })
    await new Promise(r => setTimeout(r, 800))
    setFormState('done')
  }

  if (formState === 'done') {
    return (
      <div
        style={{
          padding: 32, borderRadius: 20,
          background: 'var(--pc-surface)', border: '0.5px solid var(--pc-hair)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 52 }}>✅</span>
        <div className="font-serif" style={{ fontSize: 24, fontWeight: 600 }}>
          Bhej diya!
        </div>
        <div style={{ fontSize: 15, color: 'var(--pc-ink2)', lineHeight: 1.5 }}>
          Saathi verify karega aur aapko bata dega.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PhotoUpload onFileReady={handleFileReady} />

      {/* Submit button — only active once a file is chosen */}
      <button
        type="button"
        disabled={!file || formState === 'uploading'}
        onClick={handleSubmit}
        style={{
          appearance: 'none', border: 0,
          background: file ? 'var(--pc-brand)' : 'var(--pc-surface)',
          color: file ? '#fff' : 'var(--pc-ink4)',
          fontFamily: 'var(--pc-body)', fontSize: 18, fontWeight: 700,
          padding: '16px 22px', borderRadius: 16, cursor: file ? 'pointer' : 'not-allowed',
          transition: 'background 0.2s, color 0.2s',
          outline: file ? 'none' : '0.5px solid var(--pc-hair)',
        } as React.CSSProperties}
      >
        {formState === 'uploading' ? '⏳ Bhej rahe hain…' : '📤 Submit karo'}
      </button>

      {errMsg && (
        <div style={{ fontSize: 14, color: 'var(--pc-err, #e53)', padding: '8px 12px', borderRadius: 10, background: 'var(--pc-surface)' }}>
          {errMsg}
        </div>
      )}
    </div>
  )
}
