import { AlertTriangle } from 'lucide-react'
import { VITAL_SPECS, type VitalsInput } from '../../../shared/clinical'
import { useI18n } from '../../i18n/I18nProvider'
import type { TKey } from '../../i18n/translations'
import { useVisitDraft, type VitalKey } from '../../store/visitDraft'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { FieldShell } from '../../components/ui/Field'
import { Badge } from '../../components/ui/Badge'
import { cn } from '../../utils/cn'

const LABEL_KEY: Record<keyof VitalsInput, TKey> = {
  temperature: 'vitals.temperature',
  pulse: 'vitals.pulse',
  respiratory_rate: 'vitals.respiratory_rate',
  spo2: 'vitals.spo2',
  systolic_bp: 'vitals.systolic_bp',
  diastolic_bp: 'vitals.diastolic_bp',
  weight: 'vitals.weight',
  blood_glucose: 'vitals.blood_glucose',
}

interface VitalFieldState {
  abnormal: boolean
  outOfRange: boolean
}

function evaluate(key: VitalKey, raw: string | undefined): VitalFieldState {
  const spec = VITAL_SPECS.find((s) => s.key === key)!
  if (!raw || raw.trim() === '') return { abnormal: false, outOfRange: false }
  const num = Number(raw)
  if (!Number.isFinite(num)) return { abnormal: false, outOfRange: true }
  return {
    outOfRange: num < spec.min || num > spec.max,
    abnormal: num < spec.normal[0] || num > spec.normal[1],
  }
}

function VitalInput({ vitalKey }: { vitalKey: VitalKey }) {
  const { t } = useI18n()
  const { draft, setVital } = useVisitDraft()
  const spec = VITAL_SPECS.find((s) => s.key === vitalKey)!
  const raw = draft.vitals[vitalKey] ?? ''
  const { abnormal, outOfRange } = evaluate(vitalKey, raw)

  const id = `vital-${vitalKey}`

  return (
    <FieldShell
      label={t(LABEL_KEY[vitalKey])}
      htmlFor={id}
      error={
        outOfRange
          ? t('vitals.outOfRange', { min: spec.min, max: spec.max, unit: spec.unit })
          : undefined
      }
      hint={
        !outOfRange
          ? t('vitals.normalRange', { min: spec.normal[0], max: spec.normal[1], unit: spec.unit })
          : undefined
      }
    >
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={spec.step}
          min={spec.min}
          max={spec.max}
          value={raw}
          onChange={(e) => setVital(vitalKey, e.target.value)}
          aria-invalid={outOfRange || undefined}
          aria-describedby={abnormal ? `${id}-abnormal` : undefined}
          className={cn(
            'tabular h-12 w-full rounded-xl border bg-surface pl-3.5 pr-20 text-lg font-semibold text-ink-900 transition-colors placeholder:font-normal placeholder:text-ink-300',
            outOfRange
              ? 'border-risk-red bg-risk-redSoft/40'
              : abnormal
                ? 'border-risk-amber bg-risk-amberSoft/50'
                : 'border-ink-200 hover:border-ink-300 focus:border-care-500',
          )}
          placeholder="—"
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-500">
          {spec.unit}
        </span>
      </div>
      {abnormal && !outOfRange && (
        <p
          id={`${id}-abnormal`}
          className="flex items-center gap-1.5 text-sm font-semibold text-risk-amber"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {t('vitals.abnormal')}
        </p>
      )}
    </FieldShell>
  )
}

export function VitalsStep() {
  const { t } = useI18n()
  const { draft, parsedVitals } = useVisitDraft()

  const recorded = Object.keys(parsedVitals).length
  const anyAbnormal = VITAL_SPECS.some((s) => evaluate(s.key, draft.vitals[s.key]).abnormal)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink-900">{t('vitals.title')}</h2>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">{t('vitals.subtitle')}</p>
      </div>

      <Card>
        <CardHeader
          title={t('vitals.title')}
          action={
            <div className="flex items-center gap-2">
              {anyAbnormal && (
                <Badge tone="amber" icon={<AlertTriangle className="h-3 w-3" aria-hidden />}>
                  {t('vitals.abnormal')}
                </Badge>
              )}
              <Badge tone={recorded ? 'care' : 'neutral'}>{t('vitals.recorded', { count: recorded })}</Badge>
            </div>
          }
        />
        <CardBody className="space-y-5">
          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
            <VitalInput vitalKey="temperature" />
            <VitalInput vitalKey="spo2" />
            <VitalInput vitalKey="pulse" />
            <VitalInput vitalKey="respiratory_rate" />
          </div>

          <div className="hairline pt-5">
            <p className="mb-3 text-sm font-medium text-ink-700">{t('vitals.bloodPressure')}</p>
            <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <VitalInput vitalKey="systolic_bp" />
              <VitalInput vitalKey="diastolic_bp" />
            </div>
          </div>

          <div className="hairline grid gap-x-5 gap-y-5 pt-5 sm:grid-cols-2">
            <VitalInput vitalKey="weight" />
            <VitalInput vitalKey="blood_glucose" />
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
