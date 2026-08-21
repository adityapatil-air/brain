import { useState } from 'react'
import { AlertCircle, Brain, ClipboardCheck, ShieldCheck, Stethoscope } from 'lucide-react'
import { useI18n, useLabels } from '../../i18n/I18nProvider'
import { runTriage } from '../../services/ai/ClinicalAIService'
import { runSafetyEngine } from '../../services/triage/ClinicalSafetyEngine'
import { formatVitalsForNote } from '../../services/visits/referralNote'
import { useVisitDraft } from '../../store/visitDraft'
import type { Member, TriageOutcome } from '../../types/domain'
import { Badge, RiskBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Notice, ProgressBar } from '../../components/ui/States'
import { formatAge } from '../../utils/format'

type Stage = 'safety' | 'ai' | 'triage' | null

export function AssessmentStep({
  member,
  onComplete,
}: {
  member: Member
  onComplete: (outcome: TriageOutcome) => void
}) {
  const { t, lang } = useI18n()
  const labels = useLabels()
  const { draft, patch, parsedVitals } = useVisitDraft()

  const [stage, setStage] = useState<Stage>(null)
  const [error, setError] = useState(false)

  const vitalRows = formatVitalsForNote(parsedVitals)
  const canAssess = draft.symptoms.length > 0 || vitalRows.length > 0

  // Preview of what the deterministic engine already sees — this runs locally
  // and instantly, before any model call.
  const preview = runSafetyEngine({
    age: member.age,
    pregnancyStatus: member.pregnancy_status,
    symptoms: draft.symptoms.map((s) => ({ symptom_name: s.symptom_name, severity: s.severity })),
    vitals: parsedVitals,
  })

  const run = async () => {
    setError(false)
    try {
      const outcome = await runTriage({
        patient: {
          full_name: member.full_name,
          age: member.age,
          gender: member.gender,
          pregnancy_status: member.pregnancy_status,
          health_category: member.health_category,
          existing_conditions: member.existing_conditions,
          allergies: member.allergies,
        },
        visit: {
          visit_type: draft.visitType,
          visit_date: new Date().toISOString(),
          language: draft.language,
        },
        symptoms: draft.symptoms,
        vitals: parsedVitals,
        transcript: draft.transcript.trim() || null,
        onStage: setStage,
      })
      patch({ outcome, referralNote: null })
      onComplete(outcome)
    } catch {
      setError(true)
    } finally {
      setStage(null)
    }
  }

  const stageLabel =
    stage === 'safety'
      ? t('assess.step.safety')
      : stage === 'ai'
        ? t('assess.step.ai')
        : stage === 'triage'
          ? t('assess.step.triage')
          : null

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink-900">{t('assess.title')}</h2>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">{t('assess.subtitle')}</p>
      </div>

      {/* ------------------------------------------------------ review card */}
      <Card>
        <CardHeader
          title={t('assess.summaryReview')}
          icon={<ClipboardCheck className="h-4 w-4" aria-hidden />}
        />
        <CardBody className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-ink-500">
              {t('referral.patient')}
            </p>
            <p className="mt-1 text-sm font-medium text-ink-900">
              {member.full_name} · {formatAge(member.age, lang)} · {labels.gender(member.gender)}
              {member.pregnancy_status !== 'not_applicable' &&
                ` · ${labels.pregnancy(member.pregnancy_status)}`}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-ink-500">
              {t('visit.step.symptoms')}
            </p>
            {draft.symptoms.length === 0 ? (
              <p className="mt-1 text-sm text-ink-400">{t('symptoms.none')}</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {draft.symptoms.map((s) => (
                  <li key={s.symptom_name}>
                    <Badge tone="neutral">
                      {labels.symptom(s.symptom_name)}
                      {s.severity && ` · ${labels.severity(s.severity)}`}
                      {s.duration && ` · ${s.duration}`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            {draft.otherSymptoms.trim() && (
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{draft.otherSymptoms}</p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-ink-500">
              {t('visit.step.vitals')}
            </p>
            {vitalRows.length === 0 ? (
              <p className="mt-1 text-sm text-ink-400">{t('vitals.none')}</p>
            ) : (
              <dl className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {vitalRows.map((v) => (
                  <div key={v.label} className="flex items-baseline justify-between gap-3">
                    <dt className="text-sm text-ink-500">{v.label}</dt>
                    <dd
                      className={`tabular text-sm font-semibold ${
                        v.abnormal ? 'text-risk-amber' : 'text-ink-900'
                      }`}
                    >
                      {v.value}
                      {v.abnormal && <span className="ml-1 text-xs font-medium">!</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {draft.transcript.trim() && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.05em] text-ink-500">
                {t('voice.transcript')}
              </p>
              <p className="mt-1.5 rounded-xl bg-ink-50 px-3.5 py-3 text-sm leading-relaxed text-ink-700">
                “{draft.transcript}”
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ------------------------------------------ deterministic preview */}
      <Card className={preview.hasCritical ? 'border-risk-redBorder' : undefined}>
        <CardHeader
          title={t('assess.safetyRules')}
          icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
          action={preview.findings.length > 0 ? <RiskBadge level={preview.floor} size="sm" /> : undefined}
        />
        <CardBody>
          {preview.findings.length === 0 ? (
            <p className="text-sm text-ink-500">{t('assess.safetyNone')}</p>
          ) : (
            <ul className="space-y-2">
              {preview.findings.map((f) => (
                <li key={f.code} className="flex items-start gap-2.5">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      f.level === 'RED' ? 'bg-risk-red' : f.level === 'YELLOW' ? 'bg-risk-amber' : 'bg-risk-green'
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0 text-sm leading-relaxed text-ink-800">
                    {labels.rule(f.code, f.label)}
                    {f.detail && <span className="tabular ml-1 font-semibold">({f.detail})</span>}
                    {f.critical && (
                      <Badge tone="red" className="ml-2 align-middle">
                        {t('triage.RED.short')}
                      </Badge>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {!canAssess && (
        <Notice tone="amber" icon={<AlertCircle className="h-4 w-4" aria-hidden />}>
          {t('assess.noData')}
        </Notice>
      )}

      {error && (
        <Notice tone="red" icon={<AlertCircle className="h-4 w-4" aria-hidden />}>
          {t('assess.failed')}
        </Notice>
      )}

      {stage ? (
        <Card className="border-care-200 bg-care-50/50">
          <CardBody>
            <div role="status" aria-live="polite" className="space-y-3">
              <p className="flex items-center gap-2.5 text-sm font-semibold text-care-800">
                {stage === 'ai' ? (
                  <Brain className="h-4 w-4 animate-pulse" aria-hidden />
                ) : (
                  <Stethoscope className="h-4 w-4 animate-pulse" aria-hidden />
                )}
                {stageLabel}
              </p>
              <ProgressBar />
              <ol className="space-y-1 text-xs text-care-800/70">
                <li className={stage === 'safety' ? 'font-semibold' : ''}>1 · {t('assess.step.safety')}</li>
                <li className={stage === 'ai' ? 'font-semibold' : ''}>2 · {t('assess.step.ai')}</li>
                <li className={stage === 'triage' ? 'font-semibold' : ''}>3 · {t('assess.step.triage')}</li>
              </ol>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Button
          size="xl"
          fullWidth
          disabled={!canAssess}
          onClick={() => void run()}
          iconLeft={<Stethoscope className="h-5 w-5" aria-hidden />}
        >
          {draft.outcome ? t('assess.rerun') : t('assess.run')}
        </Button>
      )}
    </div>
  )
}
