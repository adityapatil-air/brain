import { useEffect, useState } from 'react'
import { Check, Copy, FileText, MapPin, Pencil, Printer } from 'lucide-react'
import type { VitalsInput } from '../../../shared/clinical'
import { useI18n, useLabels } from '../../i18n/I18nProvider'
import { buildReferralNoteText, formatVitalsForNote } from '../../services/visits/referralNote'
import type { Member, TriageOutcome } from '../../types/domain'
import type { DraftSymptom } from '../../services/data/types'
import { Badge, RiskBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { TextArea } from '../../components/ui/Field'
import { formatAge, formatDate } from '../../utils/format'
import { cn } from '../../utils/cn'

function NoteBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-ink-400">{label}</p>
      <div className="mt-1 text-[0.9375rem] leading-relaxed text-ink-900">{children}</div>
    </div>
  )
}

export function ReferralNoteView({
  member,
  outcome,
  symptoms,
  vitals,
  visitDate,
  ashaName,
  ashaCode,
  facilityName,
  note,
  onNoteChange,
  editable = true,
}: {
  member: Member
  outcome: TriageOutcome
  symptoms: DraftSymptom[]
  vitals: VitalsInput
  visitDate: Date
  ashaName?: string | null
  ashaCode?: string | null
  facilityName?: string | null
  /** The (possibly edited) note text. When null the generated text is used. */
  note: string | null
  onNoteChange?: (text: string | null) => void
  editable?: boolean
}) {
  const { t, lang } = useI18n()
  const labels = useLabels()

  const generated = buildReferralNoteText({
    member,
    outcome,
    symptoms,
    vitals,
    visitDate,
    ashaName,
    ashaCode,
    facilityName,
    symptomLabel: labels.symptom,
  })

  const text = note ?? generated
  const [editing, setEditing] = useState(false)
  const [buffer, setBuffer] = useState(text)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!editing) setBuffer(text)
  }, [text, editing])

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(id)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Clipboard can be blocked; fall back to selecting the text.
      const el = document.getElementById('referral-note-text')
      if (el) {
        const range = document.createRange()
        range.selectNodeContents(el)
        window.getSelection()?.removeAllRanges()
        window.getSelection()?.addRange(range)
      }
    }
  }

  const vitalRows = formatVitalsForNote(vitals)

  return (
    <Card className="print-sheet">
      <CardHeader
        className="no-print"
        title={t('referral.noteTitle')}
        icon={<FileText className="h-4 w-4" aria-hidden />}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void copy()}
              iconLeft={
                copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />
              }
            >
              {copied ? t('common.copied') : t('common.copy')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.print()}
              iconLeft={<Printer className="h-3.5 w-3.5" aria-hidden />}
            >
              {t('common.print')}
            </Button>
            {editable && onNoteChange && (
              <Button
                size="sm"
                variant={editing ? 'primary' : 'secondary'}
                onClick={() => {
                  if (editing) {
                    onNoteChange(buffer.trim() === generated.trim() ? null : buffer)
                    setEditing(false)
                  } else {
                    setEditing(true)
                  }
                }}
                iconLeft={
                  editing ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Pencil className="h-3.5 w-3.5" aria-hidden />
                }
              >
                {editing ? t('common.done') : t('referral.editNote')}
              </Button>
            )}
          </div>
        }
      />

      <CardBody>
        {editing ? (
          <TextArea
            label={t('referral.noteTitle')}
            value={buffer}
            onChange={(e) => setBuffer(e.target.value)}
            rows={20}
            className="font-mono text-[0.8125rem] leading-relaxed"
          />
        ) : (
          <>
            {/* Structured, scannable rendering for the screen. */}
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 pb-4">
                <div>
                  <p className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-ink-400">
                    {t('referral.noteTitle')}
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-[-0.01em] text-ink-900">
                    {member.full_name}
                  </p>
                  <p className="text-sm text-ink-500">
                    {formatAge(member.age, lang)} · {labels.gender(member.gender)} · {member.member_code}
                    {member.pregnancy_status !== 'not_applicable' &&
                      ` · ${labels.pregnancy(member.pregnancy_status)}`}
                  </p>
                </div>
                <RiskBadge level={outcome.level} full />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <NoteBlock label={t('referral.visit')}>
                  {labels.visitType('home_visit')} · {formatDate(visitDate, lang)}
                  {member.village && ` · ${member.village}`}
                </NoteBlock>

                {facilityName && (
                  <NoteBlock label={t('referral.facility')}>
                    <span className="inline-flex items-start gap-1.5">
                      <MapPin className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden />
                      {facilityName}
                    </span>
                  </NoteBlock>
                )}
              </div>

              <NoteBlock label={t('referral.concerns')}>
                {symptoms.length === 0 ? (
                  <span className="text-ink-400">{t('common.none')}</span>
                ) : (
                  <ul className="space-y-1">
                    {symptoms.map((s) => (
                      <li key={s.symptom_name}>
                        • {labels.symptom(s.symptom_name)}
                        {s.severity && ` (${labels.severity(s.severity)})`}
                        {s.duration && `, ${s.duration}`}
                      </li>
                    ))}
                  </ul>
                )}
              </NoteBlock>

              {vitalRows.length > 0 && (
                <NoteBlock label={t('referral.vitals')}>
                  <dl className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                    {vitalRows.map((v) => (
                      <div key={v.label} className="flex items-baseline justify-between gap-3">
                        <dt className="text-ink-500">{v.label}</dt>
                        <dd
                          className={cn(
                            'tabular font-semibold',
                            v.abnormal ? 'text-risk-red' : 'text-ink-900',
                          )}
                        >
                          {v.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </NoteBlock>
              )}

              {(member.existing_conditions.length > 0 || member.allergies.length > 0) && (
                <div className="grid gap-5 sm:grid-cols-2">
                  {member.existing_conditions.length > 0 && (
                    <NoteBlock label={t('member.conditions')}>
                      {member.existing_conditions.join(', ')}
                    </NoteBlock>
                  )}
                  {member.allergies.length > 0 && (
                    <NoteBlock label={t('member.allergies')}>{member.allergies.join(', ')}</NoteBlock>
                  )}
                </div>
              )}

              <NoteBlock label={t('referral.reason')}>
                <ul className="space-y-1">
                  {outcome.assessment.reasoning.slice(0, 5).map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </NoteBlock>

              <div className="rounded-xl bg-ink-50 px-4 py-3">
                <NoteBlock label={t('referral.action')}>
                  <span className="font-semibold">{outcome.assessment.recommendedAction}</span>
                </NoteBlock>
              </div>

              {outcome.assessment.referralNote?.trim() && (
                <NoteBlock label={t('phc.aiSummary')}>
                  {outcome.assessment.referralNote.trim()}
                </NoteBlock>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
                {ashaName ? (
                  <p className="text-sm text-ink-500">
                    {t('referral.raisedBy')}:{' '}
                    <span className="font-medium text-ink-800">
                      {ashaName}
                      {ashaCode ? ` (${ashaCode})` : ''}
                    </span>
                  </p>
                ) : (
                  <span />
                )}
                <Badge tone="neutral">{labels.urgency(outcome.assessment.referralUrgency)}</Badge>
              </div>

              <p className="text-xs text-ink-400">{t('app.disclaimer')}</p>
            </div>

            {/* Plain-text copy target, kept out of the visual flow. */}
            <pre id="referral-note-text" className="sr-only">
              {text}
            </pre>
          </>
        )}
      </CardBody>
    </Card>
  )
}
