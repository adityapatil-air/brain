import type {
  AssessmentRequest,
  ClinicalAssessment,
  ExtractionResult,
  LanguageCode,
  PatientContext,
  VitalsInput,
} from '../../../shared/clinical'
import { reconcileTriage, runSafetyEngine } from '../../../shared/safetyEngine'
import type { TriageOutcome } from '../../types/domain'
import type { DraftSymptom } from '../data/types'

export class ClinicalAIError extends Error {
  constructor(
    public readonly code: 'EXTRACTION_FAILED' | 'ASSESSMENT_FAILED',
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'ClinicalAIError'
  }
}

async function postJson<T>(path: string, body: unknown, code: ClinicalAIError['code']): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ClinicalAIError(code, 'The clinical AI service is unreachable.')
  }
  if (!res.ok) throw new ClinicalAIError(code)
  return (await res.json()) as T
}

/**
 * All model calls live behind this service. React components never talk to
 * Gemini, and never see a model name or prompt.
 */
export const ClinicalAIService = {
  async extractSymptoms(input: {
    transcript: string
    language: LanguageCode
    patient: PatientContext
    existingSymptoms: string[]
    vitals: VitalsInput
  }): Promise<ExtractionResult> {
    return postJson<ExtractionResult>('/api/ai/extract', input, 'EXTRACTION_FAILED')
  },

  async assess(input: AssessmentRequest): Promise<ClinicalAssessment> {
    return postJson<ClinicalAssessment>('/api/ai/assess', input, 'ASSESSMENT_FAILED')
  },
}

/**
 * Runs the full triage pipeline: deterministic rules first, then the AI, then
 * reconciliation. A critical rule always wins — the AI cannot downgrade it.
 *
 * If the AI call fails this still returns a usable outcome built purely from
 * the rule engine, with `assessment.degraded === true`.
 */
export async function runTriage(input: {
  patient: PatientContext
  visit: { visit_type: string; visit_date: string; language: LanguageCode }
  symptoms: DraftSymptom[]
  vitals: VitalsInput
  transcript: string | null
  onStage?: (stage: 'safety' | 'ai' | 'triage') => void
}): Promise<TriageOutcome> {
  input.onStage?.('safety')

  const safety = runSafetyEngine({
    age: input.patient.age,
    pregnancyStatus: input.patient.pregnancy_status,
    symptoms: input.symptoms.map((s) => ({ symptom_name: s.symptom_name, severity: s.severity })),
    vitals: input.vitals,
  })

  input.onStage?.('ai')

  let assessment: ClinicalAssessment
  try {
    assessment = await ClinicalAIService.assess({
      patient: input.patient,
      visit: input.visit,
      symptoms: input.symptoms.map((s) => ({
        symptom_name: s.symptom_name,
        severity: s.severity,
        duration: s.duration,
      })),
      vitals: input.vitals,
      transcript: input.transcript,
      safetyFindings: safety.findings.map((f) => ({ code: f.code, label: f.label, level: f.level })),
      safetyFloor: safety.floor,
    })
  } catch {
    // The service already degrades gracefully server-side; this path covers a
    // total network failure. Build the outcome from the rule engine alone.
    assessment = buildLocalAssessment(input, safety.floor, safety.findings.map((f) => f.label))
  }

  input.onStage?.('triage')

  const { level, overrodeAi } = reconcileTriage(safety, assessment.risk)

  return {
    level,
    aiRisk: assessment.degraded ? null : assessment.risk,
    safetyOverride: overrodeAi,
    findings: safety.findings,
    assessment: {
      ...assessment,
      risk: level,
      referralRequired: level !== 'GREEN' ? true : assessment.referralRequired,
      referralUrgency:
        level === 'RED' ? 'urgent' : level === 'YELLOW' ? assessment.referralUrgency === 'urgent' ? 'urgent' : 'soon' : 'routine',
    },
  }
}

function buildLocalAssessment(
  input: {
    patient: PatientContext
    symptoms: DraftSymptom[]
    vitals: VitalsInput
  },
  floor: TriageOutcome['level'],
  findingLabels: string[],
): ClinicalAssessment {
  const names = input.symptoms.map((s) => s.symptom_name.replace(/_/g, ' ')).join(', ')
  const v = input.vitals
  const vitalBits: string[] = []
  if (v.temperature != null) vitalBits.push(`temperature ${v.temperature} °C`)
  if (v.spo2 != null) vitalBits.push(`SpO₂ ${v.spo2}%`)
  if (v.pulse != null) vitalBits.push(`pulse ${v.pulse} BPM`)
  if (v.systolic_bp != null && v.diastolic_bp != null) vitalBits.push(`BP ${v.systolic_bp}/${v.diastolic_bp} mmHg`)

  const action =
    floor === 'RED'
      ? 'Arrange immediate transport to the nearest appropriate health facility and inform the PHC doctor now.'
      : floor === 'YELLOW'
        ? 'Review the patient at the PHC within 24-72 hours and monitor for any danger sign.'
        : 'Advise home care, fluids and rest; follow up at the next scheduled visit.'

  return {
    summary: `${input.patient.full_name}, ${input.patient.age} — reported ${names || 'no specific symptoms'}.${
      vitalBits.length ? ` Recorded ${vitalBits.join(', ')}.` : ''
    }`,
    risk: floor,
    reasoning: findingLabels.length ? findingLabels : ['No danger signs matched by the deterministic rule engine.'],
    recommendedAction: action,
    referralRequired: floor !== 'GREEN',
    referralUrgency: floor === 'RED' ? 'urgent' : floor === 'YELLOW' ? 'soon' : 'routine',
    facilityType: floor === 'RED' ? 'government_hospital' : floor === 'YELLOW' ? 'phc' : 'none',
    referralNote: [
      `${input.patient.full_name}, ${input.patient.age}y ${input.patient.gender}.`,
      names ? `Reported: ${names}.` : '',
      vitalBits.length ? `Vitals: ${vitalBits.join(', ')}.` : '',
      findingLabels.length ? `Concerning findings: ${findingLabels.join('; ')}.` : '',
    ]
      .filter(Boolean)
      .join(' '),
    confidence: 0.5,
    modelName: 'rule-engine-offline',
    degraded: true,
  }
}
