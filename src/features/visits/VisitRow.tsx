import { Link } from 'react-router-dom'
import { ChevronRight, Send } from 'lucide-react'
import { useI18n, useLabels } from '../../i18n/I18nProvider'
import { Badge, RiskBadge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Misc'
import { formatAge, formatDateTime } from '../../utils/format'
import type { VisitListItem } from '../../types/domain'

/** Compact vitals summary — only the values that matter at a glance. */
export function vitalsSummary(v: VisitListItem['vitals']): string {
  if (!v) return '—'
  const parts: string[] = []
  if (v.temperature != null) parts.push(`${Number(v.temperature).toFixed(1)}°C`)
  if (v.spo2 != null) parts.push(`SpO₂ ${v.spo2}%`)
  if (v.pulse != null) parts.push(`${v.pulse} BPM`)
  if (v.systolic_bp != null && v.diastolic_bp != null) parts.push(`${v.systolic_bp}/${v.diastolic_bp}`)
  return parts.length ? parts.join(' · ') : '—'
}

export function VisitRow({ visit }: { visit: VisitListItem }) {
  const { lang, t } = useI18n()
  const labels = useLabels()

  return (
    <Link
      to={`/asha/visit/${visit.id}`}
      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-ink-50/70 sm:px-6"
    >
      <Avatar name={visit.member.full_name} size="sm" tone={visit.triage_level === 'RED' ? 'red' : 'care'} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-semibold text-ink-900">{visit.member.full_name}</span>
          <span className="text-xs text-ink-500">{formatAge(visit.member.age, lang)}</span>
          {visit.has_referral && (
            <Badge tone="neutral" icon={<Send className="h-3 w-3" aria-hidden />}>
              {t('history.column.referral')}
            </Badge>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-ink-500">
          {formatDateTime(visit.visit_date, lang)} · {labels.visitType(visit.visit_type)}
          {visit.symptom_names.length
            ? ` · ${visit.symptom_names.slice(0, 3).map(labels.symptom).join(', ')}${
                visit.symptom_names.length > 3 ? ` +${visit.symptom_names.length - 3}` : ''
              }`
            : ''}
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="tabular text-xs text-ink-500">{vitalsSummary(visit.vitals)}</p>
      </div>

      {visit.triage_level && <RiskBadge level={visit.triage_level} size="sm" className="shrink-0" />}

      <ChevronRight
        className="h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  )
}
