import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, Keyboard, Mic, Square } from 'lucide-react'
import type { LanguageCode } from '../../../shared/clinical'
import { useI18n } from '../../i18n/I18nProvider'
import { VoiceError, voiceService } from '../../services/voice/VoiceService'
import { Button } from '../../components/ui/Button'
import { TextArea } from '../../components/ui/Field'
import { Notice, ProgressBar } from '../../components/ui/States'
import { cn } from '../../utils/cn'

type Phase = 'idle' | 'recording' | 'transcribing' | 'review' | 'error'

const LANGUAGE_OPTIONS: Array<{ code: LanguageCode; label: string; sub: string }> = [
  { code: 'hi', label: 'हिन्दी', sub: 'Hindi' },
  { code: 'mr', label: 'मराठी', sub: 'Marathi' },
  { code: 'en', label: 'English', sub: 'English' },
]

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Live microphone level, used only to drive the recording animation. */
function useLevelMeter(active: boolean): number {
  const [level, setLevel] = useState(0)
  const raf = useRef<number>()
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!active) {
      setLevel(0)
      return
    }
    const stream = voiceService.getStream()
    if (!stream) return

    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return

    const ctx = new AudioCtor()
    ctxRef.current = ctx
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    ctx.createMediaStreamSource(stream).connect(analyser)
    const buffer = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteTimeDomainData(buffer)
      let sum = 0
      for (const v of buffer) sum += (v - 128) ** 2
      setLevel(Math.min(1, Math.sqrt(sum / buffer.length) / 40))
      raf.current = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
      void ctx.close().catch(() => undefined)
      ctxRef.current = null
    }
  }, [active])

  return level
}

export interface VoiceRecorderProps {
  language: LanguageCode
  onLanguageChange: (lang: LanguageCode) => void
  transcript: string
  onTranscriptChange: (text: string) => void
  accepted: boolean
  onAccept: (text: string, simulated: boolean) => void
  onReset: () => void
  simulated: boolean
}

