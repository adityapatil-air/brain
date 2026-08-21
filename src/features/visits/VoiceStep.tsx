import { useState } from 'react'
import { AlertCircle, Check, HelpCircle, Plus, Sparkles } from 'lucide-react'
import { SYMPTOM_CATALOG, type ExtractionResult } from '../../../shared/clinical'
import { useI18n, useLabels } from '../../i18n/I18nProvider'
import { ClinicalAIService } from '../../services/ai/ClinicalAIService'
import { useVisitDraft } from '../../store/visitDraft'
import type { Member } from '../../types/domain'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Notice, ProgressBar } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'
import { VoiceRecorder } from '../voice/VoiceRecorder'

export function VoiceStep({ member }: { member: Member }) {
  const { t } = useI18n()
  const labels = useLabels()
  const toast = useToast()
  const { draft, patch, upsertSymptom, parsedVitals } = useVisitDraft()

  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState(false)

  const extraction = draft.extraction

  const runExtraction = async () => {
    if (!draft.transcript.trim()) return
    setExtracting(true)
    setExtractError(false)
    try {
      const result = await ClinicalAIService.extractSymptoms({
        transcript: draft.transcript,
        language: draft.language,
        patient: {
          full_name: member.full_name,
          age: member.age,
          gender: member.gender,
          pregnancy_status: member.pregnancy_status,
          health_category: member.health_category,
          existing_conditions: member.existing_conditions,
          allergies: member.allergies,
        },
        existingSymptoms: draft.symptoms.map((s) => s.symptom_name),
        vitals: parsedVitals,
      })
      patch({ extraction: result })
    } catch {
      setExtractError(true)
    } finally {
      setExtracting(false)
    }
  }

  const addAll = (result: ExtractionResult) => {
    const severity =
      result.severity === 'mild' || result.severity === 'moderate' || result.severity === 'severe'
        ? result.severity
        : null
    let added = 0
    for (const key of result.symptoms) {
      const def = SYMPTOM_CATALOG.find((d) => d.key === key)
      if (!def) continue
      const existing = draft.symptoms.find((s) => s.symptom_name === key)
      upsertSymptom({
        symptom_name: key,
        category: def.category,
        severity: existing?.severity ?? severity,
        duration: existing?.duration ?? (result.duration || null),
        source: existing?.source === 'manual' ? 'manual' : 'ai',
      })
      if (!existing) added++
    }
    toast.success(t('voice.added'), added ? `${added}` : undefined)
  }

  const newSymptoms = (extraction?.symptoms ?? []).filter(
    (k) => !draft.symptoms.some((s) => s.symptom_name === k),
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink-900">{t('voice.title')}</h2>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">{t('voice.subtitle')}</p>
      </div>

      <Card>
        <CardBody>
          <VoiceRecorder
            language={draft.language}
            onLanguageChange={(language) => patch({ language })}
            transcript={draft.transcript}
            onTranscriptChange={(transcript) => patch({ transcript })}
            accepted={draft.transcriptAccepted}
            simulated={draft.transcriptSimulated}
            onAccept={(text, simulated) =>
              patch({ transcript: text, transcriptAccepted: true, transcriptSimulated: simulated })
            }
            onReset={() =>
              patch({
                transcript: '',
                transcriptAccepted: false,
                transcriptSimulated: false,
                extraction: null,
              })
            }
          />
        </CardBody>
      </Card>

      {/* ----------------------------------------------- Gemini extraction */}
      {draft.transcriptAccepted && draft.transcript.trim().length > 2 && (
        <Card>
          <CardHeader
            title={t('voice.detected')}
            description={t('assess.model')}
            icon={<Sparkles className="h-4 w-4" aria-hidden />}
            action={
              <Button
                size="sm"
                variant={extraction ? 'secondary' : 'primary'}
                loading={extracting}
                onClick={() => void runExtraction()}
              >
                {extracting ? t('voice.extracting') : extraction ? t('common.retry') : t('voice.extract')}
              </Button>
            }
          />
          <CardBody className="space-y-4">
            {extracting && (
              <div role="status" aria-live="polite">
                <p className="mb-2 text-sm font-medium text-ink-600">{t('voice.extracting')}</p>
                <ProgressBar />
              </div>
            )}

            {extractError && (
              <Notice tone="amber" icon={<AlertCircle className="h-4 w-4" aria-hidden />}>
                {t('voice.extractFailed')}
              </Notice>
            )}

            {extraction && !extracting && (
              <>
                {extraction.degraded && (
                  <Notice tone="amber" icon={<AlertCircle className="h-4 w-4" aria-hidden />}>
                    {t('assess.degraded')}
                  </Notice>
                )}

                {extraction.symptoms.length === 0 ? (
                  <p className="text-sm text-ink-500">{t('voice.detectedNone')}</p>
                ) : (
                  <ul className="space-y-2">
                    {extraction.symptoms.map((key) => {
                      const already = draft.symptoms.some((s) => s.symptom_name === key)
                      const def = SYMPTOM_CATALOG.find((d) => d.key === key)
                      return (
                        <li
                          key={key}
                          className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 px-3.5 py-2.5"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Check
                              className={`h-4 w-4 shrink-0 ${already ? 'text-care-600' : 'text-ink-300'}`}
                              aria-hidden
                            />
                            <span className="truncate text-sm font-medium text-ink-900">
                              {labels.symptom(key)}
                            </span>
                            {def?.danger && (
                              <Badge tone="red">{t('symptoms.dangerSign')}</Badge>
                            )}
                          </span>
                          {already ? (
                            <Badge tone="care">{t('facility.selected')}</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                def &&
                                upsertSymptom({
                                  symptom_name: key,
                                  category: def.category,
                                  severity:
                                    extraction.severity === 'mild' ||
                                    extraction.severity === 'moderate' ||
                                    extraction.severity === 'severe'
                                      ? extraction.severity
                                      : null,
                                  duration: extraction.duration || null,
                                  source: 'ai',
                                })
                              }
                              iconLeft={<Plus className="h-3.5 w-3.5" aria-hidden />}
                            >
                              {t('common.save')}
                            </Button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  {extraction.duration && (
                    <div className="rounded-xl bg-ink-50 px-3.5 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-ink-500">
                        {t('voice.duration')}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-ink-900">{extraction.duration}</p>
                    </div>
                  )}
                  {extraction.severity && extraction.severity !== 'unclear' && (
                    <div className="rounded-xl bg-ink-50 px-3.5 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-ink-500">
                        {t('voice.severity')}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-ink-900">
                        {labels.severity(extraction.severity)}
                      </p>
                    </div>
                  )}
                </div>

                {extraction.additional_observations.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.05em] text-ink-500">
                      {t('voice.observations')}
                    </p>
                    <ul className="space-y-1">
                      {extraction.additional_observations.map((o, i) => (
                        <li key={i} className="text-sm leading-relaxed text-ink-700">
                          · {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {extraction.missing_information.length > 0 && (
                  <div className="rounded-xl border border-care-200 bg-care-50/60 px-3.5 py-3">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.05em] text-care-700">
                      <HelpCircle className="h-3.5 w-3.5" aria-hidden />
                      {t('voice.missingInfo')}
                    </p>
                    <ul className="space-y-1">
                      {extraction.missing_information.map((m, i) => (
                        <li key={i} className="text-sm leading-relaxed text-care-900">
                          · {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {newSymptoms.length > 0 && (
                  <Button
                    fullWidth
                    onClick={() => addAll(extraction)}
                    iconLeft={<Plus className="h-4 w-4" aria-hidden />}
                  >
                    {t('voice.addAll')} ({newSymptoms.length})
                  </Button>
                )}
              </>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
