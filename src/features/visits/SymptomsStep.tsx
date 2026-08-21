import { useState } from 'react'
import { AlertTriangle, Check, Mic, Sparkles, X } from 'lucide-react'
import {
  SYMPTOM_CATALOG,
  type SymptomCategory,
  type SymptomDefinition,
} from '../../../shared/clinical'
import { useI18n, useLabels } from '../../i18n/I18nProvider'
import { useVisitDraft } from '../../store/visitDraft'
import type { Member } from '../../types/domain'
import { Badge } from '../../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Select, TextArea, TextInput } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { cn } from '../../utils/cn'

const CATEGORY_ORDER: SymptomCategory[] = [
  'general',
  'respiratory',
  'gastrointestinal',
  'maternal',
  'child',
]

const CATEGORY_LABEL: Record<SymptomCategory, 'symptoms.category.general' | 'symptoms.category.respiratory' | 'symptoms.category.gastrointestinal' | 'symptoms.category.maternal' | 'symptoms.category.child' | 'symptoms.category.other'> = {
  general: 'symptoms.category.general',
  respiratory: 'symptoms.category.respiratory',
  gastrointestinal: 'symptoms.category.gastrointestinal',
  maternal: 'symptoms.category.maternal',
  child: 'symptoms.category.child',
  other: 'symptoms.category.other',
}

/**
 * Categories are filtered to what is clinically relevant for this patient, so
 * the worker is not scrolling past maternal signs for a 4-year-old.
 */
function relevantCategories(member: Member): SymptomCategory[] {
  return CATEGORY_ORDER.filter((c) => {
    if (c === 'maternal') return member.pregnancy_status !== 'not_applicable' || member.gender === 'female'
    if (c === 'child') return member.age < 12
    return true
  })
}

export function SymptomsStep({ member }: { member: Member }) {
  const { t } = useI18n()
  const labels = useLabels()
  const { draft, patch, toggleSymptom, upsertSymptom } = useVisitDraft()
  const [detailFor, setDetailFor] = useState<SymptomDefinition | null>(null)

  const selected = new Map(draft.symptoms.map((s) => [s.symptom_name, s]))
  const categories = relevantCategories(member)

  const detailDraft = detailFor ? selected.get(detailFor.key) : undefined

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink-900">{t('symptoms.title')}</h2>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">{t('symptoms.subtitle')}</p>
      </div>

      {draft.symptoms.length > 0 && (
        <Card className="border-care-200 bg-care-50/50">
          <CardBody className="py-4">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-care-700">
              {t('symptoms.selected', { count: draft.symptoms.length })}
            </p>
            <ul className="flex flex-wrap gap-2">
              {draft.symptoms.map((s) => {
                const def = SYMPTOM_CATALOG.find((d) => d.key === s.symptom_name)
                return (
                  <li key={s.symptom_name}>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border bg-surface py-1 pl-3 pr-1 text-sm font-medium',
                        def?.danger ? 'border-risk-redBorder text-risk-red' : 'border-care-200 text-care-800',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => def && setDetailFor(def)}
                        className="inline-flex items-center gap-1.5 hover:underline"
                      >
                        {labels.symptom(s.symptom_name)}
                        {s.severity && (
                          <span className="text-xs font-normal text-ink-500">
                            · {labels.severity(s.severity)}
                          </span>
                        )}
                        {s.duration && (
                          <span className="text-xs font-normal text-ink-500">· {s.duration}</span>
                        )}
                        {s.source === 'voice' && <Mic className="h-3 w-3 text-ink-400" aria-hidden />}
                        {s.source === 'ai' && <Sparkles className="h-3 w-3 text-ink-400" aria-hidden />}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSymptom(s.symptom_name, s.category)}
                        aria-label={`${t('common.dismiss')} ${labels.symptom(s.symptom_name)}`}
                        className="rounded-full p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </span>
                  </li>
                )
              })}
            </ul>
          </CardBody>
        </Card>
      )}

      {categories.map((cat) => {
        const items = SYMPTOM_CATALOG.filter((s) => s.category === cat)
        if (!items.length) return null
        return (
          <Card key={cat}>
            <CardHeader
              title={t(CATEGORY_LABEL[cat])}
              icon={cat === 'child' ? <AlertTriangle className="h-4 w-4 text-risk-amber" aria-hidden /> : undefined}
            />
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {items.map((s) => {
                  const on = selected.has(s.key)
                  return (
                    <button
                      key={s.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleSymptom(s.key, s.category)}
                      className={cn(
                        'inline-flex min-h-[2.75rem] items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors',
                        on
                          ? s.danger
                            ? 'border-risk-red bg-risk-redSoft text-risk-red'
                            : 'border-care-600 bg-care-600 text-white'
                          : s.danger
                            ? 'border-risk-redBorder bg-surface text-ink-700 hover:bg-risk-redSoft'
                            : 'border-ink-200 bg-surface text-ink-700 hover:border-care-300 hover:bg-care-50',
                      )}
                    >
                      {on && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                      {labels.symptom(s.key)}
                      {s.danger && !on && (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-risk-amber" aria-hidden />
                      )}
                    </button>
                  )
                })}
              </div>
              {cat === 'child' && (
                <p className="mt-3 text-xs text-ink-500">
                  <AlertTriangle className="mr-1 inline h-3 w-3 text-risk-amber" aria-hidden />
                  {t('symptoms.dangerSign')} — IMNCI
                </p>
              )}
            </CardBody>
          </Card>
        )
      })}

      <Card>
        <CardBody>
          <TextArea
            label={t('symptoms.other')}
            placeholder={t('symptoms.otherPlaceholder')}
            value={draft.otherSymptoms}
            onChange={(e) => patch({ otherSymptoms: e.target.value })}
            rows={3}
          />
        </CardBody>
      </Card>

      {/* -------------------------------------- severity / duration detail */}
      <Modal
        open={detailFor !== null}
        onClose={() => setDetailFor(null)}
        title={detailFor ? t('symptoms.detail', { symptom: labels.symptom(detailFor.key) }) : ''}
        size="sm"
      >
        {detailFor && (
          <div className="space-y-4">
            {detailFor.danger && (
              <Badge tone="red" icon={<AlertTriangle className="h-3 w-3" aria-hidden />}>
                {t('symptoms.dangerSign')}
              </Badge>
            )}
            <Select
              label={t('symptoms.severity')}
              value={detailDraft?.severity ?? ''}
              onChange={(e) =>
                upsertSymptom({
                  symptom_name: detailFor.key,
                  category: detailFor.category,
                  severity: (e.target.value || null) as 'mild' | 'moderate' | 'severe' | null,
                  duration: detailDraft?.duration ?? null,
                  source: detailDraft?.source ?? 'manual',
                })
              }
            >
              <option value="">{t('common.none')}</option>
              <option value="mild">{t('symptoms.severity.mild')}</option>
              <option value="moderate">{t('symptoms.severity.moderate')}</option>
              <option value="severe">{t('symptoms.severity.severe')}</option>
            </Select>
            <TextInput
              label={t('symptoms.duration')}
              placeholder={t('symptoms.durationPlaceholder')}
              value={detailDraft?.duration ?? ''}
              onChange={(e) =>
                upsertSymptom({
                  symptom_name: detailFor.key,
                  category: detailFor.category,
                  severity: detailDraft?.severity ?? null,
                  duration: e.target.value || null,
                  source: detailDraft?.source ?? 'manual',
                })
              }
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
