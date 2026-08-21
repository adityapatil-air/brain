import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'
import type { TriageLevel } from '../../../shared/clinical'
import { useLabels } from '../../i18n/I18nProvider'
import { cn } from '../../utils/cn'

type Tone = 'neutral' | 'care' | 'green' | 'amber' | 'red' | 'info'

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700 border-ink-200',
  care: 'bg-care-50 text-care-700 border-care-200',
  green: 'bg-risk-greenSoft text-risk-green border-risk-greenBorder',
  amber: 'bg-risk-amberSoft text-risk-amber border-risk-amberBorder',
  red: 'bg-risk-redSoft text-risk-red border-risk-redBorder',
  info: 'bg-ink-50 text-ink-600 border-ink-200',
}

export function Badge({
  children,
  tone = 'neutral',
  icon,
  className,
}: {
  children: ReactNode
  tone?: Tone
  icon?: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

export const TRIAGE_TONE: Record<TriageLevel, Tone> = {
  GREEN: 'green',
  YELLOW: 'amber',
  RED: 'red',
}

export const TRIAGE_ICON: Record<TriageLevel, typeof CheckCircle2> = {
  GREEN: CheckCircle2,
  YELLOW: AlertTriangle,
  RED: ShieldAlert,
}

/**
 * Clinical risk is never communicated by colour alone: the badge always
 * carries an icon and the level in words.
 */
export function RiskBadge({
  level,
  size = 'md',
  full = false,
  className,
}: {
  level: TriageLevel
  size?: 'sm' | 'md'
  /** Show the long form ("RED — URGENT REFERRAL") instead of just "Red". */
  full?: boolean
  className?: string
}) {
  const labels = useLabels()
  const Icon = TRIAGE_ICON[level]
  return (
    <Badge
      tone={TRIAGE_TONE[level]}
      className={cn(
        size === 'md' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[0.6875rem]',
        'uppercase tracking-[0.03em]',
        className,
      )}
      icon={<Icon className={size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3'} aria-hidden />}
    >
      {full ? labels.triage(level) : labels.triageShort(level)}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const labels = useLabels()
  const tone: Tone =
    status === 'pending'
      ? 'amber'
      : status === 'acknowledged'
        ? 'care'
        : status === 'reviewed' || status === 'completed'
          ? 'green'
          : 'neutral'
  return <Badge tone={tone}>{labels.referralStatus(status)}</Badge>
}
