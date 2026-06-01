'use client'

import { useState } from 'react'
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

type FormState = 'idle' | 'uploading' | 'done' | 'error'

export default function SubmitForm({ instanceId, parentId }: Props) {
  const [file, setFile]           = useState<File | null>(null)
  const [formState, setFormState] = useState<FormState>('idle')
  const [errMsg, setErrMsg]       = useState<string | null>(null)
  const [storagePath, setStoragePath] = useState<string | null>(null)

  // Called by PhotoUpload once compression is done
  function handleFileReady(compressed: File) {
    setFile(compressed)
    setFormState('idle')
  }

  async function handleSubmit() {
    if (!file) return
    setFormState('uploading')
    setErrMsg(null)

    const supabase = createClient()
    // Path: <parentId>/<instanceId>.jpg
    // The parentId folder segment is what the Storage RLS policy uses to
    // confirm auth.uid() matches — no other parent can write here.
    const path = `${parentId}/${instanceId}.jpg`

    const { error } = await supabase.storage
      .from('photos')
      .upload(path, file, {
        contentType: 'image/jpeg',
        upsert: true, // allow re-submission if parent retakes the photo
      })

    if (error) {
      setErrMsg(`Upload failed: ${error.message}`)
      setFormState('error')
      return
    }

    // Step 4 will POST /api/submissions/create with this path,
    // insert a submissions row, and update task_instance.status = 'submitted'
    setStoragePath(path)
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
          Photo upload ho gayi!
        </div>
        <div style={{ fontSize: 15, color: 'var(--pc-ink2)', lineHeight: 1.5 }}>
          Supabase Storage mein save ho gaya.
        </div>
        {storagePath && (
          <div
            style={{
              fontSize: 11, fontFamily: 'var(--pc-mono)',
              color: 'var(--pc-ink4)', wordBreak: 'break-all',
              padding: '6px 10px', background: 'var(--pc-bg)',
              borderRadius: 8, border: '0.5px solid var(--pc-hair)',
            }}
          >
            photos/{storagePath}
          </div>
        )}
        <div style={{ fontSize: 13, color: 'var(--pc-ink3)' }}>
          Step 4 mein submissions table mein save hoga aur dashboard update hoga.
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
