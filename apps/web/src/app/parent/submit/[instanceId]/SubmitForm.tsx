'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PhotoUpload from '@/components/parent/PhotoUpload'

/*
  SubmitForm — client component that owns the full submission flow.

  Step 3 (now): upload compressed photo to Supabase Storage.
  Step 4 (next): POST /api/submissions/create → insert submissions row +
                 update task_instance status → redirect to dashboard.

  Storage path: photos/<parentId>/<instanceId>.jpg
  The parentId as the first segment is what the Storage RLS policy checks
  against auth.uid() to enforce ownership.

  Props:
    instanceId — the task_instance UUID being submitted
    parentId   — the logged-in parent's user UUID (needed for storage path)
*/

interface Props {
  instanceId: string
  parentId: string
}

type FormState = 'idle' | 'uploading' | 'error'

export default function SubmitForm({ instanceId, parentId }: Props) {
  const router = useRouter()
  const [file, setFile]           = useState<File | null>(null)
  const [formState, setFormState] = useState<FormState>('idle')
  const [errMsg, setErrMsg]       = useState<string | null>(null)

  // Called by PhotoUpload once compression is done
  function handleFileReady(compressed: File) {
    setFile(compressed)
    setFormState('idle')
  }

  async function handleSubmit() {
    if (!file) return
    setFormState('uploading')
    setErrMsg(null)

    // ── Step 1: Upload to Supabase Storage ────────────────────
    const supabase = createClient()
    const path = `${parentId}/${instanceId}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(path, file, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      setErrMsg(`Upload failed: ${uploadError.message}`)
      setFormState('error')
      return
    }

    // ── Step 2: Record submission + update task status ────────
    const res = await fetch('/api/submissions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceId, storagePath: path }),
    })

    if (!res.ok) {
      const { error } = await res.json() as { error: string }
      setErrMsg(`Submission failed: ${error}`)
      setFormState('error')
      return
    }

    // ── Step 3: Redirect to verify screen — shows Saathi's live checklist
    router.push(`/parent/task/${instanceId}/verify`)
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
