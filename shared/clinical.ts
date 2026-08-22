/**
 * Shared clinical vocabulary and contracts.
 *
 * Imported by BOTH the browser bundle and the Node API proxy, so it must stay
 * free of any environment-specific import.
 */

export type TriageLevel = 'GREEN' | 'YELLOW' | 'RED'
export type ReferralUrgency = 'routine' | 'soon' | 'urgent'
export type Severity = 'mild' | 'moderate' | 'severe'
export type LanguageCode = 'en' | 'hi' | 'mr' | 'hinglish'

export type SymptomCategory =
  | 'general'
  | 'respiratory'
  | 'gastrointestinal'
  | 'maternal'
  | 'child'
  | 'other'

/** Canonical symptom identifiers. Free text is normalised onto these. */
export interface SymptomDefinition {
  key: string
  category: SymptomCategory
  /** Danger sign per IMNCI / maternal-health guidance. */
  danger?: boolean
  /** Words (any supported language, lowercase) that map onto this symptom. */
  aliases: string[]
}

export const SYMPTOM_CATALOG: SymptomDefinition[] = [
  // ---------------------------------------------------------------- general
  { key: 'fever', category: 'general', aliases: ['fever', 'high fever', 'temperature', 'बुखार', 'तेज बुखार', 'ज्वर', 'ताप', 'तापमान'] },
  { key: 'weakness', category: 'general', aliases: ['weakness', 'weak', 'कमजोरी', 'कमज़ोरी', 'अशक्तपणा', 'कमजोर'] },
  { key: 'dizziness', category: 'general', aliases: ['dizziness', 'dizzy', 'giddiness', 'चक्कर', 'भ्रम', 'गरगरणे'] },
  { key: 'headache', category: 'general', aliases: ['headache', 'सिरदर्द', 'सर दर्द', 'डोकेदुखी'] },
  { key: 'fatigue', category: 'general', aliases: ['fatigue', 'tiredness', 'tired', 'थकान', 'थकवा'] },
  { key: 'body_pain', category: 'general', aliases: ['body pain', 'body ache', 'बदन दर्द', 'शरीर दर्द', 'अंगदुखी', 'सर्वांग दुखण€€€'] },

  // ------------------------------------------------------------ respiratory
  { key: 'cough', category: 'respiratory', aliases: ['cough', 'खांसी', 'खोकला'] },
  {
    key: 'difficulty_breathing',
    category: 'respiratory',
    danger: true,
    aliases: [
      'difficulty breathing', 'breathlessness', 'shortness of breath', 'breathing difficulty',
      'respiratory distress', 'सांस लेने में तकलीफ', 'साँस लेने में तकलीफ', 'सांस फूलना',
      'श्वास घेण्यास त्रास', 'श्वास घ्यायला त्रास', 'दम लागणे',
    ],
  },
  { key: 'fast_breathing', category: 'respiratory', danger: true, aliases: ['fast breathing', 'rapid breathing', 'tachypnoea', 'तेज सांस', 'जल्दी सांस', 'जलद €€€'] },
  { key: 'chest_pain', category: 'respiratory', aliases: ['chest pain', 'सीने में दर्द', 'छाती में दर्द', 'छातीत दुखणे'] },

  // ------------------------------------------------------- gastrointestinal
  { key: 'vomiting', category: 'gastrointestinal', aliases: ['vomiting', 'vomit', 'उल्टी', 'ओकारी', 'उलटी'] },
  { key: 'diarrhea', category: 'gastrointestinal', aliases: ['diarrhea', 'diarrhoea', 'loose motions', 'दस्त', 'पतले दस्त', 'जुलाब', 'हगवण'] },
  { key: 'abdominal_pain', category: 'gastrointestinal', aliases: ['abdominal pain', 'stomach pain', 'पेट दर्द', 'पेट में दर्द', 'पोटदुखी'] },

  // ----------------------------------------------------------------maternal
  { key: 'vaginal_bleeding', category: 'maternal', danger: true, aliases: ['vaginal bleeding', 'bleeding', 'per vaginal bleeding', 'योनि से रक्तस्राव', 'खून आ€€€'] },
  { key: 'severe_abdominal_pain', category: 'maternal', danger: true, aliases: ['severe abdominal pain', 'तेज पेट दर्द', 'भयंकर पेट दर्द', 'तीव्€€€'] },
  { key: 'severe_headache', category: 'maternal', danger: true, aliases: ['severe headache', 'तेज सिरदर्द', 'भयंकर सिरदर्द', 'तीव्र डोक€€€'] },
  { key: 'blurred_vision', category: 'maternal', danger: true, aliases: ['blurred vision', 'blurry vision', 'धुंधला दिखना', 'धुंधली नजर', 'अंधुक €€€'] },
  { key: 'swelling', category: 'maternal', aliases: ['swelling', 'oedema', 'edema', 'सूजन', 'सूज'] },
  { key: 'reduced_fetal_movement', category: 'maternal', danger: true, aliases: ['reduced fetal movement', 'no fetal movement', 'बच्चे की हलचल कम', 'गर्भ मे€€€'] },
  { key: 'convulsions', category: 'maternal', danger: true, aliases: ['convulsions', 'convulsion', 'seizure', 'fits', 'दौरे', 'मिर्गी', 'झटके', 'फिट', 'झटक€€€'] },

  // ------------------------------------------------------------------ child
  { key: 'unable_to_drink', category: 'child', danger: true, aliases: ['unable to drink', 'not feeding', 'refuses to feed', 'not able to drink', 'दूध नहीं पी रहा', 'पा€€€'] },
  { key: 'lethargy', category: 'child', danger: true, aliases: ['lethargy', 'lethargic', 'drowsy', 'सुस्ती', 'सुस्त', 'निस्तेज', 'सुस्तपणा'] },
  { key: 'unconsciousness', category: 'child', danger: true, aliases: ['unconsciousness', 'unconscious', 'not responding', 'बेहोशी', 'बेहोश', 'बेशुद्ध', 'शु€€€'] },
  { key: 'sunken_eyes', category: 'child', aliases: ['sunken eyes', 'धँसी आँखें', 'खोल गेलेले डोळे'] },
  { key: 'chest_indrawing', category: 'child', danger: true, aliases: ['chest indrawing', 'chest retraction', 'छाती धंसना', 'छाती आत ओढणे'] },
]