export function VoiceRecorder({
  language,
  onLanguageChange,
  transcript,
  onTranscriptChange,
  accepted,
  onAccept,
  onReset,
  simulated,
}: VoiceRecorderProps) {
  const { t } = useI18n()
  const supported = VoiceService_isSupported()

  const [phase, setPhase] = useState<Phase>(accepted || transcript ? 'review' : 'idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const timer = useRef<number>()
  const level = useLevelMeter(phase === 'recording')

  useEffect(
    () => () => {
      if (timer.current) window.clearInterval(timer.current)
      voiceService.cancel()
    },
    [],
  )

  const start = useCallback(async () => {
    setError(null)
    setNotice(null)
    try {
      await voiceService.startRecording()
      setElapsed(0)
      setPhase('recording')
      const startedAt = Date.now()
      timer.current = window.setInterval(() => setElapsed(Date.now() - startedAt), 200)
    } catch (err) {
      const code = err instanceof VoiceError ? err.code : 'RECORDING_FAILED'
      setError(
        code === 'PERMISSION_DENIED'
          ? t('voice.micDenied')
          : code === 'NO_MICROPHONE'
            ? t('voice.noMic')
            : t('voice.failed'),
      )
      setPhase('error')
    }
  }, [t])

  const stop = useCallback(async () => {
    if (timer.current) window.clearInterval(timer.current)
    setPhase('transcribing')
    try {
      const blob = await voiceService.stopRecording()
      const result = await voiceService.transcribe(blob, language)
      onTranscriptChange(result.text)
      onAccept(result.text, result.degraded)
      if (result.degraded) setNotice(t('voice.simulated'))
      setPhase('review')
    } catch (err) {
      const code = err instanceof VoiceError ? err.code : 'TRANSCRIPTION_FAILED'
      setError(code === 'EMPTY_RECORDING' ? t('voice.failed') : t('voice.failed'))
      setPhase('error')
    }
  }, [language, onAccept, onTranscriptChange, t])

  const recordAgain = () => {
    onReset()
    setError(null)
    setNotice(null)
    setManual(false)
    setPhase('idle')
  }

  // --------------------------------------------------------------- language
  const languagePicker = (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink-700">{t('voice.language')}</legend>
      <div className="flex flex-wrap gap-2">
        {LANGUAGE_OPTIONS.map((opt) => {
          const on = opt.code === language
          return (
            <button
              key={opt.code}
              type="button"
              aria-pressed={on}
              disabled={phase === 'recording' || phase === 'transcribing'}
              onClick={() => onLanguageChange(opt.code)}
              className={cn(
                'min-h-[3rem] rounded-xl border px-4 py-2 text-left transition-colors disabled:opacity-50',
                on
                  ? 'border-care-600 bg-care-600 text-white'
                  : 'border-ink-200 bg-surface text-ink-700 hover:border-care-300 hover:bg-care-50',
              )}
            >
              <span className="block text-sm font-semibold leading-tight">{opt.label}</span>
              {opt.label !== opt.sub && (
                <span className={cn('block text-xs', on ? 'text-care-100' : 'text-ink-400')}>{opt.sub}</span>
              )}
            </button>
          )
        })}
      </div>
    </fieldset>
  )

  return (
    <div className="space-y-5">
      {languagePicker}

      {/* --------------------------------------------------- recorder stage */}
      <div
        className={cn(
          'rounded-2xl border px-5 py-8 text-center transition-colors sm:px-8',
          phase === 'recording'
            ? 'border-risk-redBorder bg-risk-redSoft/60'
            : phase === 'review'
              ? 'border-care-200 bg-care-50/50'
              : 'border-ink-200 bg-surface',
        )}
      >
        {/* --- idle / error --- */}
        {(phase === 'idle' || phase === 'error') && (
          <>
            <button
              type="button"
              onClick={() => void start()}
              disabled={!supported}
              aria-label={t('voice.idle')}
              className={cn(
                'group relative mx-auto flex h-24 w-24 items-center justify-center rounded-full transition-transform',
                supported
                  ? 'bg-care-600 text-white shadow-raised hover:bg-care-700 active:scale-95'
                  : 'cursor-not-allowed bg-ink-200 text-ink-400',
              )}
            >
              <Mic className="h-10 w-10" aria-hidden />
            </button>
            <p className="mt-5 text-lg font-semibold text-ink-900">{t('voice.idle')}</p>
            <p className="mt-1 text-sm text-ink-500">
              {supported ? t('voice.tapToRecord') : t('voice.noMic')}
            </p>
            {supported && <p className="mt-3 text-xs text-ink-400">{t('voice.permissionPrompt')}</p>}
          </>
        )}

        {/* --- recording --- */}
        {phase === 'recording' && (
          <>
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
              <span
                className="absolute inset-0 animate-pulse-ring rounded-full bg-risk-red/30"
                aria-hidden
              />
              <span
                className="absolute rounded-full bg-risk-red/15 transition-transform duration-100"
                style={{
                  inset: 0,
                  transform: `scale(${1 + level * 0.35})`,
                }}
                aria-hidden
              />
              <button
                type="button"
                onClick={() => void stop()}
                aria-label={t('voice.stop')}
                className="relative flex h-20 w-20 items-center justify-center rounded-full bg-risk-red text-white shadow-raised transition-transform hover:bg-[#9C1E18] active:scale-95"
              >
                <Square className="h-7 w-7" fill="currentColor" aria-hidden />
              </button>
            </div>

            <p
              className="mt-5 flex items-center justify-center gap-2 text-lg font-semibold text-risk-red"
              role="status"
              aria-live="polite"
            >
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-risk-red" aria-hidden />
              {t('voice.recording')}
            </p>
            <p className="tabular mt-1 text-2xl font-semibold text-ink-900">{formatDuration(elapsed)}</p>

            {/* Level bars — visual confirmation that the mic is live. */}
            <div className="mt-4 flex h-8 items-end justify-center gap-1" aria-hidden>
              {Array.from({ length: 20 }).map((_, i) => {
                const dist = Math.abs(i - 9.5) / 9.5
                const h = Math.max(4, level * 32 * (1 - dist * 0.6) * (0.6 + ((i * 7) % 5) / 10))
                return (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-risk-red/70 transition-[height] duration-100"
                    style={{ height: `${h}px` }}
                  />
                )
              })}
            </div>

            <Button variant="urgent" size="lg" className="mt-5" onClick={() => void stop()}>
              {t('voice.stop')}
            </Button>
          </>
        )}

        {/* --- transcribing --- */}
        {phase === 'transcribing' && (
          <div role="status" aria-live="polite">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-care-100">
              <Mic className="h-10 w-10 animate-pulse text-care-600" aria-hidden />
            </div>
            <p className="mt-5 text-lg font-semibold text-ink-900">{t('voice.transcribing')}</p>
            <p className="mt-1 text-sm text-ink-500">{t('voice.transcribingHint')}</p>
            <ProgressBar className="mx-auto mt-5 max-w-xs" />
          </div>
        )}

        {/* --- review --- */}
        {phase === 'review' && (
          <div className="text-left">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-care-800">
                <Check className="h-4 w-4" aria-hidden />
                {t('voice.transcript')}
              </p>
              <Button variant="ghost" size="sm" onClick={recordAgain} iconLeft={<Mic className="h-3.5 w-3.5" aria-hidden />}>
                {t('voice.recordAgain')}
              </Button>
            </div>
            <TextArea
              label={t('voice.transcript')}
              hint={t('voice.editHint')}
              value={transcript}
              onChange={(e) => {
                onTranscriptChange(e.target.value)
                onAccept(e.target.value, simulated)
              }}
              rows={4}
              className="bg-surface text-[1.0625rem] leading-relaxed"
            />
          </div>
        )}
      </div>

      {notice && (
        <Notice tone="amber" icon={<AlertCircle className="h-4 w-4" aria-hidden />}>
          {notice}
        </Notice>
      )}

      {error && (
        <Notice
          tone="red"
          icon={<AlertCircle className="h-4 w-4" aria-hidden />}
          action={
            <Button variant="danger" size="sm" onClick={() => void start()}>
              {t('common.retry')}
            </Button>
          }
        >
          {error}
        </Notice>
      )}

      {/* --------------------------------------------- manual typing escape */}
      {phase !== 'review' && (
        <div>
          {manual ? (
            <div className="space-y-3">
              <TextArea
                label={t('voice.typeInstead')}
                placeholder={t('voice.typePlaceholder')}
                value={transcript}
                onChange={(e) => onTranscriptChange(e.target.value)}
                rows={4}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    onAccept(transcript, false)
                    setPhase('review')
                  }}
                  disabled={transcript.trim().length < 3}
                  iconLeft={<Check className="h-4 w-4" aria-hidden />}
                >
                  {t('voice.accept')}
                </Button>
                <Button variant="ghost" onClick={() => setManual(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setManual(true)}
              iconLeft={<Keyboard className="h-4 w-4" aria-hidden />}
            >
              {t('voice.skip')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Kept as a function so the component file has no top-level side effects.
function VoiceService_isSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined'
  )
}
