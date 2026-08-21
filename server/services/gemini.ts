import { env } from '../env.js'
import {
  SYMPTOM_CATALOG,
  extractSymptomsFromText,
  normaliseSymptom,
  type AssessmentRequest,
  type ClinicalAssessment,
  type ExtractionResult,
  type TriageLevel,
} from '../../shared/clinical.js'
import { runSafetyEngine } from '../../shared/safetyEngine.js'

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models'

const SYMPTOM_KEYS = SYMPTOM_CATALOG.map((s) => s.key)

type JsonSchema = Record<string, unknown>

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Transient statuses worth retrying: overloaded, rate limited, gateway blips. */
const RETRYABLE = new Set([429, 500, 502, 503, 504])

async function requestOnce(
  model: string,
  systemInstruction: string,
  userPrompt: string,
  schema: JsonSchema,
): Promise<{ ok: true; text: string } | { ok: false; status: number; detail: string }> {
  const res = await fetch(`${API_ROOT}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.gemini.apiKey!,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.9,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    }),
  })

  if (!res.ok) {
    return { ok: false, status: res.status, detail: (await res.text().catch(() => '')).slice(0, 400) }
  }

  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (!text.trim()) return { ok: false, status: 502, detail: 'empty candidate' }
  return { ok: true, text }
}

/**
 * Calls Gemini with structured output, retrying transient failures and falling
 * back to a sibling model if the configured one stays overloaded. A hackathon
 * demo must not drop to the rule engine because of a momentary 503.
 */
async function callGemini(
  systemInstruction: string,
  userPrompt: string,
  schema: JsonSchema,
): Promise<unknown> {
  if (!env.gemini.apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const models = [env.gemini.model, ...env.gemini.fallbackModels.filter((m) => m !== env.gemini.model)]
  let lastError = 'unknown'

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await requestOnce(model, systemInstruction, userPrompt, schema)

      if (result.ok) {
        try {
          return JSON.parse(result.text)
        } catch {
          // Structured output makes this near-unreachable; salvage the object.
          const start = result.text.indexOf('{')
          const end = result.text.lastIndexOf('}')
          if (start !== -1 && end > start) return JSON.parse(result.text.slice(start, end + 1))
          lastError = 'unparseable JSON'
          continue
        }
      }

      lastError = `${result.status}: ${result.detail}`
      if (!RETRYABLE.has(result.status)) break // 400/403/404 will not fix themselves
      await sleep(600 * 2 ** attempt) // 600ms, 1.2s, 2.4s
    }
  }

  throw new Error(`Gemini request failed (${lastError})`)
}

// ---------------------------------------------------------------------------
// Symptom extraction
// ---------------------------------------------------------------------------

const EXTRACTION_SCHEMA: JsonSchema = {
  type: 'OBJECT',
  properties: {
    symptoms: {
      type: 'ARRAY',
      description: 'Canonical symptom keys detected in the transcript.',
      items: { type: 'STRING', enum: SYMPTOM_KEYS },
    },
    other_symptoms: {
      type: 'ARRAY',
      description: 'Symptoms that do not fit the canonical list, in English.',
      items: { type: 'STRING' },
    },
    duration: { type: 'STRING', description: 'How long symptoms have lasted, e.g. "1 day", "since yesterday". Empty string if unclear.' },
    severity: { type: 'STRING', enum: ['mild', 'moderate', 'severe', 'unclear'] },
    additional_observations: { type: 'ARRAY', items: { type: 'STRING' } },
    missing_information: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['symptoms', 'duration', 'severity', 'additional_observations', 'missing_information'],
}

const EXTRACTION_SYSTEM = `You are a clinical language-processing component inside a tele-triage tool used by ASHA community health workers in India.

Your only job is to extract structured findings from what the health worker said. The transcript may be in Hindi, Marathi or English, or a mixture.

Rules:
- Map every symptom you find onto one of the allowed canonical keys. Use "other_symptoms" only when nothing fits.
- Do NOT diagnose. Do NOT invent symptoms that were not mentioned.
- Do NOT infer a symptom from a vital sign — only from what was said.
- "duration" must be a short human phrase copied/normalised from the transcript ("2 days", "since yesterday"). Use "" if unstated.
- "severity" is the worker's overall impression of severity, or "unclear".
- "additional_observations" are short English notes about anything clinically relevant that is not a symptom (e.g. "not eating since morning", "lives 12 km from PHC").
- "missing_information" lists the 1-3 most useful follow-up questions the worker should still ask.
- Reply with JSON only.`

export async function extractSymptoms(input: {
  transcript: string
  language: string
  patient: AssessmentRequest['patient']
  existingSymptoms: string[]
  vitals: AssessmentRequest['vitals']
}): Promise<ExtractionResult> {
  const fallback = (): ExtractionResult => {
    const keys = extractSymptomsFromText(input.transcript)
    const t = input.transcript.toLowerCase()
    const severe = /(बहुत|तेज|भयंकर|खूप|तीव्र|severe|very|high|badly)/.test(t)
    const duration =
      /(कल से|कालपासून|since yesterday|yesterday)/.test(t)
        ? '1 day'
        : /(दो दिन|2 दिन|दोन दिवस|two days|2 days)/.test(t)
          ? '2 days'
          : /(तीन दिन|3 दिन|तीन दिवस|three days|3 days)/.test(t)
            ? '3 days'
            : ''
    return {
      symptoms: keys,
      duration,
      severity: severe ? 'severe' : keys.length ? 'moderate' : 'unclear',
      additional_observations: [],
      missing_information: ['Confirm exact duration of each symptom', 'Ask about any medicines already taken'],
      degraded: true,
    }
  }

  if (!env.gemini.apiKey) return fallback()

  const prompt = [
    `Patient: ${input.patient.full_name}, ${input.patient.age} years, ${input.patient.gender}.`,
    input.patient.pregnancy_status && input.patient.pregnancy_status !== 'not_applicable'
      ? `Pregnancy status: ${input.patient.pregnancy_status}.`
      : '',
    input.patient.existing_conditions?.length
      ? `Known conditions: ${input.patient.existing_conditions.join(', ')}.`
      : '',
    `Language spoken: ${input.language}.`,
    input.existingSymptoms.length
      ? `Symptoms the worker already ticked manually (do not repeat unless also spoken): ${input.existingSymptoms.join(', ')}.`
      : '',
    `Recorded vitals (context only, never treat as a spoken symptom): ${JSON.stringify(input.vitals)}.`,
    '',
    'TRANSCRIPT:',
    input.transcript,
  ]
    .filter(Boolean)
    .join('\n')

  const raw = (await callGemini(EXTRACTION_SYSTEM, prompt, EXTRACTION_SCHEMA)) as {
    symptoms?: unknown
    other_symptoms?: unknown
    duration?: unknown
    severity?: unknown
    additional_observations?: unknown
    missing_information?: unknown
  }

  const asStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : []

  const canonical = new Set<string>()
  for (const s of asStringArray(raw.symptoms)) {
    const key = normaliseSymptom(s)
    if (key) canonical.add(key)
  }
  // Safety net: never miss a key the deterministic matcher can see in the text.
  for (const key of extractSymptomsFromText(input.transcript)) canonical.add(key)

  const others = asStringArray(raw.other_symptoms).filter((s) => !normaliseSymptom(s))
  const severity = typeof raw.severity === 'string' ? raw.severity : 'unclear'

  return {
    symptoms: [...canonical],
    duration: typeof raw.duration === 'string' ? raw.duration : '',
    severity,
    additional_observations: [...asStringArray(raw.additional_observations), ...others.map((o) => `Also reported: ${o}`)],
    missing_information: asStringArray(raw.missing_information).slice(0, 4),
  }
}

// ---------------------------------------------------------------------------
// Clinical assessment
// ---------------------------------------------------------------------------

const ASSESSMENT_SCHEMA: JsonSchema = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING', description: 'Two or three sentences a doctor can read in five seconds.' },
    risk: { type: 'STRING', enum: ['GREEN', 'YELLOW', 'RED'] },
    reasoning: { type: 'ARRAY', description: '2-5 short bullet points justifying the risk level.', items: { type: 'STRING' } },
    recommendedAction: { type: 'STRING', description: 'One clear instruction for the ASHA worker.' },
    referralRequired: { type: 'BOOLEAN' },
    referralUrgency: { type: 'STRING', enum: ['routine', 'soon', 'urgent'] },
    facilityType: { type: 'STRING', enum: ['phc', 'chc', 'hospital', 'government_hospital', 'emergency_facility', 'none'] },
    referralNote: { type: 'STRING', description: 'Concise clinical hand-off paragraph for the receiving doctor.' },
    confidence: { type: 'NUMBER', description: 'Confidence between 0 and 1.' },
  },
  required: ['summary', 'risk', 'reasoning', 'recommendedAction', 'referralRequired', 'referralUrgency', 'facilityType', 'referralNote', 'confidence'],
}

const ASSESSMENT_SYSTEM = `You are the clinical reasoning component of a tele-triage decision-support prototype used by ASHA community health workers in rural India. You are NOT a diagnostic system and must never name a specific diagnosis with certainty.

Your task: given a patient, their symptoms, vitals and the worker's spoken description, produce a triage assessment.

Triage definitions:
- RED: danger signs present. Needs immediate evaluation at a facility today.
- YELLOW: needs monitoring or a timely (24-72h) PHC/CHC review.
- GREEN: no danger signs. Home care and routine follow-up are appropriate.

Hard constraints:
- A deterministic rule engine has already run. Its findings are given to you as SAFETY FINDINGS, together with a SAFETY FLOOR. You MUST NOT return a risk lower than the SAFETY FLOOR. You MAY raise it.
- Every point in "reasoning" must be traceable to a symptom, a vital sign or the transcript. Never invent findings.
- Be cautious: when information is thin, prefer the higher risk level.
- "recommendedAction" is addressed to the health worker, in plain imperative English, one sentence.
- "referralNote" is addressed to the receiving doctor: patient, key findings, vitals of concern, why referred. 3-5 short sentences, no salutation, no signature.
- Reply with JSON only.`

function heuristicAssessment(req: AssessmentRequest, safetyFloor: TriageLevel): ClinicalAssessment {
  const safety = runSafetyEngine({
    age: req.patient.age,
    pregnancyStatus: req.patient.pregnancy_status,
    symptoms: req.symptoms,
    vitals: req.vitals,
  })
  const risk = safetyFloor
  const names = req.symptoms.map((s) => s.symptom_name.replace(/_/g, ' ')).join(', ') || 'no specific symptoms recorded'
  const critical = safety.findings.filter((f) => f.critical)
  const vitalBits: string[] = []
  const v = req.vitals
  if (v.temperature != null) vitalBits.push(`temperature ${v.temperature} °C`)
  if (v.spo2 != null) vitalBits.push(`SpO₂ ${v.spo2}%`)
  if (v.pulse != null) vitalBits.push(`pulse ${v.pulse} BPM`)
  if (v.systolic_bp != null && v.diastolic_bp != null) vitalBits.push(`BP ${v.systolic_bp}/${v.diastolic_bp} mmHg`)
  if (v.respiratory_rate != null) vitalBits.push(`respiratory rate ${v.respiratory_rate}/min`)

  const summary = `${req.patient.full_name}, ${req.patient.age} years — reported ${names}.${
    vitalBits.length ? ` Recorded ${vitalBits.join(', ')}.` : ''
  } ${
    risk === 'RED'
      ? 'Danger signs detected by the clinical safety rules; urgent evaluation is indicated.'
      : risk === 'YELLOW'
        ? 'No immediate danger signs, but findings warrant a timely clinical review.'
        : 'No danger signs detected by the clinical safety rules.'
  }`

  const recommendedAction =
    risk === 'RED'
      ? 'Arrange immediate transport to the nearest appropriate health facility and inform the PHC doctor now.'
      : risk === 'YELLOW'
        ? 'Review the patient at the PHC within 24-72 hours and monitor for any danger sign.'
        : 'Advise home care, fluids and rest; follow up at the next scheduled visit.'

  const referralNote = [
    `${req.patient.full_name}, ${req.patient.age}y ${req.patient.gender}${
      req.patient.pregnancy_status && req.patient.pregnancy_status !== 'not_applicable'
        ? ` (${req.patient.pregnancy_status.replace(/_/g, ' ')})`
        : ''
    }.`,
    `Reported: ${names}.`,
    vitalBits.length ? `Vitals: ${vitalBits.join(', ')}.` : '',
    (critical.length ? critical : safety.findings).length
      ? `Concerning findings: ${(critical.length ? critical : safety.findings).map((f) => f.label).join('; ')}.`
      : 'No concerning findings on rule-based screening.',
    risk === 'RED'
      ? 'Referred for urgent clinical evaluation.'
      : risk === 'YELLOW'
        ? 'Referred for timely review.'
        : 'No referral raised.',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    summary,
    risk,
    reasoning: safety.findings.length
      ? safety.findings.map((f) => (f.detail ? `${f.label} (${f.detail})` : f.label))
      : ['No danger signs matched by the deterministic rule engine.'],
    recommendedAction,
    referralRequired: risk !== 'GREEN',
    referralUrgency: risk === 'RED' ? 'urgent' : risk === 'YELLOW' ? 'soon' : 'routine',
    facilityType: risk === 'RED' ? 'government_hospital' : risk === 'YELLOW' ? 'phc' : 'none',
    referralNote,
    confidence: 0.6,
    modelName: 'rule-engine-fallback',
    degraded: true,
  }
}

export async function assess(req: AssessmentRequest): Promise<ClinicalAssessment> {
  const safety = runSafetyEngine({
    age: req.patient.age,
    pregnancyStatus: req.patient.pregnancy_status,
    symptoms: req.symptoms,
    vitals: req.vitals,
  })
  const floor = safety.floor

  if (!env.gemini.apiKey) return heuristicAssessment(req, floor)

  const v = req.vitals
  const vitalLines = Object.entries(v)
    .filter(([, val]) => val !== null && val !== undefined && Number.isFinite(Number(val)))
    .map(([k, val]) => `  - ${k.replace(/_/g, ' ')}: ${val}`)
    .join('\n')

  const prompt = [
    'PATIENT',
    `  name: ${req.patient.full_name}`,
    `  age: ${req.patient.age}`,
    `  gender: ${req.patient.gender}`,
    `  pregnancy status: ${req.patient.pregnancy_status ?? 'not applicable'}`,
    `  health category: ${req.patient.health_category ?? 'general'}`,
    `  existing conditions: ${req.patient.existing_conditions?.join(', ') || 'none recorded'}`,
    `  allergies: ${req.patient.allergies?.join(', ') || 'none recorded'}`,
    '',
    'VISIT',
    `  type: ${req.visit.visit_type}`,
    `  date: ${req.visit.visit_date}`,
    `  language spoken: ${req.visit.language}`,
    '',
    'SYMPTOMS',
    req.symptoms.length
      ? req.symptoms
          .map((s) => `  - ${s.symptom_name.replace(/_/g, ' ')}${s.severity ? ` (${s.severity})` : ''}${s.duration ? `, ${s.duration}` : ''}`)
          .join('\n')
      : '  (none recorded)',
    '',
    'VITALS',
    vitalLines || '  (none recorded)',
    '',
    'WORKER TRANSCRIPT (verbatim, original language)',
    req.transcript?.trim() || '  (no voice recording)',
    '',
    'SAFETY FINDINGS (deterministic rule engine — authoritative)',
    safety.findings.length
      ? safety.findings
          .map((f) => `  - [${f.level}${f.critical ? ', CRITICAL' : ''}] ${f.label}${f.detail ? ` (${f.detail})` : ''}`)
          .join('\n')
      : '  (no rules triggered)',
    '',
    `SAFETY FLOOR: ${floor}. You must not return a risk below this level.`,
  ].join('\n')

  try {
    const raw = (await callGemini(ASSESSMENT_SYSTEM, prompt, ASSESSMENT_SCHEMA)) as Record<string, unknown>

    const str = (k: string, fallbackValue = ''): string =>
      typeof raw[k] === 'string' && (raw[k] as string).trim() ? (raw[k] as string).trim() : fallbackValue
    const arr = (k: string): string[] =>
      Array.isArray(raw[k]) ? (raw[k] as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : []

    const aiRisk = (['GREEN', 'YELLOW', 'RED'] as const).includes(raw.risk as TriageLevel)
      ? (raw.risk as TriageLevel)
      : null

    const heuristic = heuristicAssessment(req, floor)

    const urgencyRaw = str('referralUrgency')
    const urgency = (['routine', 'soon', 'urgent'] as const).includes(urgencyRaw as never)
      ? (urgencyRaw as ClinicalAssessment['referralUrgency'])
      : heuristic.referralUrgency

    const confidence = typeof raw.confidence === 'number' && raw.confidence >= 0 && raw.confidence <= 1 ? raw.confidence : 0.75

    return {
      summary: str('summary', heuristic.summary),
      // Reconciliation with the safety floor happens on the client, which owns
      // the final triage decision; we still never report below the floor here.
      risk: aiRisk ?? floor,
      reasoning: arr('reasoning').length ? arr('reasoning') : heuristic.reasoning,
      recommendedAction: str('recommendedAction', heuristic.recommendedAction),
      referralRequired: typeof raw.referralRequired === 'boolean' ? raw.referralRequired : heuristic.referralRequired,
      referralUrgency: urgency,
      facilityType: str('facilityType', heuristic.facilityType),
      referralNote: str('referralNote', heuristic.referralNote),
      confidence,
      modelName: env.gemini.model,
    }
  } catch (err) {
    const fb = heuristicAssessment(req, floor)
    return {
      ...fb,
      modelName: `${env.gemini.model} (unavailable → rule engine)`,
      summary: `${fb.summary}`,
      degraded: true,
      // Surface the reason without leaking internals to the UI.
      reasoning: fb.reasoning,
      confidence: 0.5,
      ...(process.env.NODE_ENV !== 'production' ? { debug: String(err) } : {}),
    } as ClinicalAssessment
  }
}
