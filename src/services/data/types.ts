import type { LanguageCode, TriageLevel, VitalsInput } from '../../../shared/clinical'
import type {
  AshaStats,
  HealthcareFacility,
  Member,
  PhcStats,
  Profile,
  ReferralListItem,
  ReferralStatus,
  SymptomSource,
  TriageOutcome,
  VisitDetail,
  VisitListItem,
  VisitType,
} from '../../types/domain'

export interface DraftSymptom {
  symptom_name: string
  category: string
  severity: 'mild' | 'moderate' | 'severe' | null
  duration: string | null
  source: SymptomSource
}

export interface SaveVisitPayload {
  memberId: string
  ashaId: string
  visitType: VisitType
  language: LanguageCode
  transcript: string | null
  symptoms: DraftSymptom[]
  vitals: VitalsInput
  outcome: TriageOutcome
  referral: {
    reason: string
    note: string
    facility: {
      id: string | null
      name: string
      address: string
      latitude: number
      longitude: number
      distanceKm: number | null
    } | null
  } | null
}

export interface SaveVisitResult {
  visitId: string
  referralId: string | null
}

export interface VisitFilter {
  ashaId?: string
  memberId?: string
  triage?: TriageLevel
  limit?: number
}

export interface ReferralFilter {
  ashaId?: string
  memberId?: string
  status?: ReferralStatus
  urgentOnly?: boolean
  limit?: number
}

export interface Repository {
  readonly kind: 'supabase' | 'demo'

  // ------------------------------------------------------------------- auth
  signIn(identifier: string, password: string): Promise<Profile>
  signOut(): Promise<void>
  currentProfile(): Promise<Profile | null>
  onAuthChange(cb: () => void): () => void

  // ------------------------------------------------------------------- data
  listMembers(profile: Profile): Promise<Member[]>
  getMember(id: string): Promise<Member | null>
  listVisits(filter: VisitFilter): Promise<VisitListItem[]>
  getVisitDetail(id: string): Promise<VisitDetail | null>
  listReferrals(filter: ReferralFilter): Promise<ReferralListItem[]>
  getReferral(id: string): Promise<ReferralListItem | null>
  updateReferralStatus(
    id: string,
    status: ReferralStatus,
    reviewerId: string,
    notes?: string,
  ): Promise<void>
  listFacilities(): Promise<HealthcareFacility[]>
  saveVisit(payload: SaveVisitPayload): Promise<SaveVisitResult>
  ashaStats(ashaId: string): Promise<AshaStats>
  phcStats(): Promise<PhcStats>

  /** Returns an unsubscribe function. Falls back to polling when unsupported. */
  subscribeReferrals(onChange: () => void): () => void
}
