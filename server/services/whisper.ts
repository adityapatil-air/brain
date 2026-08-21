import { env } from '../env.js'
import type { LanguageCode } from '../../shared/clinical.js'

export interface TranscriptionResult {
  text: string
  language: LanguageCode
  durationMs: number
  provider: 'whisper' | 'simulated'
  /** `true` when no OPENAI_API_KEY is configured and a sample was returned. */
  degraded: boolean
  notice?: string
}

/**
 * Sample utterances used ONLY when no OPENAI_API_KEY is configured, so the
 * end-to-end flow stays demonstrable. Always surfaced to the user as simulated.
 */
const SIMULATED: Record<LanguageCode, string> = {
  hi: 'मुझे बहुत तेज बुखार है और सांस लेने में तकलीफ हो रही है। कल से कमजोरी भी बहुत है।',
  mr: 'मला कालपासून खूप ताप आहे आणि श्वास घेण्यास त्रास होत आहे. खूप अशक्तपणा जाणवतो आहे.',
  en: 'The patient has had a high fever since yesterday and is having difficulty breathing, with marked weakness.',
}

export async function transcribe(
  audio: Buffer,
  mimeType: string,
  language: LanguageCode,
): Promise<TranscriptionResult> {
  const started = Date.now()

  if (!env.whisper.apiKey) {
    return {
      text: SIMULATED[language] ?? SIMULATED.en,
      language,
      durationMs: Date.now() - started,
      provider: 'simulated',
      degraded: true,
      notice: 'OPENAI_API_KEY is not configured — returned a sample transcript so the workflow stays testable.',
    }
  }

  const ext = mimeType.includes('wav')
    ? 'wav'
    : mimeType.includes('mp4') || mimeType.includes('m4a')
      ? 'm4a'
      : mimeType.includes('ogg')
        ? 'ogg'
        : 'webm'

  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(audio)], { type: mimeType }), `recording.${ext}`)
  form.append('model', env.whisper.model)
  form.append('language', language)
  form.append('response_format', 'json')
  form.append(
    'prompt',
    'Clinical symptom description spoken by a community health worker in India. Transcribe verbatim in the spoken language.',
  )

  const res = await fetch(`${env.whisper.baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.whisper.apiKey}` },
    body: form,
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Whisper request failed (${res.status}): ${detail.slice(0, 400)}`)
  }

  const json = (await res.json()) as { text?: string }
  const text = (json.text ?? '').trim()
  if (!text) throw new Error('Whisper returned an empty transcript.')

  return {
    text,
    language,
    durationMs: Date.now() - started,
    provider: 'whisper',
    degraded: false,
  }
}
