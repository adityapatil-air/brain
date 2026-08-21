import { Link } from 'react-router-dom'
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Plus,
  Send,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { useProfile } from '../../features/auth/AuthProvider'
import { useI18n } from '../../i18n/I18nProvider'
import { repo } from '../../services/data'
import { useAsync } from '../../hooks/useAsync'
import { Card, CardHeader, PageHeader, SectionHeader } from '../../components/ui/Card'
import { ButtonLink } from '../../components/ui/Button'
import { ActionTile, StatCard } from '../../components/ui/Misc'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { ReferralCard } from '../../features/referrals/ReferralCard'
import { VisitRow } from '../../features/visits/VisitRow'
import { formatDate } from '../../utils/format'

export function AshaDashboardPage() {
  const profile = useProfile()
  const { t, lang } = useI18n()

  const stats = useAsync(() => repo.ashaStats(profile.id), [profile.id])
  const visits = useAsync(() => repo.listVisits({ ashaId: profile.id, limit: 6 }), [profile.id])
  const urgent = useAsync(
    () => repo.listReferrals({ ashaId: profile.id, urgentOnly: true, limit: 4 }),
    [profile.id],
  )

  const pendingUrgent = (urgent.data ?? []).filter(
    (r) => r.status === 'pending' || r.status === 'acknowledged',
  )

  return (
    <>
      <PageHeader
        eyebrow={t('nav.dashboard')}
        title={t('dash.greeting', { name: profile.full_name.split(' ')[0] ?? profile.full_name })}
        description={t('dash.subtitle', {
          village: profile.village ?? profile.district ?? '—',
          date: formatDate(new Date(), lang),
        })}
      />

      {/* --------------------------------------------- primary action first */}
      <Card className="mb-6 overflow-hidden border-care-200 bg-care-50/60">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-care-900">
              {t('dash.startVisit')}
            </h2>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-care-800/80">
              {t('dash.startVisitHint')}
            </p>
          </div>
          <ButtonLink
            to="/asha/visit/new"
            size="xl"
            className="shrink-0"
            iconLeft={<Plus className="h-5 w-5" aria-hidden />}
          >
            {t('dash.startVisit')}
          </ButtonLink>
        </div>
      </Card>

      {/* ----------------------------------------------- clinical alerts */}
      {pendingUrgent.length > 0 && (
        <section className="mb-8">
          <SectionHeader
            title={
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-risk-red" aria-hidden />
                {t('dash.urgentTitle')}
              </span>
            }
            action={
              <Link to="/asha/referrals" className="text-sm font-semibold text-care-700 hover:text-care-800">
                {t('common.viewAll')}
              </Link>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {pendingUrgent.map((r) => (
              <ReferralCard key={r.id} referral={r} to={`/asha/visit/${r.visit_id}`} />
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- statistics */}
      <section className="mb-8">
        <SectionHeader title={t('common.today')} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={t('dash.stat.today')}
            value={stats.loading ? '—' : (stats.data?.todayVisits ?? 0)}
            icon={<Activity className="h-4 w-4" aria-hidden />}
            tone="care"
            to="/asha/history"
          />
          <StatCard
            label={t('dash.stat.followUps')}
            value={stats.loading ? '—' : (stats.data?.pendingFollowUps ?? 0)}
            icon={<CalendarClock className="h-4 w-4" aria-hidden />}
            tone="amber"
            to="/asha/referrals"
          />
          <StatCard
            label={t('dash.stat.highRisk')}
            value={stats.loading ? '—' : (stats.data?.highRiskCases ?? 0)}
            icon={<ShieldAlert className="h-4 w-4" aria-hidden />}
            tone="red"
            to="/asha/history?triage=RED"
          />
          <StatCard
            label={t('dash.stat.completed')}
            value={stats.loading ? '—' : (stats.data?.completed ?? 0)}
            icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
            to="/asha/history"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* ----------------------------------------------- recent visits */}
        <Card>
          <CardHeader
            title={t('dash.recentTitle')}
            action={
              <Link to="/asha/history" className="text-sm font-semibold text-care-700 hover:text-care-800">
                {t('common.viewAll')}
              </Link>
            }
          />
          {visits.loading ? (
            <SkeletonRows rows={4} />
          ) : visits.error ? (
            <ErrorState onRetry={visits.reload} />
          ) : (visits.data ?? []).length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-6 w-6" aria-hidden />}
              title={t('dash.recentEmpty')}
              description={t('dash.recentEmptyHint')}
              action={
                <ButtonLink to="/asha/visit/new" iconLeft={<Plus className="h-4 w-4" aria-hidden />}>
                  {t('dash.startVisit')}
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {(visits.data ?? []).map((v) => (
                <li key={v.id}>
                  <VisitRow visit={v} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ----------------------------------------------- quick actions */}
        <div>
          <SectionHeader title={t('dash.quickActions')} />
          <div className="space-y-3">
            <ActionTile
              to="/asha/members"
              title={t('dash.viewMembers')}
              description={t('members.title')}
              icon={<Users className="h-5 w-5" aria-hidden />}
            />
            <ActionTile
              to="/asha/history"
              title={t('dash.visitHistory')}
              description={t('nav.visits')}
              icon={<ClipboardList className="h-5 w-5" aria-hidden />}
            />
            <ActionTile
              to="/asha/referrals"
              title={t('dash.viewReferrals')}
              description={t('nav.referrals')}
              icon={<Send className="h-5 w-5" aria-hidden />}
            />
          </div>
        </div>
      </div>
    </>
  )
}
