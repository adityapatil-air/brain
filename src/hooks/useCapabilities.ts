import { useEffect, useState } from 'react'

export interface Capabilities {
  whisper: boolean
  gemini: boolean
  places: boolean
  geminiModel: string
  whisperModel: string
  /** `false` when the API proxy itself is not reachable. */
  apiReachable: boolean
}

const FALLBACK: Capabilities = {
  whisper: false,
  gemini: false,
  places: false,
  geminiModel: '—',
  whisperModel: '—',
  apiReachable: false,
}

let cache: Capabilities | null = null

/** Reports which server-side integrations are configured. */
export function useCapabilities(): { caps: Capabilities; loading: boolean } {
  const [caps, setCaps] = useState<Capabilities | null>(cache)
  const [loading, setLoading] = useState(cache === null)

  useEffect(() => {
    if (cache) return
    let cancelled = false
    void fetch('/api/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('unreachable'))))
      .then((json: { capabilities?: Partial<Capabilities> }) => {
        const next: Capabilities = { ...FALLBACK, ...json.capabilities, apiReachable: true }
        cache = next
        if (!cancelled) setCaps(next)
      })
      .catch(() => {
        cache = FALLBACK
        if (!cancelled) setCaps(FALLBACK)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { caps: caps ?? FALLBACK, loading }
}
