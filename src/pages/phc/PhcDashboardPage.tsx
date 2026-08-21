import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  CalendarClock,
  ChevronRight,
  Clock,
  Inbox,
  Radio,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react'
import { useProfile } from '../../features/auth/AuthProvider'
import { useI18n, useLabels } from '../../i18n/I18nProvider'
import { repo } from '../../services/data'
import { useAsync } from '../../hooks/useAsync'
import { RiskBadge, StatusBadge } from '../../components/ui/Badge'
import { Card, CardHeader, PageHeader, SectionHeader } from '../../components/ui/Card'
import { Avatar, FilterTabs, StatCard } from '../../components/ui/Misc'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'
import { formatAge, formatDate, relativeTime } from '../../utils/format'
import { cn } from '../../utils/cn'

type Filter = 'all' | 'pending' | 'urgent'

export function PhcDashboardPage() {
  const profile = useProfile()
  const { t, lang } = useI18n()
  const labels = useLabels()
  const toast = useToast()

  const [filter, setFilter] = useState<Filter>('all')

  const stats = useAsync(() => repo.phcStats(), [])
  const queue = useAsync(() => repo.listReferrals({}), [])

  // Realtime (or polling) push of new referrals from the field.
  const seenUrgent = useRef<Set<string> | null>(null)
  useEffect(() => {
    const unsubscribe = repo.subscribeReferrals(() => {
      queue.reload()
      stats.reload()
    })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Announce genuinely new urgent referrals, once each.
  useEffect(() => {
    const rows = queue.data
    if (!rows) return
    const urgentIds = rows.filter((r) => r.triage_level === 'RED').map((r) => r.id)
    if (seenUrgent.current === null) {
      seenUrgent.current = new Set(urgentIds)
      return
    }
    for (const r of rows) {
      if (r.triage_level === 'RED' && !seenUrgent.current.has(r.id)) {
        seenUrgent.current.add(r.id)
        toast.urgent(t('phc.newReferral', { name: r.member.full_name }), r.reason)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.data])

  const rows = queue.data ?? []

  const counts = useMemo(
    () => ({
      all: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      urgent: rows.filter((r) => r.urgency === 'urgent').length,
    }),
    [rows],
  )

  const filtered = useMemo(() => {
    const list = rows.filter((r) => {
      if (filter === 'pending') return r.status === 'pending'
      if (filter === 'urgent') return r.urgency === 'urgent'
      return true
    })
    // RED first, then newest — a doctor should never have to hunt for the
    // urgent case.
    const weight = { RED: 0, YELLOW: 1, GREEN: 2 } as const
    return [...list].sort(
      (a, b) =>
        weight[a.triage_level] - weight[b.triage_level] || b.created_at.localeCompare(a.created_at),
    )
  }, [rows, filter])

  const urgentOpen = rows.filter(
    (r) => r.triage_level === 'RED' && (r.status === 'pending' || r.status === 'acknowledged'),
  )

  return (
    <>
      <PageHeader
        eyebrow={t('nav.queue')}
        title={t('phc.title')}
        description={t('phc.subtitle', {
          name: profile.full_name,
          date: formatDate(new Date(), lang),
        })}
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-care-200 bg-care-50 px-3 py-1.5 text-xs font-semibold text-care-700">
            <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden />
            {t('phc.liveUpdates')}
          </span>
        }
      />

      <section className="mb-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={t('phc.stat.today')}
            value={stats.loading ? '—' : (stats.data?.todayVisits ?? 0)}
            icon={<Activity className="h-4 w-4" aria-hidden />}
            tone="care"
          />
          <StatCard
            label={t('phc.stat.pending')}
            value={stats.loading ? '—' : (stats.data?.pendingReview ?? 0)}
            icon={<Inbox className="h-4 w-4" aria-hidden />}
            tone="amber"
          />
          <StatCard
            label={t('phc.stat.urgent')}
            value={stats.loading ? '—' : (stats.data?.urgentReferrals ?? 0)}
            icon={<ShieldAlert className="h-4 w-4" aria-hidden />}
            tone="red"
          />
          <StatCard
            label={t('phc.stat.followUps')}
            value={stats.loading ? '—' : (stats.data?.followUps ?? 0)}
            icon={<CalendarClock className="h-4 w-4" aria-hidden />}
          />
        </div>
      </section>

      {/* --------------------------------------------- urgent, front and centre */}
      {urgentOpen.length > 0 && (
        <section className="mb-8">
          <SectionHeader
            title={
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-risk-red" aria-hidden />
                {t('phc.stat.urgent')}
              </span>
            }
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {urgentOpen.map((r) => (
              <Link
                key={r.id}
                to={`/phc/referral/${r.id}`}
                className="group block rounded-2xl border border-risk-redBorder bg-risk-redSoft/50 p-4 transition-shadow hover:shadow-raised"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={r.member.full_name} tone="red" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[0.9375rem] font-semibold text-ink-900">
                        {r.member.full_name}
                      </span>
                      <span className="text-xs text-ink-600">
                        {formatAge(r.member.age, lang)} · {labels.gender(r.member.gender)}
                      </span>
                      <RiskBadge level={r.triage_level} size="sm" />
                    </div>
                    <p className="mt-1.5 text-sm font-medium leading-relaxed text-ink-800">{r.reason}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                        {relativeTime(r.created_at, lang)}
                      </span>
                      {r.asha && (
                        <span className="inline-flex items-center gap-1">
                          <Stethoscope className="h-3.5 w-3.5" aria-hidden />
                          {r.asha.full_name}
                        </span>
                      )}
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-risk-red transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ referral queue */}
      <FilterTabs
        className="mb-4"
        label={t('phc.queue')}
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('phc.filterAll'), count: counts.all },
          { value: 'pending', label: t('phc.filterPending'), count: counts.pending },
          { value: 'urgent', label: t('phc.filterUrgent'), count: counts.urgent },
        ]}
      />

      <Card>
        <CardHeader title={t('phc.queue')} description={`${filtered.length}`} />

        {queue.loading ? (
          <SkeletonRows rows={6} />
        ) : queue.error ? (
          <ErrorState onRetry={queue.reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-6 w-6" aria-hidden />}
            title={t('phc.queueEmpty')}
            description={t('phc.queueEmptyHint')}
          />
        ) : (
          <>
            <div className="hidden items-center gap-4 border-b border-ink-100 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.05em] text-ink-400 lg:flex">
              <span className="w-52">{t('phc.column.patient')}</span>
              <span className="w-16">{t('phc.column.age')}</span>
              <span className="w-36">{t('phc.column.asha')}</span>
              <span className="w-20">{t('phc.column.risk')}</span>
              <span className="flex-1">{t('phc.column.reason')}</span>
              <span className="w-24">{t('phc.column.time')}</span>
              <span className="w-28">{t('phc.column.status')}</span>
              <span className="w-4" />
            </div>

            <ul className="divide-y divide-ink-100">
              {filtered.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/phc/referral/${r.id}`}
                    className={cn(
                      'group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-ink-50/70 sm:px-6',
                      r.triage_level === 'RED' && 'bg-risk-redSoft/30 hover:bg-risk-redSoft/50',
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3 lg:w-52 lg:flex-none">
                      <Avatar
                        name={r.member.full_name}
                        size="sm"
                        tone={r.triage_level === 'RED' ? 'red' : 'care'}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {r.member.full_name}
                        </p>
                        <p className="truncate text-xs text-ink-500">
                          {r.member.member_code}
                          {r.member.village ? ` · ${r.member.village}` : ''}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-ink-600 lg:hidden">{r.reason}</p>
                      </div>
                    </div>

                    <span className="hidden w-16 text-sm text-ink-600 lg:block">
                      {formatAge(r.member.age, lang)}
                    </span>
                    <span className="hidden w-36 truncate text-sm text-ink-600 lg:block">
                      {r.asha?.full_name ?? '—'}
                    </span>
                    <span className="hidden w-20 lg:block">
                      <RiskBadge level={r.triage_level} size="sm" />
                    </span>
                    <span className="hidden flex-1 lg:block">
                      <span className="line-clamp-2 text-sm text-ink-700">{r.reason}</span>
                    </span>
                    <span className="hidden w-24 text-xs text-ink-500 lg:block">
                      {relativeTime(r.created_at, lang)}
                    </span>
                    <span className="hidden w-28 lg:block">
                      <StatusBadge status={r.status} />
                    </span>

                    <span className="flex shrink-0 items-center gap-2 lg:hidden">
                      <RiskBadge level={r.triage_level} size="sm" />
                    </span>

                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  )
}
