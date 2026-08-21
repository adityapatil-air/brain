import { useMemo, useState } from 'react'
import { Send } from 'lucide-react'
import { useProfile } from '../../features/auth/AuthProvider'
import { useI18n } from '../../i18n/I18nProvider'
import { repo } from '../../services/data'
import { useAsync } from '../../hooks/useAsync'
import { Card, PageHeader } from '../../components/ui/Card'
import { FilterTabs } from '../../components/ui/Misc'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { ReferralCard } from '../../features/referrals/ReferralCard'

type Filter = 'all' | 'pending' | 'urgent'

export function AshaReferralsPage() {
  const profile = useProfile()
  const { t } = useI18n()
  const [filter, setFilter] = useState<Filter>('all')

  const state = useAsync(() => repo.listReferrals({ ashaId: profile.id }), [profile.id])
  const referrals = state.data ?? []

  const counts = useMemo(
    () => ({
      all: referrals.length,
      pending: referrals.filter((r) => r.status === 'pending').length,
      urgent: referrals.filter((r) => r.urgency === 'urgent').length,
    }),
    [referrals],
  )

  const filtered = referrals.filter((r) => {
    if (filter === 'pending') return r.status === 'pending'
    if (filter === 'urgent') return r.urgency === 'urgent'
    return true
  })

  return (
    <>
      <PageHeader
        eyebrow={t('nav.referrals')}
        title={t('nav.referrals')}
        description={t('history.subtitle', { count: referrals.length })}
      />

      <FilterTabs
        className="mb-5"
        label={t('nav.referrals')}
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('phc.filterAll'), count: counts.all },
          { value: 'pending', label: t('phc.filterPending'), count: counts.pending },
          { value: 'urgent', label: t('phc.filterUrgent'), count: counts.urgent },
        ]}
      />

      {state.loading ? (
        <Card>
          <SkeletonRows rows={4} />
        </Card>
      ) : state.error ? (
        <Card>
          <ErrorState onRetry={state.reload} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Send className="h-6 w-6" aria-hidden />}
            title={t('member.referralsEmpty')}
            description={t('phc.queueEmptyHint')}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => (
            <ReferralCard key={r.id} referral={r} to={`/asha/visit/${r.visit_id}`} />
          ))}
        </div>
      )}
    </>
  )
}
