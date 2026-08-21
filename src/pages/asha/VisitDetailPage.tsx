import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Mic, Navigation, Plus } from 'lucide-react'
import { useAuth } from '../../features/auth/AuthProvider'
import { useI18n, useLabels } from '../../i18n/I18nProvider'
import { repo } from '../../services/data'
import { useAsync } from '../../hooks/useAsync'
import { directionsUrl } from '../../services/maps/MapsService'
import type { TriageOutcome } from '../../types/domain'
import { Badge, RiskBadge, StatusBadge } from '../../components/ui/Badge'
import { ButtonLink, ExternalButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader, PageHeader } from '../../components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import {
  ClinicalSummary,
  KeyVitals,
  RecommendedAction,
  TriageBanner,
  TriageReasoning,
} from '../../features/triage/TriageResult'
import { ReferralNoteView } from '../../features/referrals/ReferralNoteView'
import { formatAge, formatDateTime } from '../../utils/format'

export function VisitDetailPage() {
  const { id = '' } = useParams()
  const { profile } = useAuth()
  const { t, lang } = useI18n()
  const labels = useLabels()

  const state = useAsync(() => repo.getVisitDetail(id), [id])

  if (state.loading) return <LoadingState />
  if (state.error) return <ErrorState onRetry={state.reload} />
  if (!state.data) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-6 w-6" aria-hidden />}
        title={t('error.notFound')}
        description={t('error.notFoundHint')}
        action={
          <ButtonLink to={profile?.role === 'phc_doctor' ? '/phc' : '/asha'} variant="secondary">
            {t('error.goHome')}
          </ButtonLink>
        }
      />
    )
  }

  const { visit, member, symptoms, vitals, assessment, referral, asha } = state.data
  const isAsha = profile?.role === 'asha'

  // Reconstruct the triage outcome so the same components render saved visits.
  const outcome: TriageOutcome | null = visit.triage_level
    ? {
        level: visit.triage_level,
        aiRisk: assessment?.ai_risk ?? null,
        safetyOverride: assessment?.safety_override ?? false,
        findings: assessment?.safety_findings ?? [],
        assessment: {
          summary: assessment?.ai_summary ?? visit.clinical_summary ?? '',
          risk: visit.triage_level,
          reasoning: assessment?.reasoning?.length
            ? assessment.reasoning
            : (visit.triage_reason ?? '').split(' · ').filter(Boolean),
          recommendedAction: visit.recommended_action ?? '',
          referralRequired: visit.referral_required,
          referralUrgency: visit.referral_urgency ?? 'routine',
          facilityType: referral?.facility_name ?? '',
          referralNote: referral?.referral_note ?? '',
          confidence: assessment?.confidence ?? 0,
          modelName: assessment?.model_name ?? '—',
        },
      }
    : null

  const vitalsInput = vitals
    ? {
        temperature: vitals.temperature,
        pulse: vitals.pulse,
        respiratory_rate: vitals.respiratory_rate,
        spo2: vitals.spo2,
        systolic_bp: vitals.systolic_bp,
        diastolic_bp: vitals.diastolic_bp,
        weight: vitals.weight,
        blood_glucose: vitals.blood_glucose,
      }
    : {}

  return (
    <>
      <Link
        to={isAsha ? '/asha/history' : '/phc'}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {isAsha ? t('nav.visits') : t('nav.queue')}
      </Link>

      <PageHeader
        eyebrow={labels.visitType(visit.visit_type)}
        title={member.full_name}
        description={`${member.member_code} · ${formatAge(member.age, lang)} · ${labels.gender(
          member.gender,
        )} · ${formatDateTime(visit.visit_date, lang)}`}
        action={
          isAsha ? (
            <ButtonLink
              to={`/asha/visit/new?member=${member.id}`}
              variant="secondary"
              iconLeft={<Plus className="h-4 w-4" aria-hidden />}
            >
              {t('dash.startVisit')}
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="space-y-4">
        {outcome ? (
          <>
            <TriageBanner outcome={outcome} />
            <RecommendedAction outcome={outcome} />
            <TriageReasoning outcome={outcome} />
          </>
        ) : (
          <Card>
            <CardBody>
              <p className="text-sm text-ink-500">{t('assess.noData')}</p>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader title={t('visit.step.symptoms')} />
          <CardBody>
            {symptoms.length === 0 ? (
              <p className="text-sm text-ink-500">{t('symptoms.none')}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {symptoms.map((s) => (
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

        <KeyVitals vitals={vitalsInput} />

        {visit.transcript && (
          <Card>
            <CardHeader
              title={t('phc.voiceTranscript')}
              description={`${t('voice.language')}: ${
                visit.language === 'hi' ? 'हिन्दी' : visit.language === 'mr' ? 'मराठी' : 'English'
              }`}
              icon={<Mic className="h-4 w-4" aria-hidden />}
            />
            <CardBody>
              <blockquote className="border-l-2 border-care-300 pl-4 text-[1.0625rem] leading-relaxed text-ink-800">
                {visit.transcript}
              </blockquote>
            </CardBody>
          </Card>
        )}

        {outcome && <ClinicalSummary outcome={outcome} />}

        {referral && outcome && (
          <>
            <Card>
              <CardHeader
                title={t('referral.title')}
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={referral.status} />
                    <RiskBadge level={referral.triage_level} size="sm" />
                  </div>
                }
              />
              <CardBody className="space-y-3">
                <p className="text-sm leading-relaxed text-ink-700">{referral.reason}</p>
                {referral.facility_name && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-900">{referral.facility_name}</p>
                      {referral.facility_address && (
                        <p className="mt-0.5 text-xs text-ink-500">{referral.facility_address}</p>
                      )}
                    </div>
                    {referral.facility_latitude != null && referral.facility_longitude != null && (
                      <ExternalButtonLink
                        href={directionsUrl(null, {
                          lat: referral.facility_latitude,
                          lng: referral.facility_longitude,
                        })}
                        size="sm"
                        variant={referral.triage_level === 'RED' ? 'urgent' : 'primary'}
                        iconLeft={<Navigation className="h-3.5 w-3.5" aria-hidden />}
                      >
                        {t('facility.directions')}
                      </ExternalButtonLink>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>

            <ReferralNoteView
              member={member}
              outcome={outcome}
              symptoms={symptoms.map((s) => ({
                symptom_name: s.symptom_name,
                category: s.category,
                severity: s.severity,
                duration: s.duration,
                source: s.source,
              }))}
              vitals={vitalsInput}
              visitDate={new Date(visit.visit_date)}
              ashaName={asha?.full_name ?? null}
              ashaCode={asha?.asha_code ?? null}
              facilityName={referral.facility_name}
              note={referral.referral_note}
              editable={false}
            />
          </>
        )}
      </div>
    </>
  )
}
