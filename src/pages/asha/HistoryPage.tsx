import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClipboardList, Plus, Search } from 'lucide-react'
import type { TriageLevel } from '../../../shared/clinical'
import { useProfile } from '../../features/auth/AuthProvider'
import { useI18n, useLabels } from '../../i18n/I18nProvider'
import { repo } from '../../services/data'
import { useAsync } from '../../hooks/useAsync'
import { Card, PageHeader } from '../../components/ui/Card'
import { ButtonLink } from '../../components/ui/Button'
import { TextInput } from '../../components/ui/Field'
import { FilterTabs } from '../../components/ui/Misc'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { VisitRow } from '../../features/visits/VisitRow'

type Filter = 'all' | TriageLevel | 'referred'

export function HistoryPage() {
  const profile = useProfile()
  const { t } = useI18n()
  const labels = useLabels()
  const [params, setParams] = useSearchParams()

  const initial = (params.get('triage') as Filter | null) ?? 'all'
  const [filter, setFilter] = useState<Filter>(
    ['all', 'RED', 'YELLOW', 'GREEN', 'referred'].includes(initial) ? initial : 'all',
  )
  const [query, setQuery] = useState('')

  const state = useAsync(
    () => repo.listVisits({ ashaId: profile.role === 'asha' ? profile.id : undefined }),
    [profile.id],
  )
  const visits = state.data ?? []

  const counts = useMemo(
    () => ({
      all: visits.length,
      RED: visits.filter((v) => v.triage_level === 'RED').length,
      YELLOW: visits.filter((v) => v.triage_level === 'YELLOW').length,
      GREEN: visits.filter((v) => v.triage_level === 'GREEN').length,
      referred: visits.filter((v) => v.has_referral).length,
    }),
    [visits],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return visits.filter((v) => {
      if (filter === 'referred' && !v.has_referral) return false
      if (filter !== 'all' && filter !== 'referred' && v.triage_level !== filter) return false
      if (!q) return true
      const haystack = [
        v.member.full_name,
        v.member.member_code,
        v.member.village ?? '',
        ...v.symptom_names.map(labels.symptom),
        ...v.symptom_names,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [visits, filter, query, labels])

  const changeFilter = (next: Filter) => {
    setFilter(next)
    const nextParams = new URLSearchParams(params)
    if (next === 'all') nextParams.delete('triage')
    else nextParams.set('triage', next)
    setParams(nextParams, { replace: true })
  }

  return (
    <>
      <PageHeader
        eyebrow={t('nav.visits')}
        title={t('history.title')}
        description={t('history.subtitle', { count: visits.length })}
        action={
          <ButtonLink to="/asha/visit/new" iconLeft={<Plus className="h-4 w-4" aria-hidden />}>
            {t('dash.startVisit')}
          </ButtonLink>
        }
      />

      <div className="mb-5 space-y-3">
        <div className="max-w-md">
          <TextInput
            label={t('common.search')}
            placeholder={t('history.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            iconLeft={<Search className="h-4 w-4" aria-hidden />}
            type="search"
          />
        </div>
        <FilterTabs
          label={t('history.title')}
          value={filter}
          onChange={changeFilter}
          options={[
            { value: 'all', label: t('common.all'), count: counts.all },
            { value: 'RED', label: t('triage.RED.short'), count: counts.RED },
            { value: 'YELLOW', label: t('triage.YELLOW.short'), count: counts.YELLOW },
            { value: 'GREEN', label: t('triage.GREEN.short'), count: counts.GREEN },
            { value: 'referred', label: t('history.filter.referred'), count: counts.referred },
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
            icon={<ClipboardList className="h-6 w-6" aria-hidden />}
            title={visits.length === 0 ? t('dash.recentEmpty') : t('history.empty')}
            description={visits.length === 0 ? t('dash.recentEmptyHint') : t('history.emptyHint')}
            action={
              <ButtonLink to="/asha/visit/new" iconLeft={<Plus className="h-4 w-4" aria-hidden />}>
                {t('dash.startVisit')}
              </ButtonLink>
            }
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {filtered.map((v) => (
              <li key={v.id}>
                <VisitRow visit={v} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
