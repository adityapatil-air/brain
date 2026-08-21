import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Navigation,
  Save,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useProfile } from '../../features/auth/AuthProvider'
import { useI18n, useLabels } from '../../i18n/I18nProvider'
import { repo } from '../../services/data'
import { useAsync } from '../../hooks/useAsync'
import { useVisitDraft } from '../../store/visitDraft'
import { buildReferralReason, buildReferralNoteText } from '../../services/visits/referralNote'
import type { FacilityResult } from '../../services/maps/MapsService'
import type { Member, VisitType } from '../../types/domain'
import { Badge, RiskBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody } from '../../components/ui/Card'
import { Select, TextInput } from '../../components/ui/Field'
import { Avatar } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Modal'
import { EmptyState, ErrorState, LoadingState, Notice } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'
import { StepIndicator, VISIT_STEPS } from '../../features/visits/StepIndicator'
import { SymptomsStep } from '../../features/visits/SymptomsStep'
import { VoiceStep } from '../../features/visits/VoiceStep'
import { VitalsStep } from '../../features/visits/VitalsStep'
import { AssessmentStep } from '../../features/visits/AssessmentStep'
import {
  ClinicalSummary,
  KeyVitals,
  RecommendedAction,
  SafetyOverrideNotice,
  TriageBanner,
  TriageReasoning,
} from '../../features/triage/TriageResult'
import { FacilityFinder } from '../../features/hospitals/FacilityFinder'
import { ReferralNoteView } from '../../features/referrals/ReferralNoteView'
import { formatAge, formatDate } from '../../utils/format'
import { cn } from '../../utils/cn'

const VISIT_TYPES: VisitType[] = ['home_visit', 'follow_up', 'antenatal', 'postnatal', 'child_check']