const ALIAS_INDEX: Array<{ alias: string; key: string }> = SYMPTOM_CATALOG.flatMap((s) =>
  [s.key.replace(/_/g, ' '), ...s.aliases].map((alias) => ({ alias: alias.toLowerCase(), key: s.key })),
).sort((a, b) => b.alias.length - a.alias.length)

export const SYMPTOM_BY_KEY: Record<string, SymptomDefinition> = Object.fromEntries(
  SYMPTOM_CATALOG.map((s) => [s.key, s]),
)

/** Maps arbitrary free text (any supported language) onto a canonical key. */
export function normaliseSymptom(raw: string): string | null {
  const text = raw.trim().toLowerCase()
  if (!text) return null
  if (SYMPTOM_BY_KEY[text]) return text
  const snake = text.replace(/[\s-]+/g, '_')
  if (SYMPTOM_BY_KEY[snake]) return snake
  for (const { alias, key } of ALIAS_INDEX) {
    if (text === alias) return key
  }
  for (const { alias, key } of ALIAS_INDEX) {
    if (alias.length >= 4 && text.includes(alias)) return key
  }
  return null
}

/** Finds every canonical symptom mentioned anywhere in a block of text. */
export function extractSymptomsFromText(text: string): string[] {
  const haystack = text.toLowerCase()
  const found = new Set<string>()
  for (const { alias, key } of ALIAS_INDEX) {
    if (alias.length >= 3 && haystack.includes(alias)) found.add(key)
  }
  return [...found]
}

// ---------------------------------------------------------------------------
// Vitals
// ---------------------------------------------------------------------------

export interface VitalsInput {
  temperature?: number | null
  pulse?: number | null
  respiratory_rate?: number | null
  spo2?: number | null
  systolic_bp?: number | null
  diastolic_bp?: number | null
  weight?: number | null
  blood_glucose?: number | null
}

export interface VitalSpec {
  key: keyof VitalsInput
  unit: string
  min: number
  max: number
  step: number
  /** Inclusive normal range for an adult. */
  normal: [number, number]
  decimals: number
}

export const VITAL_SPECS: VitalSpec[] = [
  { key: 'temperature', unit: '°C', min: 30, max: 43, step: 0.1, normal: [36.1, 37.5], decimals: 1 },
  { key: 'pulse', unit: 'BPM', min: 30, max: 220, step: 1, normal: [60, 100], decimals: 0 },
  { key: 'respiratory_rate', unit: '/min', min: 6, max: 90, step: 1, normal: [12, 20], decimals: 0 },
  { key: 'spo2', unit: '%', min: 50, max: 100, step: 1, normal: [95, 100], decimals: 0 },
  { key: 'systolic_bp', unit: 'mmHg', min: 50, max: 260, step: 1, normal: [90, 130], decimals: 0 },
  { key: 'diastolic_bp', unit: 'mmHg', min: 30, max: 180, step: 1, normal: [60, 85], decimals: 0 },
  { key: 'weight', unit: 'kg', min: 1, max: 200, step: 0.1, normal: [3, 120], decimals: 1 },
  { key: 'blood_glucose', unit: 'mg/dL', min: 20, max: 600, step: 1, normal: [70, 140], decimals: 0 },
]

export const VITAL_SPEC_BY_KEY = Object.fromEntries(
  VITAL_SPECS.map((v) => [v.key, v]),
) as Record<keyof VitalsInput, VitalSpec>

// ---------------------------------------------------------------------------
// AI contracts (the exact JSON the server guarantees to return)
// ---------------------------------------------------------------------------

export interface ExtractionResult {
  symptoms: string[]
  duration: string
  severity: string
  additional_observations: string[]
  missing_information: string[]
  /** Set when the response came from the offline rule-based fallback. */
  degraded?: boolean
}

export interface ClinicalAssessment {
  summary: string
  risk: TriageLevel
  reasoning: string[]
  recommendedAction: string
  referralRequired: boolean
  referralUrgency: ReferralUrgency
  facilityType: string
  referralNote: string
  confidence: number
  modelName: string
  degraded?: boolean
}

export interface PatientContext {
  full_name: string
  age: number
  gender: string
  pregnancy_status?: string | null
  health_category?: string | null
  existing_conditions?: string[] | null
  allergies?: string[] | null
}

export interface AssessmentRequest {
  patient: PatientContext
  visit: { visit_type: string; visit_date: string; language: LanguageCode }
  symptoms: Array<{ symptom_name: string; severity?: string | null; duration?: string | null }>
  vitals: VitalsInput
  transcript?: string | null
  /** Deterministic findings, passed so the model cannot contradict them. */
  safetyFindings?: Array<{ code: string; label: string; level: TriageLevel }>
  safetyFloor?: TriageLevel
}

export const TRIAGE_ORDER: Record<TriageLevel, number> = { GREEN: 0, YELLOW: 1, RED: 2 }

export function maxTriage(a: TriageLevel, b: TriageLevel): TriageLevel {
  return TRIAGE_ORDER[a] >= TRIAGE_ORDER[b] ? a : b
}
