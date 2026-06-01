'use client'

import { useRef, useState } from 'react'
import imageCompression from 'browser-image-compression'

interface Props {
  onFileReady: (file: File) => void
}

type UploadState = 'idle' | 'compressing' | 'ready'

/*
  PhotoUpload — camera capture + client-side compression.

  Flow:
  1. User taps the dashed area → file input opens (rear camera on mobile)
  2. They pick/capture a photo
  3. We compress it to <500KB in the browser using the Canvas API
  4. We show a preview + file size info
  5. We call onFileReady(compressedFile) so the parent page can upload it

  No upload happens here — this component only prepares the file.
  The submit page handles the actual Supabase Storage upload.
*/

export default function PhotoUpload({ onFileReady }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [state, setState]       = useState<UploadState>('idle')
  const [sizeKB, setSizeKB]     = useState<number | null>(null)
  const [origKB, setOrigKB]     = useState<number | null>(null)
  const [error, setError]       = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0]
    if (!raw) return

    setError(null)
    setOrigKB(Math.round(raw.size / 1024))
    setState('compressing')

    try {
      const compressed = await imageCompression(raw, {
        maxSizeMB: 0.5,          // 500 KB ceiling
        maxWidthOrHeight: 1920,  // never upscale, only downscale
        useWebWorker: true,      // runs off main thread — UI stays responsive
        fileType: 'image/jpeg',  // always output JPEG for consistency
      })

      const url = URL.createObjectURL(compressed)
      setPreview(url)
      setSizeKB(Math.round(compressed.size / 1024))
      setState('ready')
      onFileReady(compressed)
    } catch {
      setError('Photo compress nahi ho saka. Dobara try karein.')
      setState('idle')
    }
  }

  function retake() {
    setPreview(null)
    setState('idle')
    setSizeKB(null)
    setOrigKB(null)
    setError(null)
    // Reset the input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Hidden file input — capture="environment" opens rear camera on mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      {state === 'idle' && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            padding: 40, borderRadius: 20,
            background: 'var(--pc-surface)',
            border: '1.5px dashed var(--pc-hair)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            color: 'var(--pc-ink3)', cursor: 'pointer', width: '100%',
          }}
        >
          <span style={{ fontSize: 52 }}>📷</span>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--pc-ink2)' }}>
            Photo lo ya gallery se chunein
          </div>
          <div style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
            Rear camera khulega · JPEG mein compress hoga
          </div>
        </button>
      )}

      {state === 'compressing' && (
        <div
          style={{
            padding: 40, borderRadius: 20,
            background: 'var(--pc-surface)',
            border: '1.5px solid var(--pc-hair)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}
        >
          <span style={{ fontSize: 36 }}>⏳</span>
          <div style={{ fontSize: 15, color: 'var(--pc-ink2)' }}>
            Photo compress ho rahi hai…
          </div>
        </div>
      )}

      {state === 'ready' && preview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Preview image */}
          <div
            style={{
              borderRadius: 16, overflow: 'hidden',
              border: '0.5px solid var(--pc-hair)',
              aspectRatio: '4/3',
              background: '#000',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Photo preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>

          {/* Compression stats */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'var(--pc-surface)',
              borderRadius: 10, border: '0.5px solid var(--pc-hair)',
              fontSize: 13, color: 'var(--pc-ink3)',
            }}
          >
            <span>
              {origKB}KB → <b style={{ color: 'var(--pc-ok)' }}>{sizeKB}KB</b>
            </span>
            <span style={{ color: 'var(--pc-ok)', fontWeight: 600 }}>✓ Ready</span>
          </div>

          {/* Retake button */}
          <button
            type="button"
            onClick={retake}
            style={{
              appearance: 'none', border: '0.5px solid var(--pc-hair)',
              background: 'var(--pc-surface)', color: 'var(--pc-ink2)',
              fontFamily: 'var(--pc-body)', fontSize: 14, fontWeight: 500,
              padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
            }}
          >
            ↩ Dobara lo
          </button>
        </div>
      )}

      {error && (
        <div style={{ fontSize: 14, color: 'var(--pc-err, #e53)', padding: '8px 12px', borderRadius: 10, background: 'var(--pc-surface)' }}>
          {error}
        </div>
      )}
    </div>
  )
}