export function NewVisitPage() {
  const profile = useProfile()
  const { t, lang } = useI18n()
  const labels = useLabels()
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const { draft, patch, reset, parsedVitals } = useVisitDraft()

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [memberQuery, setMemberQuery] = useState('')

  const membersState = useAsync(() => repo.listMembers(profile), [profile.id])
  const members = membersState.data ?? []

  // ?member=<id> pre-selects the patient (used from the member profile).
  const preselect = params.get('member')
  const memberId = draft.memberId ?? preselect ?? null
  const member = useMemo<Member | null>(
    () => members.find((m) => m.id === memberId) ?? null,
    [members, memberId],
  )

  const step = Math.min(draft.step, VISIT_STEPS.length - 1)
  const outcome = draft.outcome
  const needsReferral = Boolean(outcome && outcome.level !== 'GREEN')

  const maxReachable = !member ? 0 : outcome ? (needsReferral ? 6 : 5) : 4

  const goto = (index: number) => patch({ step: Math.max(0, Math.min(index, VISIT_STEPS.length - 1)) })

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) =>
      `${m.full_name} ${m.member_code} ${m.village ?? ''}`.toLowerCase().includes(q),
    )
  }, [members, memberQuery])

  // ------------------------------------------------------------------- save
  const save = async () => {
    if (!member || !outcome) return
    setSaving(true)
    setSaveError(false)
    try {
      const facility = draft.facility
      const noteText =
        draft.referralNote ??
        buildReferralNoteText({
          member,
          outcome,
          symptoms: draft.symptoms,
          vitals: parsedVitals,
          visitDate: new Date(),
          ashaName: profile.full_name,
          ashaCode: profile.asha_code,
          facilityName: facility?.name ?? null,
          symptomLabel: labels.symptom,
        })

      const symptoms = [...draft.symptoms]
      if (draft.otherSymptoms.trim()) {
        symptoms.push({
          symptom_name: draft.otherSymptoms.trim().slice(0, 120),
          category: 'other',
          severity: null,
          duration: null,
          source: 'manual',
        })
      }

      const result = await repo.saveVisit({
        memberId: member.id,
        ashaId: profile.id,
        visitType: draft.visitType,
        language: draft.language,
        transcript: draft.transcript.trim() || null,
        symptoms,
        vitals: parsedVitals,
        outcome,
        referral: needsReferral
          ? {
              reason: buildReferralReason(outcome),
              note: noteText,
              facility: facility
                ? {
                    id: facility.source === 'directory' ? facility.id : null,
                    name: facility.name,
                    address: facility.address,
                    latitude: facility.latitude,
                    longitude: facility.longitude,
                    distanceKm: facility.distance_km || null,
                  }
                : null,
            }
          : null,
      })

      toast.success(t('visit.saved'), needsReferral ? t('referral.sent') : t('visit.savedHint'))
      reset()
      navigate(`/asha/visit/${result.visitId}`, { replace: true })
    } catch {
      setSaveError(true)
      toast.error(t('visit.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (membersState.loading) return <LoadingState />
  if (membersState.error) return <ErrorState onRetry={membersState.reload} />

  // ------------------------------------------------------------- step body
  const body = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink-900">
                {t('visit.selectMember')}
              </h2>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">
                {t('visit.selectMemberHint')}
              </p>
            </div>

            {member ? (
              <Card className="border-care-200 bg-care-50/50">
                <CardBody>
                  <div className="flex flex-wrap items-center gap-4">
                    <Avatar name={member.full_name} size="lg" tone={member.high_risk ? 'red' : 'care'} />
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold tracking-[-0.01em] text-ink-900">
                        {member.full_name}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-600">
                        {member.member_code} · {formatAge(member.age, lang)} ·{' '}
                        {labels.gender(member.gender)}
                        {member.village && ` · ${member.village}`}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone="care">{labels.category(member.health_category)}</Badge>
                        {member.pregnancy_status !== 'not_applicable' && (
                          <Badge tone="care">{labels.pregnancy(member.pregnancy_status)}</Badge>
                        )}
                        {member.high_risk && <Badge tone="red">{t('members.highRisk')}</Badge>}
                        {member.existing_conditions.map((c) => (
                          <Badge key={c} tone="neutral">
                            {c}
                          </Badge>
                        ))}
                        {member.allergies.map((a) => (
                          <Badge key={a} tone="amber">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="secondary" onClick={() => patch({ memberId: null })}>
                      {t('common.edit')}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <Card>
                <CardBody className="space-y-4">
                  <TextInput
                    label={t('common.search')}
                    placeholder={t('members.searchPlaceholder')}
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    iconLeft={<Search className="h-4 w-4" aria-hidden />}
                    type="search"
                  />
                  {filteredMembers.length === 0 ? (
                    <EmptyState
                      icon={<UserRound className="h-6 w-6" aria-hidden />}
                      title={t('members.empty')}
                      description={t('members.emptyHint')}
                    />
                  ) : (
                    <ul className="scrollbar-slim max-h-96 divide-y divide-ink-100 overflow-y-auto">
                      {filteredMembers.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => patch({ memberId: m.id })}
                            className="flex w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-ink-50"
                          >
                            <Avatar name={m.full_name} tone={m.high_risk ? 'red' : 'care'} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink-900">
                                {m.full_name}
                              </span>
                              <span className="block truncate text-xs text-ink-500">
                                {m.member_code} · {formatAge(m.age, lang)} ·{' '}
                                {labels.category(m.health_category)}
                                {m.village && ` · ${m.village}`}
                              </span>
                            </span>
                            {m.high_risk && <Badge tone="red">{t('members.highRisk')}</Badge>}
                            <ArrowRight className="h-4 w-4 shrink-0 text-ink-300" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            )}

            <Card>
              <CardBody>
                <Select
                  label={t('visit.type')}
                  value={draft.visitType}
                  onChange={(e) => patch({ visitType: e.target.value as VisitType })}
                >
                  {VISIT_TYPES.map((vt) => (
                    <option key={vt} value={vt}>
                      {labels.visitType(vt)}
                    </option>
                  ))}
                </Select>
              </CardBody>
            </Card>
          </div>
        )

      case 1:
        return member ? <SymptomsStep member={member} /> : null

      case 2:
        return member ? <VoiceStep member={member} /> : null

      case 3:
        return <VitalsStep />

      case 4:
        return member ? (
          <AssessmentStep member={member} onComplete={() => patch({ step: 5 })} />
        ) : null

      case 5:
        return outcome && member ? (
          <div className="space-y-4">
            <TriageBanner outcome={outcome} />
            <RecommendedAction outcome={outcome} />
            <SafetyOverrideNotice outcome={outcome} />
            <TriageReasoning outcome={outcome} />
            <KeyVitals vitals={parsedVitals} />
            <ClinicalSummary outcome={outcome} />

            {outcome.level === 'GREEN' && (
              <Notice tone="care" icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}>
                {t('triage.noReferral')}
              </Notice>
            )}
          </div>
        ) : null

      case 6:
        return outcome && member ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink-900">
                  {t('referral.title')}
                </h2>
                <p className="mt-1 text-[0.9375rem] text-ink-500">
                  {labels.urgency(outcome.assessment.referralUrgency)}
                </p>
              </div>
              <RiskBadge level={outcome.level} full />
            </div>

            <FacilityFinder
              urgent={outcome.level === 'RED'}
              selected={draft.facility}
              onSelect={(facility: FacilityResult) => patch({ facility })}
              memberLocation={
                member.latitude != null && member.longitude != null
                  ? { lat: member.latitude, lng: member.longitude }
                  : null
              }
            />

            {draft.facility && (
              <Notice tone="care" icon={<Navigation className="h-4 w-4" aria-hidden />}>
                <span className="font-semibold">{t('referral.facility')}:</span> {draft.facility.name}
              </Notice>
            )}

            <ReferralNoteView
              member={member}
              outcome={outcome}
              symptoms={draft.symptoms}
              vitals={parsedVitals}
              visitDate={new Date()}
              ashaName={profile.full_name}
              ashaCode={profile.asha_code}
              facilityName={draft.facility?.name ?? null}
              note={draft.referralNote}
              onNoteChange={(referralNote) => patch({ referralNote })}
            />
          </div>
        ) : null

      default:
        return null
    }
  }

  // ----------------------------------------------------------- footer nav
  const canContinue =
    step === 0 ? Boolean(member) : step === 4 ? Boolean(outcome) : step < maxReachable + 1

  const footer = () => {
    if (step === 4) return null // the assessment step owns its own CTA

    const isLast = step === 6 || (step === 5 && !needsReferral)

    return (
      <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-ink-100 bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                variant="secondary"
                onClick={() => goto(step - 1)}
                iconLeft={<ArrowLeft className="h-4 w-4" aria-hidden />}
              >
                {t('common.back')}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => setDiscardOpen(true)}
              iconLeft={<Trash2 className="h-4 w-4" aria-hidden />}
              className="text-ink-500"
            >
              {t('visit.discard')}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">

            {isLast ? (
              <Button
                size="lg"
                loading={saving}
                onClick={() => void save()}
                iconLeft={!saving ? <Save className="h-4 w-4" aria-hidden /> : undefined}
              >
                {needsReferral ? t('referral.saveAndFinish') : t('triage.finish')}
              </Button>
            ) : (
              <Button
                size="lg"
                disabled={!canContinue}
                onClick={() => goto(step + 1)}
                iconRight={<ArrowRight className="h-4 w-4" aria-hidden />}
              >
                {step === 5 ? t('triage.continueReferral') : t('common.next')}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/asha"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('nav.dashboard')}
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-500">
          <Check className="h-3 w-3" aria-hidden />
          {t('visit.draftSaved')}
        </span>
      </div>

      <header className="mb-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-care-600">
          {labels.visitType(draft.visitType)}
        </p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink-900 sm:text-[1.75rem]">
          {member ? member.full_name : t('visit.newTitle')}
        </h1>
        <p className="mt-1.5 text-[0.9375rem] text-ink-500">
          {member
            ? `${member.member_code} · ${formatAge(member.age, lang)} · ${formatDate(new Date(), lang)}`
            : formatDate(new Date(), lang)}
        </p>
      </header>

      <StepIndicator
        steps={needsReferral || !outcome ? VISIT_STEPS : VISIT_STEPS.slice(0, 6)}
        current={step}
        maxReachable={maxReachable}
        onJump={goto}
      />

      {!member && step > 0 && (
        <Notice tone="amber" className="mb-4" icon={<AlertCircle className="h-4 w-4" aria-hidden />}>
          {t('visit.needMember')}
        </Notice>
      )}

      {saveError && (
        <Notice
          tone="red"
          className="mb-4"
          icon={<AlertCircle className="h-4 w-4" aria-hidden />}
          action={
            <Button variant="danger" size="sm" onClick={() => void save()}>
              {t('common.retry')}
            </Button>
          }
        >
          {t('visit.saveFailed')}
        </Notice>
      )}

      <div className={cn('animate-fade-in')}>{body()}</div>

      {footer()}

      <Modal
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title={t('visit.discard')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDiscardOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="urgent"
              onClick={() => {
                reset()
                setDiscardOpen(false)
                navigate('/asha')
              }}
            >
              {t('visit.discard')}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-700">{t('visit.discardConfirm')}</p>
      </Modal>
    </>
  )
}
