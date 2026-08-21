import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  HeartPulse,
  Phone,
  Plus,
  Send,
  ShieldAlert,
  UserRound,
} from 'lucide-react'
import { useProfile } from '../../features/auth/AuthProvider'
import { useI18n, useLabels } from '../../i18n/I18nProvider'
import { repo } from '../../services/data'
import { useAsync } from '../../hooks/useAsync'
import { useVisitDraft } from '../../store/visitDraft'
import { Card, CardHeader, DataRow, PageHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { ReferralCard } from '../../features/referrals/ReferralCard'
import { VisitRow } from '../../features/visits/VisitRow'
import { formatAge } from '../../utils/format'

export function MemberProfilePage() {
  const { id = '' } = useParams()
  const profile = useProfile()
  const { t, lang } = useI18n()
  const labels = useLabels()
  const navigate = useNavigate()
  const { reset } = useVisitDraft()

  const state = useAsync(async () => {
    const member = await repo.getMember(id)
    if (!member) return null
    const [visits, referrals] = await Promise.all([
      repo.listVisits({ memberId: id }),
      repo.listReferrals({ memberId: id }),
    ])
    return { member, visits, referrals }
  }, [id])

  if (state.loading) return <LoadingState />
  if (state.error) return <ErrorState onRetry={state.reload} />
  if (!state.data) {
    return (
      <EmptyState
        icon={<UserRound className="h-6 w-6" aria-hidden />}
        title={t('member.notFound')}
        action={
          <Link to="/asha/members">
            <Button variant="secondary">{t('nav.members')}</Button>
          </Link>
        }
      />
    )
  }

  const { member, visits, referrals } = state.data

  const startVisit = () => {
    reset(member.id)
    navigate('/asha/visit/new')
  }

  return (
    <>
      <Link
        to="/asha/members"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t('nav.members')}
      </Link>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {member.full_name}
            {member.high_risk && (
              <Badge tone="red" icon={<ShieldAlert className="h-3.5 w-3.5" aria-hidden />}>
                {t('members.highRisk')}
              </Badge>
            )}
          </span>
        }
        description={`${member.member_code} · ${formatAge(member.age, lang)} · ${labels.gender(member.gender)}${
          member.village ? ` · ${member.village}` : ''
        }`}
        action={
          profile.role === 'asha' ? (
            <Button size="lg" onClick={startVisit} iconLeft={<Plus className="h-4 w-4" aria-hidden />}>
              {t('dash.startVisit')}
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* --------------------------------------------------- left column */}
        <div className="space-y-6">
          <Card>
            <CardHeader title={t('member.personal')} icon={<UserRound className="h-4 w-4" aria-hidden />} />
            <dl className="divide-y divide-ink-100 px-5 py-2 sm:px-6">
              <DataRow label={t('member.memberId')} value={member.member_code} />
              <DataRow label={t('member.age')} value={formatAge(member.age, lang)} />
              <DataRow label={t('member.gender')} value={labels.gender(member.gender)} />
              <DataRow
                label={t('member.phone')}
                value={
                  member.phone ? (
                    <a
                      href={`tel:${member.phone.replace(/\s/g, '')}`}
                      className="inline-flex items-center gap-1.5 text-care-700 hover:text-care-800"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden />
                      {member.phone}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <DataRow label={t('member.village')} value={member.village ?? '—'} />
              <DataRow label={t('member.address')} value={member.address ?? '—'} />
            </dl>
          </Card>

          <Card>
            <CardHeader title={t('member.health')} icon={<HeartPulse className="h-4 w-4" aria-hidden />} />
            <dl className="divide-y divide-ink-100 px-5 py-2 sm:px-6">
              <DataRow label={t('member.category')} value={labels.category(member.health_category)} />
              <DataRow label={t('member.pregnancy')} value={labels.pregnancy(member.pregnancy_status)} />
              <DataRow
                label={t('member.conditions')}
                value={
                  member.existing_conditions.length ? (
                    <span className="flex flex-wrap justify-end gap-1.5">
                      {member.existing_conditions.map((c) => (
                        <Badge key={c} tone="neutral">
                          {c}
                        </Badge>
                      ))}
                    </span>
                  ) : (
                    t('common.none')
                  )
                }
              />
              <DataRow
                label={t('member.allergies')}
                value={
                  member.allergies.length ? (
                    <span className="flex flex-wrap justify-end gap-1.5">
                      {member.allergies.map((a) => (
                        <Badge key={a} tone="amber" icon={<AlertTriangle className="h-3 w-3" aria-hidden />}>
                          {a}
                        </Badge>
                      ))}
                    </span>
                  ) : (
                    t('common.none')
                  )
                }
              />
            </dl>
          </Card>
        </div>

        {/* -------------------------------------------------- right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title={t('member.previousVisits')}
              description={`${visits.length}`}
              icon={<ClipboardList className="h-4 w-4" aria-hidden />}
            />
            {visits.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-6 w-6" aria-hidden />}
                title={t('member.previousVisitsEmpty')}
                action={
                  profile.role === 'asha' ? (
                    <Button onClick={startVisit} iconLeft={<Plus className="h-4 w-4" aria-hidden />}>
                      {t('dash.startVisit')}
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {visits.map((v) => (
                  <li key={v.id}>
                    <VisitRow visit={v} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Send className="h-4 w-4 text-care-600" aria-hidden />
              <h2 className="text-base font-semibold text-ink-900">{t('member.referrals')}</h2>
            </div>
            {referrals.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Send className="h-6 w-6" aria-hidden />}
                  title={t('member.referralsEmpty')}
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {referrals.map((r) => (
                  <ReferralCard key={r.id} referral={r} to={`/asha/visit/${r.visit_id}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
