import type { ReactNode } from 'react'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { useI18n } from '../../i18n/I18nProvider'
import { cn } from '../../utils/cn'
import { Button } from './Button'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} aria-hidden />
}

export function LoadingState({ label, className }: { label?: string; className?: string }) {
  const { t } = useI18n()
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-3 py-14 text-center', className)}
    >
      <Spinner className="h-6 w-6 text-care-600" />
      <p className="text-sm font-medium text-ink-500">{label ?? t('common.loading')}</p>
    </div>
  )
}

/** Skeleton rows used while tables load, to avoid layout jumps. */
export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2 p-4', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-ink-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-ink-100" />
            <div className="h-3 w-1/5 animate-pulse rounded bg-ink-100/70" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-50 text-ink-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message?: string
  onRetry?: () => void
  className?: string
}) {
  const { t } = useI18n()
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-risk-redSoft text-risk-red">
        <AlertCircle className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-ink-900">{t('error.title')}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-500">{message ?? t('error.load')}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-5"
          onClick={onRetry}
          iconLeft={<RefreshCw className="h-3.5 w-3.5" aria-hidden />}
        >
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}

/** Inline, non-blocking notice used for degraded services. */
export function Notice({
  tone = 'info',
  children,
  icon,
  className,
  action,
}: {
  tone?: 'info' | 'amber' | 'red' | 'care'
  children: ReactNode
  icon?: ReactNode
  className?: string
  action?: ReactNode
}) {
  const tones = {
    info: 'bg-ink-50 border-ink-200 text-ink-700',
    amber: 'bg-risk-amberSoft border-risk-amberBorder text-risk-amber',
    red: 'bg-risk-redSoft border-risk-redBorder text-risk-red',
    care: 'bg-care-50 border-care-200 text-care-800',
  }
  return (
    <div
      className={cn(
        'flex flex-wrap items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm',
        tones[tone],
        className,
      )}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
      {action}
    </div>
  )
}

/** Thin indeterminate bar for multi-stage async work. */
export function ProgressBar({ className }: { className?: string }) {
  return (
    <div className={cn('h-1 w-full overflow-hidden rounded-full bg-ink-100', className)} aria-hidden>
      <div className="h-full w-1/3 animate-indeterminate rounded-full bg-care-500" />
    </div>
  )
}
