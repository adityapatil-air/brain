import { Check } from 'lucide-react'
import { useI18n } from '../../i18n/I18nProvider'
import type { TKey } from '../../i18n/translations'
import { cn } from '../../utils/cn'

export interface WizardStep {
  key: string
  labelKey: TKey
}

export const VISIT_STEPS: WizardStep[] = [
  { key: 'patient', labelKey: 'visit.step.patient' },
  { key: 'symptoms', labelKey: 'visit.step.symptoms' },
  { key: 'voice', labelKey: 'visit.step.voice' },
  { key: 'vitals', labelKey: 'visit.step.vitals' },
  { key: 'assessment', labelKey: 'visit.step.assessment' },
  { key: 'triage', labelKey: 'visit.step.triage' },
  { key: 'referral', labelKey: 'visit.step.referral' },
]

export function StepIndicator({
  steps,
  current,
  onJump,
  maxReachable,
}: {
  steps: WizardStep[]
  current: number
  /** Jumping back is always allowed; forward only up to `maxReachable`. */
  onJump?: (index: number) => void
  maxReachable: number
}) {
  const { t } = useI18n()

  return (
    <div className="mb-6">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-ink-400 sm:hidden">
        {t('visit.stepOf', { current: current + 1, total: steps.length })} ·{' '}
        <span className="text-care-700">{t(steps[current]!.labelKey)}</span>
      </p>

      <ol className="scrollbar-slim -mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1">
        {steps.map((step, i) => {
          const done = i < current
          const active = i === current
          const reachable = i <= maxReachable
          const Tag = onJump && reachable ? 'button' : 'div'

          return (
            <li key={step.key} className="flex shrink-0 items-center">
              <Tag
                {...(Tag === 'button'
                  ? { type: 'button' as const, onClick: () => onJump?.(i) }
                  : {})}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-care-600 bg-care-600 text-white'
                    : done
                      ? 'border-care-200 bg-care-50 text-care-800'
                      : 'border-ink-200 bg-surface text-ink-400',
                  Tag === 'button' && !active && 'hover:border-care-300 hover:bg-care-50',
                  Tag === 'button' && 'cursor-pointer',
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold',
                    active ? 'bg-white/20' : done ? 'bg-care-600 text-white' : 'bg-ink-100 text-ink-500',
                  )}
                >
                  {done ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
                </span>
                <span className="whitespace-nowrap">{t(step.labelKey)}</span>
              </Tag>
              {i < steps.length - 1 && (
                <span
                  className={cn('mx-1 h-px w-3 shrink-0', done ? 'bg-care-300' : 'bg-ink-200')}
                  aria-hidden
                />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
