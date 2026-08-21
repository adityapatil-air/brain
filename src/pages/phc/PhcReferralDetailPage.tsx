import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Inbox,
  Mic,
  Navigation,
  Phone,
  Stethoscope,
} from 'lucide-react'
import { useProfile } from '../../features/auth/AuthProvider'
import { useI18n, useLabels } from '../../i18n/I18nProvider'
import { repo } from '../../services/data'
import { useAsync } from '../../hooks/useAsync'
import { directionsUrl } from '../../services/maps/MapsService'
import type { TriageOutcome } from '../../types/domain'
import { Badge, RiskBadge, StatusBadge } from '../../components/ui/Badge'
import { Button, ButtonLink, ExternalButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader, DataRow, PageHeader } from '../../components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'
import { useAction } from '../../hooks/useAsync'
import {
  ClinicalSummary,
  KeyVitals,
  RecommendedAction,
  SafetyOverrideNotice,
  TriageBanner,
  TriageReasoning,
} from '../../features/triage/TriageResult'
import { ReferralNoteView } from '../../features/referrals/ReferralNoteView'
import { formatAge, formatDateTime } from '../../utils/format'

export function PhcReferralDetailPage() {
  const { id = '' } = useParams()
  const profile = useProfile()
  const { t, lang } = useI18n()
  const labels = useLabels()
  const toast = useToast()

  const state = useAsync(async () => {
    const referral = await repo.getReferral(id)
    if (!referral) return null
    const detail = await repo.getVisitDetail(referral.visit_id)
    return { referral, detail }
  }, [id])

  const update = useAction(async (status: 'acknowledged' | 'reviewed') => {
    await repo.updateReferralStatus(id, status, profile.id)
    toast.success(status === 'acknowledged' ? t('phc.acknowledged') : t('phc.reviewed'))
    state.reload()
  })

  if (state.loading) return <LoadingState />
  if (state.error) return <ErrorState onRetry={state.reload} />
  if (!state.data) {
    return (
      <EmptyState
        icon={<Inbox className="h-6 w-6" aria-hidden />}
        title={t('phc.notFound')}
        action={
          <ButtonLink to="/phc" variant="secondary">
            {t('nav.queue')}
          </ButtonLink>
        }
      />
    )
  }

  const { referral, detail } = state.data
  const member = detail?.member
  const visit = detail?.visit
  const assessment = detail?.assessment

  const vitalsInput = detail?.vitals
    ? {
        temperature: detail.vitals.temperature,
        pulse: detail.vitals.pulse,
        respiratory_rate: detail.vitals.respiratory_rate,
        spo2: detail.vitals.spo2,
        systolic_bp: detail.vitals.systolic_bp,
        diastolic_bp: detail.vitals.diastolic_bp,
        weight: detail.vitals.weight,
        blood_glucose: detail.vitals.blood_glucose,
      }
    : {}

  const outcome: TriageOutcome = {
    level: referral.triage_level,
    aiRisk: assessment?.ai_risk ?? null,
    safetyOverride: assessment?.safety_override ?? false,
    findings: assessment?.safety_findings ?? [],
    assessment: {
      summary: assessment?.ai_summary ?? visit?.clinical_summary ?? referral.reason,
      risk: referral.triage_level,
      reasoning: assessment?.reasoning?.length
        ? assessment.reasoning
        : (visit?.triage_reason ?? referral.reason).split(' · ').filter(Boolean),
      recommendedAction: visit?.recommended_action ?? '',
      referralRequired: true,
      referralUrgency: referral.urgency,
      facilityType: referral.facility_name ?? '',
      referralNote: referral.referral_note,
      confidence: assessment?.confidence ?? 0,
      modelName: assessment?.model_name ?? '—',
    },
  }

  return (
    <>
      <Link
        to="/phc"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t('nav.queue')}
      </Link>

      <PageHeader
        eyebrow={t('phc.detailTitle')}
        title={referral.member.full_name}
        description={`${referral.member.member_code} · ${formatAge(referral.member.age, lang)} · ${labels.gender(
          referral.member.gender,
        )} · ${formatDateTime(referral.created_at, lang)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={referral.status} />
            <RiskBadge level={referral.triage_level} size="sm" />
          </div>
        }
      />

      {/* ------------------------------------------------------ clinician actions */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void update.run('acknowledged')}
              loading={update.pending}
              disabled={referral.status !== 'pending'}
              variant={referral.status === 'pending' ? 'primary' : 'secondary'}
              iconLeft={<Check className="h-4 w-4" aria-hidden />}
            >
              {t('phc.acknowledge')}
            </Button>
            <Button
              onClick={() => void update.run('reviewed')}
              loading={update.pending}
              disabled={referral.status === 'reviewed' || referral.status === 'completed'}
              variant="secondary"
              iconLeft={<CheckCheck className="h-4 w-4" aria-hidden />}
            >
              {t('phc.markReviewed')}
            </Button>
            {referral.asha?.phone && (
              <a
                href={`tel:${referral.asha.phone.replace(/\s/g, '')}`}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-ink-200 bg-surface px-4 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50"
              >
                <Phone className="h-4 w-4" aria-hidden />
                {t('phc.callAsha')}
              </a>
            )}
          </div>
          {update.error && (
            <p className="mt-3 text-sm font-medium text-risk-red">{t('phc.updateFailed')}</p>
          )}
        </CardBody>
      </Card>

      {/* ----------------------------------------------- the clinical picture */}
      <div className="space-y-4">
        <TriageBanner outcome={outcome} />
        <RecommendedAction outcome={outcome} />
        <SafetyOverrideNotice outcome={outcome} />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title={t('referral.patient')} />
            <dl className="divide-y divide-ink-100 px-5 py-2 sm:px-6">
              <DataRow label={t('member.memberId')} value={referral.member.member_code} />
              <DataRow label={t('member.age')} value={formatAge(referral.member.age, lang)} />
              <DataRow label={t('member.gender')} value={labels.gender(referral.member.gender)} />
              <DataRow
                label={t('member.pregnancy')}
                value={labels.pregnancy(referral.member.pregnancy_status)}
              />
              <DataRow label={t('member.village')} value={referral.member.village ?? '—'} />
              {member && (
                <>
                  <DataRow
                    label={t('member.conditions')}
                    value={member.existing_conditions.join(', ') || t('common.none')}
                  />
                  <DataRow
                    label={t('member.allergies')}
                    value={member.allergies.join(', ') || t('common.none')}
                  />
                </>
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader title={t('referral.raisedBy')} icon={<Stethoscope className="h-4 w-4" aria-hidden />} />
            <dl className="divide-y divide-ink-100 px-5 py-2 sm:px-6">
              <DataRow label={t('phc.column.asha')} value={referral.asha?.full_name ?? '—'} />
              <DataRow label={t('profile.code')} value={referral.asha?.asha_code ?? '—'} />
              <DataRow label={t('member.phone')} value={referral.asha?.phone ?? '—'} />
              <DataRow label={t('phc.column.time')} value={formatDateTime(referral.created_at, lang)} />
              <DataRow
                label={t('referral.urgency.urgent')}
                value={<Badge tone={referral.urgency === 'urgent' ? 'red' : 'neutral'}>{labels.urgency(referral.urgency)}</Badge>}
              />
            </dl>
          </Card>
        </div>

        {detail && (
          <Card>
            <CardHeader title={t('visit.step.symptoms')} />
            <CardBody>
              {detail.symptoms.length === 0 ? (
                <p className="text-sm text-ink-500">{t('symptoms.none')}</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {detail.symptoms.map((s) => (
                    <li key={s.id}>
                      <Badge tone={s.severity === 'severe' ? 'red' : 'neutral'}>
                        {labels.symptom(s.symptom_name)}
                        {s.severity && ` · ${labels.severity(s.severity)}`}
                        {s.duration && ` · ${s.duration}`}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        )}

        <KeyVitals vitals={vitalsInput} />

        {visit?.transcript && (
          <Card>
            <CardHeader
              title={t('phc.voiceTranscript')}
              description={
                visit.language === 'hi' ? 'हिन्दी' : visit.language === 'mr' ? 'मराठी' : 'English'
              }
              icon={<Mic className="h-4 w-4" aria-hidden />}
            />
            <CardBody>
              <blockquote className="border-l-2 border-care-300 pl-4 text-[1.0625rem] leading-relaxed text-ink-800">
                {visit.transcript}
              </blockquote>
            </CardBody>
          </Card>
        )}

        <TriageReasoning outcome={outcome} />
        <ClinicalSummary outcome={outcome} />

        {referral.facility_name && (
          <Card>
            <CardHeader title={t('phc.suggestedFacility')} icon={<Navigation className="h-4 w-4" aria-hidden />} />
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900">{referral.facility_name}</p>
                  {referral.facility_address && (
                    <p className="mt-0.5 text-sm text-ink-500">{referral.facility_address}</p>
                  )}
                  {referral.facility_distance != null && (
                    <p className="tabular mt-1 text-xs text-ink-500">
                      {referral.facility_distance} km
                    </p>
                  )}
                </div>
                {referral.facility_latitude != null && referral.facility_longitude != null && (
                  <ExternalButtonLink
                    href={directionsUrl(null, {
                      lat: referral.facility_latitude,
                      lng: referral.facility_longitude,
                    })}
                    variant={referral.triage_level === 'RED' ? 'urgent' : 'primary'}
                    iconLeft={<Navigation className="h-4 w-4" aria-hidden />}
                  >
                    {t('facility.directions')}
                  </ExternalButtonLink>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {member && visit && (
          <ReferralNoteView
            member={member}
            outcome={outcome}
            symptoms={(detail?.symptoms ?? []).map((s) => ({
              symptom_name: s.symptom_name,
              category: s.category,
              severity: s.severity,
              duration: s.duration,
              source: s.source,
            }))}
            vitals={vitalsInput}
            visitDate={new Date(visit.visit_date)}
            ashaName={referral.asha?.full_name ?? null}
            ashaCode={referral.asha?.asha_code ?? null}
            facilityName={referral.facility_name}
            note={referral.referral_note}
            editable={false}
          />
        )}
      </div>
    </>
  )
}
