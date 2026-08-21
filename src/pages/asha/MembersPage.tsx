import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Search, ShieldAlert, Users } from 'lucide-react'
import { useProfile } from '../../features/auth/AuthProvider'
import { useI18n, useLabels } from '../../i18n/I18nProvider'
import { repo } from '../../services/data'
import { useAsync } from '../../hooks/useAsync'
import { Card, PageHeader } from '../../components/ui/Card'
import { Badge, RiskBadge } from '../../components/ui/Badge'
import { TextInput } from '../../components/ui/Field'
import { Avatar, FilterTabs } from '../../components/ui/Misc'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { formatAge, formatDate } from '../../utils/format'
import type { Member, TriageLevel } from '../../types/domain'

type Filter = 'all' | 'pregnant' | 'postnatal' | 'child' | 'chronic' | 'highRisk'

interface Row {
  member: Member
  lastVisitDate: string | null
  lastTriage: TriageLevel | null
}

export function MembersPage() {
  const profile = useProfile()
  const { t, lang } = useI18n()
  const labels = useLabels()

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const state = useAsync(async () => {
    const [members, visits] = await Promise.all([
      repo.listMembers(profile),
      repo.listVisits({ ashaId: profile.role === 'asha' ? profile.id : undefined }),
    ])
    const byMember = new Map<string, { date: string; triage: TriageLevel | null }>()
    for (const v of visits) {
      const prev = byMember.get(v.member_id)
      if (!prev || v.visit_date > prev.date) {
        byMember.set(v.member_id, { date: v.visit_date, triage: v.triage_level })
      }
    }
    return members.map<Row>((m) => ({
      member: m,
      lastVisitDate: byMember.get(m.id)?.date ?? null,
      lastTriage: byMember.get(m.id)?.triage ?? null,
    }))
  }, [profile.id])

  const rows = state.data ?? []

  const counts = useMemo(
    () => ({
      all: rows.length,
      pregnant: rows.filter((r) => r.member.health_category === 'pregnant').length,
      postnatal: rows.filter((r) => r.member.health_category === 'postnatal').length,
      child: rows.filter((r) => r.member.health_category === 'child').length,
      chronic: rows.filter((r) => r.member.health_category === 'chronic').length,
      highRisk: rows.filter((r) => r.member.high_risk).length,
    }),
    [rows],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(({ member }) => {
      if (filter === 'highRisk' && !member.high_risk) return false
      if (filter !== 'all' && filter !== 'highRisk' && member.health_category !== filter) return false
      if (!q) return true
      return `${member.full_name} ${member.member_code} ${member.village ?? ''} ${member.phone ?? ''}`
        .toLowerCase()
        .includes(q)
    })
  }, [rows, query, filter])

  return (
    <>
      <PageHeader
        eyebrow={t('nav.members')}
        title={t('members.title')}
        description={t('members.subtitle', { count: rows.length })}
      />

      <div className="mb-5 space-y-3">
        <div className="max-w-md">
          <TextInput
            label={t('common.search')}
            placeholder={t('members.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            iconLeft={<Search className="h-4 w-4" aria-hidden />}
            type="search"
          />
        </div>
        <FilterTabs
          label={t('members.filter.all')}
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('members.filter.all'), count: counts.all },
            { value: 'pregnant', label: t('members.filter.pregnant'), count: counts.pregnant },
            { value: 'postnatal', label: t('members.filter.postnatal'), count: counts.postnatal },
            { value: 'child', label: t('members.filter.child'), count: counts.child },
            { value: 'chronic', label: t('members.filter.chronic'), count: counts.chronic },
            { value: 'highRisk', label: t('members.filter.highRisk'), count: counts.highRisk },
          ]}
        />
      </div>

      <Card>
        {state.loading ? (
          <SkeletonRows rows={6} />
        ) : state.error ? (
          <ErrorState onRetry={state.reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" aria-hidden />}
            title={t('members.empty')}
            description={t('members.emptyHint')}
          />
        ) : (
          <>
            {/* Column headers only make sense once there is room for them. */}
            <div className="hidden items-center gap-4 border-b border-ink-100 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.05em] text-ink-400 lg:flex">
              <span className="flex-1">{t('members.column.member')}</span>
              <span className="w-32">{t('members.column.category')}</span>
              <span className="w-28">{t('members.column.village')}</span>
              <span className="w-28">{t('members.column.lastVisit')}</span>
              <span className="w-24 text-right">{t('members.column.risk')}</span>
              <span className="w-4" />
            </div>

            <ul className="divide-y divide-ink-100">
              {filtered.map(({ member, lastVisitDate, lastTriage }) => (
                <li key={member.id}>
                  <Link
                    to={`/asha/member/${member.id}`}
                    className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-ink-50/70 sm:px-6"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={member.full_name} tone={member.high_risk ? 'red' : 'care'} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-ink-900">
                            {member.full_name}
                          </span>
                          {member.high_risk && (
                            <Badge tone="red" icon={<ShieldAlert className="h-3 w-3" aria-hidden />}>
                              {t('members.highRisk')}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-ink-500">
                          {formatAge(member.age, lang)} · {labels.gender(member.gender)} ·{' '}
                          {member.member_code}
                        </p>
                        <p className="mt-1 text-xs text-ink-500 lg:hidden">
                          {labels.category(member.health_category)}
                          {member.village ? ` · ${member.village}` : ''}
                          {' · '}
                          {lastVisitDate ? formatDate(lastVisitDate, lang) : t('members.neverVisited')}
                        </p>
                      </div>
                    </div>

                    <span className="hidden w-32 text-sm text-ink-600 lg:block">
                      {labels.category(member.health_category)}
                    </span>
                    <span className="hidden w-28 truncate text-sm text-ink-600 lg:block">
                      {member.village ?? '—'}
                    </span>
                    <span className="hidden w-28 text-sm text-ink-600 lg:block">
                      {lastVisitDate ? formatDate(lastVisitDate, lang) : '—'}
                    </span>
                    <span className="hidden w-24 justify-end lg:flex">
                      {lastTriage ? <RiskBadge level={lastTriage} size="sm" /> : <span className="text-sm text-ink-400">—</span>}
                    </span>
                    {lastTriage && (
                      <RiskBadge level={lastTriage} size="sm" className="shrink-0 lg:hidden" />
                    )}
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
