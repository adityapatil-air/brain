/**
 * Local demo backend.
 *
 * Active ONLY when no Supabase project is configured. It exists so the full
 * clinical workflow can be exercised on a fresh clone, and the UI shows a
 * persistent banner making the mode obvious. Supabase remains the real source
 * of truth for any deployment — see `supabaseRepository.ts`.
 */

import {
  SEED_FACILITIES,
  SEED_MEMBERS,
  SEED_PROFILES,
  SEED_VISITS,
} from '../../../shared/demoData'
import type {
  AshaStats,
  AssessmentRecord,
  HealthcareFacility,
  Member,
  PhcStats,
  Profile,
  Referral,
  ReferralListItem,
  ReferralStatus,
  SymptomRecord,
  Visit,
  VisitDetail,
  VisitListItem,
  VitalsRecord,
} from '../../types/domain'
import type {
  Repository,
  ReferralFilter,
  SaveVisitPayload,
  SaveVisitResult,
  VisitFilter,
} from './types'

const DB_KEY = 'ashacare.demo.db.v1'
const SESSION_KEY = 'ashacare.demo.session.v1'
const DEMO_PASSWORD = '123456'

interface DemoDb {
  profiles: Profile[]
  members: Member[]
  visits: Visit[]
  symptoms: SymptomRecord[]
  vitals: VitalsRecord[]
  assessments: AssessmentRecord[]
  referrals: Referral[]
  facilities: HealthcareFacility[]
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`

const nowIso = () => new Date().toISOString()

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

function buildSeed(): DemoDb {
  const profiles: Profile[] = SEED_PROFILES.map((p) => ({
    id: uid(),
    auth_user_id: uid(),
    full_name: p.full_name,
    role: p.role,
    asha_code: p.asha_code,
    phone: p.phone,
    village: p.village,
    district: p.district,
    state: p.state,
    created_at: nowIso(),
  }))
  const profileByKey = new Map(SEED_PROFILES.map((p, i) => [p.key, profiles[i]!.id]))

  const facilities: HealthcareFacility[] = SEED_FACILITIES.map((f) => ({
    id: uid(),
    name: f.name,
    facility_type: f.facility_type,
    address: f.address,
    latitude: f.latitude,
    longitude: f.longitude,
    phone: f.phone,
    district: f.district,
    state: f.state,
    has_emergency: f.has_emergency,
  }))

  const members: Member[] = SEED_MEMBERS.map((m) => ({
    id: uid(),
    member_code: m.member_code,
    full_name: m.full_name,
    age: m.age,
    gender: m.gender,
    phone: m.phone,
    village: m.village,
    address: m.address,
    pregnancy_status: m.pregnancy_status,
    health_category: m.health_category,
    existing_conditions: m.existing_conditions,
    allergies: m.allergies,
    high_risk: m.high_risk,
    asha_id: profileByKey.get(m.asha) ?? null,
    latitude: m.latitude,
    longitude: m.longitude,
    created_at: nowIso(),
    updated_at: nowIso(),
  }))
  const memberByCode = new Map(members.map((m) => [m.member_code, m]))

  const visits: Visit[] = []
  const symptoms: SymptomRecord[] = []
  const vitals: VitalsRecord[] = []
  const assessments: AssessmentRecord[] = []
  const referrals: Referral[] = []

  for (const v of SEED_VISITS) {
    const member = memberByCode.get(v.member_code)
    const ashaId = profileByKey.get(v.asha)
    if (!member || !ashaId) continue

    const date = new Date()
    date.setDate(date.getDate() - v.daysAgo)
    date.setHours(v.hour, 15, 0, 0)
    const iso = date.toISOString()
    const visitId = uid()

    visits.push({
      id: visitId,
      member_id: member.id,
      asha_id: ashaId,
      visit_date: iso,
      visit_type: v.visit_type,
      status: 'completed',
      transcript: v.transcript,
      language: v.language,
      clinical_summary: v.summary,
      triage_level: v.triage,
      triage_reason: v.reasoning.join(' · '),
      recommended_action: v.recommended_action,
      referral_required: Boolean(v.referral),
      referral_urgency: v.referral?.urgency ?? null,
      follow_up_date: null,
      created_at: iso,
      updated_at: iso,
    })

    for (const s of v.symptoms) {
      symptoms.push({
        id: uid(),
        visit_id: visitId,
        symptom_name: s.name,
        category: s.category,
        severity: s.severity,
        duration: s.duration,
        source: s.source,
        created_at: iso,
      })
    }

    vitals.push({
      id: uid(),
      visit_id: visitId,
      recorded_at: iso,
      temperature: v.vitals.temperature ?? null,
      pulse: v.vitals.pulse ?? null,
      respiratory_rate: v.vitals.respiratory_rate ?? null,
      spo2: v.vitals.spo2 ?? null,
      systolic_bp: v.vitals.systolic_bp ?? null,
      diastolic_bp: v.vitals.diastolic_bp ?? null,
      weight: v.vitals.weight ?? null,
      blood_glucose: v.vitals.blood_glucose ?? null,
    })

    assessments.push({
      id: uid(),
      visit_id: visitId,
      ai_summary: v.summary,
      reasoning: v.reasoning,
      safety_findings: [],
      risk: v.triage,
      ai_risk: v.triage,
      safety_override: false,
      recommended_action: v.recommended_action,
      confidence: 0.86,
      model_name: 'seed-data',
      created_at: iso,
    })

    if (v.referral) {
      const facility = facilities.find((f) => f.name === v.referral!.facility_name) ?? null
      referrals.push({
        id: uid(),
        visit_id: visitId,
        member_id: member.id,
        asha_id: ashaId,
        triage_level: v.triage,
        urgency: v.referral.urgency,
        reason: v.referral.reason,
        referral_note: v.referral.note,
        facility_id: facility?.id ?? null,
        facility_name: facility?.name ?? null,
        facility_address: facility?.address ?? null,
        facility_latitude: facility?.latitude ?? null,
        facility_longitude: facility?.longitude ?? null,
        facility_distance:
          facility && member.latitude != null && member.longitude != null
            ? Number(
                haversineKm(
                  { lat: member.latitude, lng: member.longitude },
                  { lat: facility.latitude, lng: facility.longitude },
                ).toFixed(2),
              )
            : null,
        status: v.referral.status,
        reviewed_by: null,
        review_notes: null,
        created_at: iso,
        acknowledged_at: v.referral.status === 'pending' ? null : iso,
        reviewed_at:
          v.referral.status === 'reviewed' || v.referral.status === 'completed' ? iso : null,
      })
    }
  }

  return { profiles, members, visits, symptoms, vitals, assessments, referrals, facilities }
}

function loadDb(): DemoDb {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw) as DemoDb
  } catch {
    /* fall through to a fresh seed */
  }
  const seeded = buildSeed()
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(seeded))
  } catch {
    /* ignore */
  }
  return seeded
}

export class DemoRepository implements Repository {
  readonly kind = 'demo' as const
  private db: DemoDb = loadDb()
  private listeners = new Set<() => void>()

  private persist() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this.db))
    } catch {
      /* ignore quota errors — the in-memory copy stays correct */
    }
    this.listeners.forEach((l) => l())
  }

  /** Wipes the local demo database and re-seeds it. */
  reset() {
    localStorage.removeItem(DB_KEY)
    this.db = loadDb()
    this.persist()
  }

  // ------------------------------------------------------------------- auth
  async signIn(identifier: string, password: string): Promise<Profile> {
    const id = identifier.trim().toLowerCase()
    const seed = SEED_PROFILES.find(
      (p) => p.asha_code?.toLowerCase() === id || p.email.toLowerCase() === id,
    )
    const profile = seed
      ? this.db.profiles.find((p) => p.full_name === seed.full_name)
      : undefined

    if (!profile || password !== DEMO_PASSWORD) throw new Error('AUTH_FAILED')

    localStorage.setItem(SESSION_KEY, profile.id)
    return profile
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(SESSION_KEY)
  }

  async currentProfile(): Promise<Profile | null> {
    const id = localStorage.getItem(SESSION_KEY)
    if (!id) return null
    return this.db.profiles.find((p) => p.id === id) ?? null
  }

  onAuthChange(): () => void {
    return () => {}
  }

  // ---------------------------------------------------------------- members
  async listMembers(profile: Profile): Promise<Member[]> {
    const rows =
      profile.role === 'asha'
        ? this.db.members.filter((m) => m.asha_id === profile.id)
        : this.db.members
    return [...rows].sort((a, b) => a.full_name.localeCompare(b.full_name))
  }

  async getMember(id: string): Promise<Member | null> {
    return this.db.members.find((m) => m.id === id) ?? null
  }

  // ----------------------------------------------------------------- visits
  async listVisits(filter: VisitFilter): Promise<VisitListItem[]> {
    let rows = [...this.db.visits]
    if (filter.ashaId) rows = rows.filter((v) => v.asha_id === filter.ashaId)
    if (filter.memberId) rows = rows.filter((v) => v.member_id === filter.memberId)
    if (filter.triage) rows = rows.filter((v) => v.triage_level === filter.triage)
    rows.sort((a, b) => b.visit_date.localeCompare(a.visit_date))
    if (filter.limit) rows = rows.slice(0, filter.limit)

    return rows.flatMap((v) => {
      const member = this.db.members.find((m) => m.id === v.member_id)
      if (!member) return []
      const vitalRow = this.db.vitals.find((x) => x.visit_id === v.id) ?? null
      return [
        {
          ...v,
          member: {
            id: member.id,
            full_name: member.full_name,
            age: member.age,
            gender: member.gender,
            member_code: member.member_code,
            village: member.village,
            health_category: member.health_category,
          },
          symptom_names: this.db.symptoms.filter((s) => s.visit_id === v.id).map((s) => s.symptom_name),
          vitals: vitalRow,
          has_referral: this.db.referrals.some((r) => r.visit_id === v.id),
        },
      ]
    })
  }

  async getVisitDetail(id: string): Promise<VisitDetail | null> {
    const visit = this.db.visits.find((v) => v.id === id)
    if (!visit) return null
    const member = this.db.members.find((m) => m.id === visit.member_id)
    if (!member) return null
    const asha = this.db.profiles.find((p) => p.id === visit.asha_id) ?? null

    return {
      visit,
      member,
      symptoms: this.db.symptoms.filter((s) => s.visit_id === id),
      vitals: this.db.vitals.find((v) => v.visit_id === id) ?? null,
      assessment: this.db.assessments.find((a) => a.visit_id === id) ?? null,
      referral: this.db.referrals.find((r) => r.visit_id === id) ?? null,
      asha: asha
        ? {
            id: asha.id,
            full_name: asha.full_name,
            asha_code: asha.asha_code,
            phone: asha.phone,
            village: asha.village,
          }
        : null,
    }
  }

  // -------------------------------------------------------------- referrals
  private hydrateReferral(r: Referral): ReferralListItem | null {
    const member = this.db.members.find((m) => m.id === r.member_id)
    if (!member) return null
    const asha = this.db.profiles.find((p) => p.id === r.asha_id) ?? null
    const visit = this.db.visits.find((v) => v.id === r.visit_id) ?? null
    return {
      ...r,
      member: {
        id: member.id,
        full_name: member.full_name,
        age: member.age,
        gender: member.gender,
        member_code: member.member_code,
        village: member.village,
        health_category: member.health_category,
        pregnancy_status: member.pregnancy_status,
      },
      asha: asha
        ? { id: asha.id, full_name: asha.full_name, asha_code: asha.asha_code, phone: asha.phone }
        : null,
      visit_summary: visit?.clinical_summary ?? null,
    }
  }

  async listReferrals(filter: ReferralFilter): Promise<ReferralListItem[]> {
    let rows = [...this.db.referrals]
    if (filter.ashaId) rows = rows.filter((r) => r.asha_id === filter.ashaId)
    if (filter.memberId) rows = rows.filter((r) => r.member_id === filter.memberId)
    if (filter.status) rows = rows.filter((r) => r.status === filter.status)
    if (filter.urgentOnly) rows = rows.filter((r) => r.urgency === 'urgent')
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (filter.limit) rows = rows.slice(0, filter.limit)
    return rows.flatMap((r) => {
      const hydrated = this.hydrateReferral(r)
      return hydrated ? [hydrated] : []
    })
  }

  async getReferral(id: string): Promise<ReferralListItem | null> {
    const row = this.db.referrals.find((r) => r.id === id)
    return row ? this.hydrateReferral(row) : null
  }

  async updateReferralStatus(
    id: string,
    status: ReferralStatus,
    reviewerId: string,
    notes?: string,
  ): Promise<void> {
    const row = this.db.referrals.find((r) => r.id === id)
    if (!row) throw new Error('NOT_FOUND')
    row.status = status
    row.reviewed_by = reviewerId
    if (notes !== undefined) row.review_notes = notes
    const now = nowIso()
    if (status === 'acknowledged') row.acknowledged_at = now
    if (status === 'reviewed' || status === 'completed') {
      row.reviewed_at = now
      row.acknowledged_at = row.acknowledged_at ?? now
    }
    this.persist()
  }

  async listFacilities(): Promise<HealthcareFacility[]> {
    return [...this.db.facilities].sort((a, b) => a.name.localeCompare(b.name))
  }

  // ------------------------------------------------------------- save visit
  async saveVisit(payload: SaveVisitPayload): Promise<SaveVisitResult> {
    const { outcome } = payload
    const iso = nowIso()
    const visitId = uid()

    this.db.visits.push({
      id: visitId,
      member_id: payload.memberId,
      asha_id: payload.ashaId,
      visit_date: iso,
      visit_type: payload.visitType,
      status: 'completed',
      transcript: payload.transcript,
      language: payload.language,
      clinical_summary: outcome.assessment.summary,
      triage_level: outcome.level,
      triage_reason: outcome.assessment.reasoning.join(' · '),
      recommended_action: outcome.assessment.recommendedAction,
      referral_required: Boolean(payload.referral),
      referral_urgency: payload.referral ? outcome.assessment.referralUrgency : null,
      follow_up_date: null,
      created_at: iso,
      updated_at: iso,
    })

    for (const s of payload.symptoms) {
      this.db.symptoms.push({
        id: uid(),
        visit_id: visitId,
        symptom_name: s.symptom_name,
        category: s.category,
        severity: s.severity,
        duration: s.duration,
        source: s.source,
        created_at: iso,
      })
    }

    this.db.vitals.push({ id: uid(), visit_id: visitId, recorded_at: iso, ...payload.vitals })

    this.db.assessments.push({
      id: uid(),
      visit_id: visitId,
      ai_summary: outcome.assessment.summary,
      reasoning: outcome.assessment.reasoning,
      safety_findings: outcome.findings,
      risk: outcome.level,
      ai_risk: outcome.aiRisk,
      safety_override: outcome.safetyOverride,
      recommended_action: outcome.assessment.recommendedAction,
      confidence: outcome.assessment.confidence,
      model_name: outcome.assessment.modelName,
      created_at: iso,
    })

    let referralId: string | null = null
    if (payload.referral) {
      const f = payload.referral.facility
      referralId = uid()
      this.db.referrals.push({
        id: referralId,
        visit_id: visitId,
        member_id: payload.memberId,
        asha_id: payload.ashaId,
        triage_level: outcome.level,
        urgency: outcome.assessment.referralUrgency,
        reason: payload.referral.reason,
        referral_note: payload.referral.note,
        facility_id: f?.id ?? null,
        facility_name: f?.name ?? null,
        facility_address: f?.address ?? null,
        facility_latitude: f?.latitude ?? null,
        facility_longitude: f?.longitude ?? null,
        facility_distance: f?.distanceKm ?? null,
        status: 'pending',
        reviewed_by: null,
        review_notes: null,
        created_at: iso,
        acknowledged_at: null,
        reviewed_at: null,
      })
    }

    this.persist()
    return { visitId, referralId }
  }

  // ------------------------------------------------------------------ stats
  async ashaStats(ashaId: string): Promise<AshaStats> {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const mine = this.db.visits.filter((v) => v.asha_id === ashaId)
    const today = mine.filter((v) => new Date(v.visit_date) >= start)
    return {
      todayVisits: today.length,
      completed: today.filter((v) => v.status === 'completed').length,
      highRiskCases: mine.filter((v) => v.triage_level === 'RED').length,
      pendingFollowUps: this.db.referrals.filter(
        (r) => r.asha_id === ashaId && (r.status === 'pending' || r.status === 'acknowledged'),
      ).length,
    }
  }

  async phcStats(): Promise<PhcStats> {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return {
      todayVisits: this.db.visits.filter((v) => new Date(v.visit_date) >= start).length,
      pendingReview: this.db.referrals.filter((r) => r.status === 'pending').length,
      urgentReferrals: this.db.referrals.filter(
        (r) => r.urgency === 'urgent' && (r.status === 'pending' || r.status === 'acknowledged'),
      ).length,
      followUps: this.db.referrals.filter(
        (r) => r.status === 'acknowledged' || r.status === 'reviewed',
      ).length,
    }
  }

  subscribeReferrals(onChange: () => void): () => void {
    this.listeners.add(onChange)
    // Cross-tab updates, mirroring what Supabase Realtime provides.
    const onStorage = (e: StorageEvent) => {
      if (e.key === DB_KEY) {
        this.db = loadDb()
        onChange()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      this.listeners.delete(onChange)
      window.removeEventListener('storage', onStorage)
    }
  }
}
