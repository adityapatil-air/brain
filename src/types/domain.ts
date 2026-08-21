import type {
  ClinicalAssessment,
  LanguageCode,
  TriageLevel,
  ReferralUrgency,
  VitalsInput,
} from '../../shared/clinical'
import type { SafetyFinding } from '../../shared/safetyEngine'

export type { TriageLevel, ReferralUrgency, LanguageCode, VitalsInput } from '../../shared/clinical'

export type Role = 'asha' | 'phc_doctor' | 'admin'

export interface Profile {
  id: string
  auth_user_id: string
  full_name: string
  role: Role
  asha_code: string | null
  phone: string | null
  village: string | null
  district: string | null
  state: string | null
  created_at: string
}

export type PregnancyStatus = 'not_applicable' | 'pregnant' | 'postnatal' | 'lactating'
export type HealthCategory = 'general' | 'pregnant' | 'postnatal' | 'child' | 'chronic' | 'elderly'

export interface Member {
  id: string
  member_code: string
  full_name: string
  age: number
  gender: 'male' | 'female' | 'other'
  phone: string | null
  village: string | null
  address: string | null
  pregnancy_status: PregnancyStatus
  health_category: HealthCategory
  existing_conditions: string[]
  allergies: string[]
  high_risk: boolean
  asha_id: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
  updated_at: string
}

export type VisitType = 'home_visit' | 'follow_up' | 'antenatal' | 'postnatal' | 'child_check'
export type VisitStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled'
export type SymptomSource = 'manual' | 'voice' | 'ai'
export type ReferralStatus = 'pending' | 'acknowledged' | 'reviewed' | 'completed'
export type FacilityType = 'hospital' | 'phc' | 'government_hospital' | 'emergency_facility' | 'clinic'

export interface Visit {
  id: string
  member_id: string
  asha_id: string
  visit_date: string
  visit_type: VisitType
  status: VisitStatus
  transcript: string | null
  language: LanguageCode
  clinical_summary: string | null
  triage_level: TriageLevel | null
  triage_reason: string | null
  recommended_action: string | null
  referral_required: boolean
  referral_urgency: ReferralUrgency | null
  follow_up_date: string | null
  created_at: string
  updated_at: string
}

export interface SymptomRecord {
  id: string
  visit_id: string
  symptom_name: string
  category: string
  severity: 'mild' | 'moderate' | 'severe' | null
  duration: string | null
  source: SymptomSource
  created_at: string
}

export interface VitalsRecord extends VitalsInput {
  id: string
  visit_id: string
  recorded_at: string
}

export interface AssessmentRecord {
  id: string
  visit_id: string
  ai_summary: string | null
  reasoning: string[]
  safety_findings: SafetyFinding[]
  risk: TriageLevel
  ai_risk: TriageLevel | null
  safety_override: boolean
  recommended_action: string | null
  confidence: number | null
  model_name: string | null
  created_at: string
}

export interface Referral {
  id: string
  visit_id: string
  member_id: string
  asha_id: string
  triage_level: TriageLevel
  urgency: ReferralUrgency
  reason: string
  referral_note: string
  facility_id: string | null
  facility_name: string | null
  facility_address: string | null
  facility_latitude: number | null
  facility_longitude: number | null
  facility_distance: number | null
  status: ReferralStatus
  reviewed_by: string | null
  review_notes: string | null
  created_at: string
  acknowledged_at: string | null
  reviewed_at: string | null
}

export interface HealthcareFacility {
  id: string
  name: string
  facility_type: FacilityType
  address: string | null
  latitude: number
  longitude: number
  phone: string | null
  district: string | null
  state: string | null
  has_emergency: boolean
}

// ------------------------------------------------------------- view models

export interface VisitListItem extends Visit {
  member: Pick<Member, 'id' | 'full_name' | 'age' | 'gender' | 'member_code' | 'village' | 'health_category'>
  symptom_names: string[]
  vitals: VitalsInput | null
  has_referral: boolean
}

export interface VisitDetail {
  visit: Visit
  member: Member
  symptoms: SymptomRecord[]
  vitals: VitalsRecord | null
  assessment: AssessmentRecord | null
  referral: Referral | null
  asha: Pick<Profile, 'id' | 'full_name' | 'asha_code' | 'phone' | 'village'> | null
}

export interface ReferralListItem extends Referral {
  member: Pick<Member, 'id' | 'full_name' | 'age' | 'gender' | 'member_code' | 'village' | 'health_category' | 'pregnancy_status'>
  asha: Pick<Profile, 'id' | 'full_name' | 'asha_code' | 'phone'> | null
  visit_summary: string | null
}

export interface AshaStats {
  todayVisits: number
  pendingFollowUps: number
  highRiskCases: number
  completed: number
}

export interface PhcStats {
  todayVisits: number
  pendingReview: number
  urgentReferrals: number
  followUps: number
}

/** The full result of one triage run, held in the visit draft. */
export interface TriageOutcome {
  level: TriageLevel
  aiRisk: TriageLevel | null
  safetyOverride: boolean
  findings: SafetyFinding[]
  assessment: ClinicalAssessment
}
