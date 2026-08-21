import { Link } from 'react-router-dom'
import { Clock, MapPin, Stethoscope } from 'lucide-react'
import { useI18n, useLabels } from '../../i18n/I18nProvider'
import { Badge, RiskBadge, StatusBadge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Misc'
import { formatAge, formatDistance, relativeTime } from '../../utils/format'
import type { ReferralListItem } from '../../types/domain'
import { cn } from '../../utils/cn'

export function ReferralCard({
  referral,
  to,
  showAsha = false,
  className,
}: {
  referral: ReferralListItem
  to: string
  showAsha?: boolean
  className?: string
}) {
  const { lang } = useI18n()
  const labels = useLabels()
  const urgent = referral.triage_level === 'RED'

  return (
    <Link
      to={to}
      className={cn(
        'group block rounded-2xl border bg-surface p-4 shadow-card transition-shadow hover:shadow-raised',
        urgent ? 'border-risk-redBorder' : 'border-ink-100',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar name={referral.member.full_name} tone={urgent ? 'red' : 'care'} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-ink-900">
              {referral.member.full_name}
            </span>
            <span className="text-xs text-ink-500">
              {formatAge(referral.member.age, lang)} · {labels.gender(referral.member.gender)}
            </span>
            <RiskBadge level={referral.triage_level} size="sm" />
          </div>

          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-600">{referral.reason}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {relativeTime(referral.created_at, lang)}
            </span>
            {referral.facility_name && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">
                  {referral.facility_name}
                  {referral.facility_distance != null && ` · ${formatDistance(referral.facility_distance)}`}
                </span>
              </span>
            )}
            {showAsha && referral.asha && (
              <span className="inline-flex items-center gap-1">
                <Stethoscope className="h-3.5 w-3.5" aria-hidden />
                {referral.asha.full_name}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={referral.status} />
            <Badge tone={urgent ? 'red' : 'neutral'}>{labels.urgency(referral.urgency)}</Badge>
          </div>
        </div>
      </div>
    </Link>
  )
}
