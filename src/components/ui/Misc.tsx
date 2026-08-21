import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { initials } from '../../utils/format'
import { cn } from '../../utils/cn'

export function Avatar({
  name,
  size = 'md',
  tone = 'care',
  className,
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'care' | 'neutral' | 'red'
  className?: string
}) {
  const sizes = {
    sm: 'h-8 w-8 text-[0.6875rem]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-14 w-14 text-base',
  }
  const tones = {
    care: 'bg-care-100 text-care-800',
    neutral: 'bg-ink-100 text-ink-600',
    red: 'bg-risk-redSoft text-risk-red',
  }
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold uppercase tracking-wide',
        sizes[size],
        tones[tone],
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'neutral',
  to,
  hint,
}: {
  label: string
  value: number | string
  icon?: ReactNode
  tone?: 'neutral' | 'care' | 'amber' | 'red'
  to?: string
  hint?: string
}) {
  const tones = {
    neutral: 'text-ink-900',
    care: 'text-care-700',
    amber: 'text-risk-amber',
    red: 'text-risk-red',
  }
  const iconTones = {
    neutral: 'bg-ink-50 text-ink-500',
    care: 'bg-care-50 text-care-600',
    amber: 'bg-risk-amberSoft text-risk-amber',
    red: 'bg-risk-redSoft text-risk-red',
  }

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        {icon && (
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconTones[tone])}>
            {icon}
          </span>
        )}
      </div>
      <p className={cn('mt-2 text-3xl font-semibold tabular tracking-[-0.02em]', tones[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </>
  )

  if (to) {
    return (
      <Link
        to={to}
        className="card group block px-4 py-4 transition-shadow hover:shadow-raised sm:px-5 sm:py-5"
      >
        {body}
      </Link>
    )
  }
  return <div className="card px-4 py-4 sm:px-5 sm:py-5">{body}</div>
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Array<{ value: T; label: string; count?: number }>
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('scrollbar-slim -mx-1 flex gap-1 overflow-x-auto px-1 pb-1', className)}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'border-care-600 bg-care-600 text-white'
                : 'border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:bg-ink-50',
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[0.6875rem] font-semibold tabular',
                  active ? 'bg-white/20' : 'bg-ink-100 text-ink-600',
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function ActionTile({
  to,
  title,
  description,
  icon,
}: {
  to: string
  title: string
  description?: string
  icon: ReactNode
}) {
  return (
    <Link
      to={to}
      className="card group flex items-center gap-4 px-4 py-4 transition-shadow hover:shadow-raised"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-care-50 text-care-600">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink-900">{title}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-500">{description}</span>}
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-care-600"
        aria-hidden
      />
    </Link>
  )
}

export function Disclaimer({ text, className }: { text: string; className?: string }) {
  return (
    <p className={cn('text-xs leading-relaxed text-ink-400', className)}>{text}</p>
  )
}
