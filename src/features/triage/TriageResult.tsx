import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { TriageLevel, VitalsInput } from '../../../shared/clinical'
import { useI18n, useLabels } from '../../i18n/I18nProvider'
import { formatVitalsForNote } from '../../services/visits/referralNote'
import type { TriageOutcome } from '../../types/domain'
import { Badge } from '../../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Notice } from '../../components/ui/States'
import { cn } from '../../utils/cn'

const BANNER: Record<TriageLevel, { wrap: string; icon: string; text: string; bar: string }> = {
  RED: {
    wrap: 'border-risk-redBorder bg-risk-redSoft',
    icon: 'bg-risk-red text-white',
    text: 'text-risk-red',
    bar: 'bg-risk-red',
  },
  YELLOW: {
    wrap: 'border-risk-amberBorder bg-risk-amberSoft',
    icon: 'bg-risk-amber text-white',
    text: 'text-risk-amber',
    bar: 'bg-risk-amber',
  },
  GREEN: {
    wrap: 'border-risk-greenBorder bg-risk-greenSoft',
    icon: 'bg-risk-green text-white',
    text: 'text-risk-green',
    bar: 'bg-risk-green',
  },
}

const ICON: Record<TriageLevel, typeof ShieldAlert> = {
  RED: ShieldAlert,
  YELLOW: AlertTriangle,
  GREEN: CheckCircle2,
}

/**
 * The triage banner. Risk is always conveyed by icon + words + colour, never
 * colour alone, and the recommended action sits above the AI explanation.
 */
export function TriageBanner({ outcome }: { outcome: TriageOutcome }) {
  const { t } = useI18n()
  const level = outcome.level
  const style = BANNER[level]
  const Icon = ICON[level]

  return (
    <div className={cn('overflow-hidden rounded-2xl border', style.wrap)} role="status">
      <div className={cn('h-1.5 w-full', style.bar)} aria-hidden />
      <div className="flex items-start gap-4 px-5 py-5 sm:px-6">
        <span
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14',
            style.icon,
          )}
        >
          <Icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-xl font-bold uppercase leading-tight tracking-[-0.01em] sm:text-2xl',
              style.text,
            )}
          >
            {t(`triage.${level}` as 'triage.RED')}
          </p>
          <p className="mt-1.5 text-[0.9375rem] font-medium leading-relaxed text-ink-800">
            {t(`triage.${level}.lead` as 'triage.RED.lead')}
          </p>
        </div>
      </div>
    </div>
  )
}

export function RecommendedAction({ outcome }: { outcome: TriageOutcome }) {
  const { t } = useI18n()
  return (
    <Card className={outcome.level === 'RED' ? 'border-risk-redBorder' : undefined}>
      <CardHeader title={t('triage.action')} icon={<Info className="h-4 w-4" aria-hidden />} />
      <CardBody>
        <p className="text-[1.0625rem] font-semibold leading-relaxed text-ink-900">
          {outcome.assessment.recommendedAction}
        </p>
      </CardBody>
    </Card>
  )
}

export function TriageReasoning({ outcome }: { outcome: TriageOutcome }) {
  const { t } = useI18n()
  const labels = useLabels()

  // Deterministic findings first — they are the auditable part.
  const findings = outcome.findings
  const aiPoints = outcome.assessment.reasoning.filter(
    (r) => !findings.some((f) => r.toLowerCase().includes(f.label.toLowerCase().slice(0, 24))),
  )

  return (
    <Card>
      <CardHeader title={t('triage.why')} icon={<ShieldCheck className="h-4 w-4" aria-hidden />} />
      <CardBody className="space-y-4">
        {findings.length > 0 && (
          <ul className="space-y-2.5">
            {findings.map((f) => (
              <li key={f.code} className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                    f.level === 'RED'
                      ? 'bg-risk-red'
                      : f.level === 'YELLOW'
                        ? 'bg-risk-amber'
                        : 'bg-risk-green',
                  )}
                  aria-hidden
                />
                <span className="min-w-0 text-[0.9375rem] leading-relaxed text-ink-800">
                  {labels.rule(f.code, f.label)}
                  {f.detail && <span className="tabular ml-1 font-semibold">({f.detail})</span>}
                </span>
              </li>
            ))}
          </ul>
        )}

        {aiPoints.length > 0 && (
          <div className={findings.length ? 'hairline pt-4' : ''}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.05em] text-ink-500">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t('phc.reasoning')}
            </p>
            <ul className="space-y-2">
              {aiPoints.map((r, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" aria-hidden />
                  <span className="min-w-0 text-[0.9375rem] leading-relaxed text-ink-700">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {findings.length === 0 && aiPoints.length === 0 && (
          <p className="text-sm text-ink-500">{t('assess.safetyNone')}</p>
        )}
      </CardBody>
    </Card>
  )
}

export function KeyVitals({ vitals }: { vitals: VitalsInput }) {
  const { t } = useI18n()
  const rows = formatVitalsForNote(vitals)
  if (!rows.length) return null

  return (
    <Card>
      <CardHeader title={t('triage.criticalVitals')} />
      <CardBody>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows.map((v) => (
            <div
              key={v.label}
              className={cn(
                'flex items-baseline justify-between gap-3 rounded-xl px-3 py-2',
                v.abnormal ? 'bg-risk-amberSoft' : 'bg-ink-50',
              )}
            >
              <dt className="text-sm text-ink-600">{v.label}</dt>
              <dd
                className={cn(
                  'tabular text-base font-semibold',
                  v.abnormal ? 'text-risk-amber' : 'text-ink-900',
                )}
              >
                {v.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  )
}

export function ClinicalSummary({ outcome }: { outcome: TriageOutcome }) {
  const { t } = useI18n()
  return (
    <Card>
      <CardHeader
        title={t('triage.summary')}
        description={`${t('assess.model')}: ${outcome.assessment.modelName}${
          outcome.assessment.confidence
            ? ` · ${t('assess.confidence')} ${Math.round(outcome.assessment.confidence * 100)}%`
            : ''
        }`}
        icon={<Sparkles className="h-4 w-4" aria-hidden />}
      />
      <CardBody>
        <p className="text-[0.9375rem] leading-relaxed text-ink-800">{outcome.assessment.summary}</p>
      </CardBody>
    </Card>
  )
}

/** Explains when the deterministic engine overrode the model. */
export function SafetyOverrideNotice({ outcome }: { outcome: TriageOutcome }) {
  const { t } = useI18n()
  const labels = useLabels()

  if (outcome.assessment.degraded) {
    return (
      <Notice tone="amber" icon={<AlertTriangle className="h-4 w-4" aria-hidden />}>
        {t('assess.degraded')}
      </Notice>
    )
  }
  if (outcome.safetyOverride && outcome.aiRisk) {
    return (
      <Notice tone="red" icon={<ShieldCheck className="h-4 w-4" aria-hidden />}>
        {t('triage.overrideNotice', { aiRisk: labels.triageShort(outcome.aiRisk) })}
      </Notice>
    )
  }
  return (
    <Notice tone="care" icon={<ShieldCheck className="h-4 w-4" aria-hidden />}>
      {t('triage.aiAgreed')}
      {outcome.aiRisk && (
        <Badge tone="care" className="ml-2 align-middle">
          {labels.triageShort(outcome.aiRisk)}
        </Badge>
      )}
    </Notice>
  )
}
