import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AlertTriangle, CheckCircle2, Info, X, ShieldAlert } from 'lucide-react'
import { cn } from '../../utils/cn'

type ToastTone = 'success' | 'error' | 'info' | 'urgent'

interface Toast {
  id: number
  tone: ToastTone
  message: string
  detail?: string
}

interface ToastApi {
  show: (message: string, opts?: { tone?: ToastTone; detail?: string; durationMs?: number }) => void
  success: (message: string, detail?: string) => void
  error: (message: string, detail?: string) => void
  urgent: (message: string, detail?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const ICONS: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
  urgent: ShieldAlert,
}

const TONES: Record<ToastTone, string> = {
  success: 'border-risk-greenBorder bg-white text-ink-800 [&_svg]:text-risk-green',
  error: 'border-risk-redBorder bg-white text-ink-800 [&_svg]:text-risk-red',
  info: 'border-ink-200 bg-white text-ink-800 [&_svg]:text-care-600',
  urgent: 'border-risk-red bg-risk-redSoft text-ink-900 [&_svg]:text-risk-red',
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback<ToastApi['show']>(
    (message, opts) => {
      const id = nextId++
      setToasts((prev) => [...prev.slice(-3), { id, tone: opts?.tone ?? 'info', message, detail: opts?.detail }])
      window.setTimeout(() => dismiss(id), opts?.durationMs ?? 5000)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, detail) => show(message, { tone: 'success', detail }),
      error: (message, detail) => show(message, { tone: 'error', detail, durationMs: 7000 }),
      urgent: (message, detail) => show(message, { tone: 'urgent', detail, durationMs: 9000 }),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:top-0 sm:items-end sm:p-6"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone]
          return (
            <div
              key={toast.id}
              role={toast.tone === 'error' || toast.tone === 'urgent' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex w-full max-w-md animate-slide-up items-start gap-3 rounded-xl border px-4 py-3 shadow-pop',
                TONES[toast.tone],
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-5">{toast.message}</p>
                {toast.detail && <p className="mt-0.5 text-sm text-ink-500">{toast.detail}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="-m-1 shrink-0 rounded-lg p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
