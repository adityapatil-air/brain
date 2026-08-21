import type { RealtimeChannel } from '@supabase/supabase-js'
import { requireSupabase } from '../supabase/client'
import type {
  AshaStats,
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
} from '../../types/domain'
import type {
  Repository,
  ReferralFilter,
  SaveVisitPayload,
  SaveVisitResult,
  VisitFilter,
} from './types'

/**
 * Demo sign-in accepts a worker code (ASHA001) as well as an email. Codes are
 * mapped onto the account email using the convention used by `npm run seed`.
 */
function toEmail(identifier: string): string {
  const id = identifier.trim()
  if (id.includes('@')) return id.toLowerCase()
  return `${id.toLowerCase()}@ashacare.demo`
}

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export class SupabaseRepository implements Repository {
  readonly kind = 'supabase' as const

  // ------------------------------------------------------------------- auth
  async signIn(identifier: string, password: string): Promise<Profile> {
    const db = requireSupabase()
    const { error } = await db.auth.signInWithPassword({
      email: toEmail(identifier),
      password,
    })
    if (error) throw new Error('AUTH_FAILED')

    const profile = await this.currentProfile()
    if (!profile) throw new Error('NO_PROFILE')
    return profile
  }

  async signOut(): Promise<void> {
    await requireSupabase().auth.signOut()
  }

  async currentProfile(): Promise<Profile | null> {
    const db = requireSupabase()
    const { data: sessionData } = await db.auth.getSession()
    const user = sessionData.session?.user
    if (!user) return null

    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (error) throw error
    return (data as Profile | null) ?? null
  }

  onAuthChange(cb: () => void): () => void {
    const db = requireSupabase()
    const { data } = db.auth.onAuthStateChange(() => cb())
    return () => data.subscription.unsubscribe()
  }

  // ---------------------------------------------------------------- members
  async listMembers(profile: Profile): Promise<Member[]> {
    const db = requireSupabase()
    let query = db.from('members').select('*').order('full_name')
    if (profile.role === 'asha') query = query.eq('asha_id', profile.id)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as Member[]
  }

  async getMember(id: string): Promise<Member | null> {
    const { data, error } = await requireSupabase()
      .from('members')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data as Member | null) ?? null
  }

  // ----------------------------------------------------------------- visits
  async listVisits(filter: VisitFilter): Promise<VisitListItem[]> {
    const db = requireSupabase()
    let query = db
      .from('visits')
      .select(
        `*,
         member:members!inner(id, full_name, age, gender, member_code, village, health_category),
         symptoms(symptom_name),
         vitals(temperature, pulse, respiratory_rate, spo2, systolic_bp, diastolic_bp, weight, blood_glucose),
         referrals(id)`,
      )
      .order('visit_date', { ascending: false })

    if (filter.ashaId) query = query.eq('asha_id', filter.ashaId)
    if (filter.memberId) query = query.eq('member_id', filter.memberId)
    if (filter.triage) query = query.eq('triage_level', filter.triage)
    if (filter.limit) query = query.limit(filter.limit)

    const { data, error } = await query
    if (error) throw error

    type Row = Visit & {
      member: VisitListItem['member']
      symptoms: Array<{ symptom_name: string }> | null
      vitals: VisitListItem['vitals'] | Array<NonNullable<VisitListItem['vitals']>> | null
      referrals: Array<{ id: string }> | null
    }

    return ((data ?? []) as Row[]).map((row) => {
      const { symptoms, vitals, referrals, ...visit } = row
      const vitalRow = Array.isArray(vitals) ? (vitals[0] ?? null) : vitals
      return {
        ...(visit as Visit & { member: VisitListItem['member'] }),
        symptom_names: (symptoms ?? []).map((s) => s.symptom_name),
        vitals: vitalRow ?? null,
        has_referral: Boolean(referrals?.length),
      }
    })
  }

  async getVisitDetail(id: string): Promise<VisitDetail | null> {
    const db = requireSupabase()
    const { data: visit, error } = await db.from('visits').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!visit) return null
    const v = visit as Visit

    const [memberRes, symptomRes, vitalRes, assessRes, referralRes, ashaRes] = await Promise.all([
      db.from('members').select('*').eq('id', v.member_id).maybeSingle(),
      db.from('symptoms').select('*').eq('visit_id', id).order('created_at'),
      db.from('vitals').select('*').eq('visit_id', id).maybeSingle(),
      db.from('assessments').select('*').eq('visit_id', id).order('created_at', { ascending: false }).limit(1),
      db.from('referrals').select('*').eq('visit_id', id).maybeSingle(),
      db.from('profiles').select('id, full_name, asha_code, phone, village').eq('id', v.asha_id).maybeSingle(),
    ])

    return {
      visit: v,
      member: memberRes.data as Member,
      symptoms: (symptomRes.data ?? []) as SymptomRecord[],
      vitals: (vitalRes.data as VisitDetail['vitals']) ?? null,
      assessment: (assessRes.data?.[0] as VisitDetail['assessment']) ?? null,
      referral: (referralRes.data as Referral | null) ?? null,
      asha: (ashaRes.data as VisitDetail['asha']) ?? null,
    }
  }

  // -------------------------------------------------------------- referrals
  private async fetchReferrals(filter: ReferralFilter): Promise<ReferralListItem[]> {
    const db = requireSupabase()
    let query = db
      .from('referrals')
      .select(
        `*,
         member:members!inner(id, full_name, age, gender, member_code, village, health_category, pregnancy_status),
         asha:profiles!referrals_asha_id_fkey(id, full_name, asha_code, phone),
         visit:visits!inner(clinical_summary)`,
      )
      .order('created_at', { ascending: false })

    if (filter.ashaId) query = query.eq('asha_id', filter.ashaId)
    if (filter.memberId) query = query.eq('member_id', filter.memberId)
    if (filter.status) query = query.eq('status', filter.status)
    if (filter.urgentOnly) query = query.eq('urgency', 'urgent')
    if (filter.limit) query = query.limit(filter.limit)

    const { data, error } = await query
    if (error) throw error

    type Row = Referral & {
      member: ReferralListItem['member']
      asha: ReferralListItem['asha'] | Array<NonNullable<ReferralListItem['asha']>> | null
      visit: { clinical_summary: string | null } | Array<{ clinical_summary: string | null }> | null
    }

    return ((data ?? []) as Row[]).map((row) => {
      const { visit, asha, ...rest } = row
      const visitRow = Array.isArray(visit) ? visit[0] : visit
      const ashaRow = Array.isArray(asha) ? (asha[0] ?? null) : asha
      return {
        ...(rest as Referral & { member: ReferralListItem['member'] }),
        asha: ashaRow ?? null,
        visit_summary: visitRow?.clinical_summary ?? null,
      }
    })
  }

  async listReferrals(filter: ReferralFilter): Promise<ReferralListItem[]> {
    return this.fetchReferrals(filter)
  }

  async getReferral(id: string): Promise<ReferralListItem | null> {
    const db = requireSupabase()
    const { data, error } = await db
      .from('referrals')
      .select(
        `*,
         member:members!inner(id, full_name, age, gender, member_code, village, health_category, pregnancy_status),
         asha:profiles!referrals_asha_id_fkey(id, full_name, asha_code, phone),
         visit:visits!inner(clinical_summary)`,
      )
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!data) return null

    const row = data as Referral & {
      member: ReferralListItem['member']
      asha: ReferralListItem['asha']
      visit: { clinical_summary: string | null } | null
    }
    const { visit, ...rest } = row
    return { ...rest, visit_summary: visit?.clinical_summary ?? null }
  }

  async updateReferralStatus(
    id: string,
    status: ReferralStatus,
    reviewerId: string,
    notes?: string,
  ): Promise<void> {
    const db = requireSupabase()
    const now = new Date().toISOString()
    const patch: Record<string, unknown> = { status, reviewed_by: reviewerId }
    if (notes !== undefined) patch.review_notes = notes
    if (status === 'acknowledged') patch.acknowledged_at = now
    if (status === 'reviewed' || status === 'completed') {
      patch.reviewed_at = now
      patch.acknowledged_at = patch.acknowledged_at ?? now
    }
    const { error } = await db.from('referrals').update(patch).eq('id', id)
    if (error) throw error
  }

  // ------------------------------------------------------------- facilities
  async listFacilities(): Promise<HealthcareFacility[]> {
    const { data, error } = await requireSupabase()
      .from('healthcare_facilities')
      .select('*')
      .order('name')
    if (error) throw error
    return (data ?? []) as HealthcareFacility[]
  }

  // ------------------------------------------------------------- save visit
  async saveVisit(payload: SaveVisitPayload): Promise<SaveVisitResult> {
    const db = requireSupabase()
    const { outcome } = payload

    const { data: visit, error: visitErr } = await db
      .from('visits')
      .insert({
        member_id: payload.memberId,
        asha_id: payload.ashaId,
        visit_date: new Date().toISOString(),
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
      })
      .select('id')
      .single()
    if (visitErr || !visit) throw visitErr ?? new Error('VISIT_INSERT_FAILED')

    const visitId = visit.id as string

    if (payload.symptoms.length) {
      const { error } = await db.from('symptoms').insert(
        payload.symptoms.map((s) => ({
          visit_id: visitId,
          symptom_name: s.symptom_name,
          category: s.category,
          severity: s.severity,
          duration: s.duration,
          source: s.source,
        })),
      )
      if (error) throw error
    }

    const hasVitals = Object.values(payload.vitals).some((v) => v !== null && v !== undefined)
    if (hasVitals) {
      const { error } = await db.from('vitals').insert({ visit_id: visitId, ...payload.vitals })
      if (error) throw error
    }

    const { error: assessErr } = await db.from('assessments').insert({
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
    })
    if (assessErr) throw assessErr

    let referralId: string | null = null
    if (payload.referral) {
      const f = payload.referral.facility
      const { data, error } = await db
        .from('referrals')
        .insert({
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
        })
        .select('id')
        .single()
      if (error) throw error
      referralId = (data?.id as string) ?? null
    }

    await db.from('visit_events').insert({
      visit_id: visitId,
      actor_id: payload.ashaId,
      event_type: 'visit_completed',
      payload: { triage: outcome.level, safety_override: outcome.safetyOverride },
    })

    return { visitId, referralId }
  }

  // ------------------------------------------------------------------ stats
  async ashaStats(ashaId: string): Promise<AshaStats> {
    const db = requireSupabase()
    const today = startOfToday()

    const [todayRes, completedRes, highRiskRes, followUpRes] = await Promise.all([
      db.from('visits').select('id', { count: 'exact', head: true }).eq('asha_id', ashaId).gte('visit_date', today),
      db
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('asha_id', ashaId)
        .eq('status', 'completed')
        .gte('visit_date', today),
      db
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('asha_id', ashaId)
        .eq('triage_level', 'RED'),
      db
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('asha_id', ashaId)
        .in('status', ['pending', 'acknowledged']),
    ])

    return {
      todayVisits: todayRes.count ?? 0,
      completed: completedRes.count ?? 0,
      highRiskCases: highRiskRes.count ?? 0,
      pendingFollowUps: followUpRes.count ?? 0,
    }
  }

  async phcStats(): Promise<PhcStats> {
    const db = requireSupabase()
    const today = startOfToday()

    const [todayRes, pendingRes, urgentRes, followUpRes] = await Promise.all([
      db.from('visits').select('id', { count: 'exact', head: true }).gte('visit_date', today),
      db.from('referrals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      db
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('urgency', 'urgent')
        .in('status', ['pending', 'acknowledged']),
      db
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .in('status', ['acknowledged', 'reviewed']),
    ])

    return {
      todayVisits: todayRes.count ?? 0,
      pendingReview: pendingRes.count ?? 0,
      urgentReferrals: urgentRes.count ?? 0,
      followUps: followUpRes.count ?? 0,
    }
  }

  // --------------------------------------------------------------- realtime
  subscribeReferrals(onChange: () => void): () => void {
    const db = requireSupabase()
    let channel: RealtimeChannel | null = null
    // Realtime is best-effort. A polling interval guarantees the dashboard
    // still refreshes if the websocket cannot connect.
    const poll = window.setInterval(onChange, 30_000)

    try {
      channel = db
        .channel('referrals-feed')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => onChange())
        .subscribe()
    } catch {
      channel = null
    }

    return () => {
      window.clearInterval(poll)
      if (channel) void db.removeChannel(channel)
    }
  }
}
