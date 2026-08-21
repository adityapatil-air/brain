import type { LanguageCode } from '../../../shared/clinical'

export interface TranscriptionResult {
  text: string
  language: LanguageCode
  provider: 'whisper' | 'simulated'
  degraded: boolean
  notice?: string
}

export type VoiceErrorCode =
  | 'NO_MICROPHONE'
  | 'PERMISSION_DENIED'
  | 'RECORDING_FAILED'
  | 'EMPTY_RECORDING'
  | 'TRANSCRIPTION_FAILED'

export class VoiceError extends Error {
  constructor(
    public readonly code: VoiceErrorCode,
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'VoiceError'
  }
}

/** Picks the first container this browser can actually produce. */
function pickMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  if (typeof MediaRecorder === 'undefined') return ''
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

/**
 * Microphone capture + Whisper transcription.
 *
 * The UI depends only on this interface, never on Whisper specifics: swapping
 * the provider means changing this file and nothing else.
 */
export class VoiceService {
  private recorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []
  private mimeType = ''

  static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined'
    )
  }

  get isRecording(): boolean {
    return this.recorder?.state === 'recording'
  }

  async startRecording(): Promise<void> {
    if (!VoiceService.isSupported()) throw new VoiceError('NO_MICROPHONE')
    if (this.isRecording) return

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      })
    } catch (err) {
      const name = (err as DOMException)?.name
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        throw new VoiceError('PERMISSION_DENIED')
      }
      throw new VoiceError('NO_MICROPHONE')
    }

    this.stream = stream
    this.chunks = []
    this.mimeType = pickMimeType()

    try {
      this.recorder = this.mimeType
        ? new MediaRecorder(stream, { mimeType: this.mimeType, audioBitsPerSecond: 64000 })
        : new MediaRecorder(stream)
    } catch {
      this.cleanup()
      throw new VoiceError('RECORDING_FAILED')
    }

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.recorder.start(250)
  }

  /** Stops capture and returns the recorded audio. */
  async stopRecording(): Promise<Blob> {
    const recorder = this.recorder
    if (!recorder) throw new VoiceError('RECORDING_FAILED')

    const blob = await new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || this.mimeType || 'audio/webm'
        resolve(new Blob(this.chunks, { type }))
      }
      recorder.onerror = () => reject(new VoiceError('RECORDING_FAILED'))
      try {
        recorder.stop()
      } catch {
        reject(new VoiceError('RECORDING_FAILED'))
      }
    })

    this.cleanup()
    if (blob.size < 1024) throw new VoiceError('EMPTY_RECORDING')
    return blob
  }

  cancel(): void {
    try {
      if (this.recorder?.state === 'recording') this.recorder.stop()
    } catch {
      /* ignore */
    }
    this.cleanup()
  }

  /** Live input level 0-1, used only to animate the recording indicator. */
  getStream(): MediaStream | null {
    return this.stream
  }

  private cleanup() {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.recorder = null
  }

  /**
   * Sends audio to the server-side Whisper proxy. The API key never touches
   * the browser.
   */
  async transcribe(audio: Blob, language: LanguageCode): Promise<TranscriptionResult> {
    const form = new FormData()
    const ext = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm'
    form.append('audio', audio, `recording.${ext}`)
    form.append('language', language)

    let res: Response
    try {
      res = await fetch('/api/voice/transcribe', { method: 'POST', body: form })
    } catch {
      throw new VoiceError('TRANSCRIPTION_FAILED', 'The transcription service is unreachable.')
    }

    if (!res.ok) throw new VoiceError('TRANSCRIPTION_FAILED')

    const json = (await res.json()) as Partial<TranscriptionResult>
    if (!json.text?.trim()) throw new VoiceError('TRANSCRIPTION_FAILED')

    return {
      text: json.text.trim(),
      language: json.language ?? language,
      provider: json.provider ?? 'whisper',
      degraded: Boolean(json.degraded),
      notice: json.notice,
    }
  }
}

export const voiceService = new VoiceService()
