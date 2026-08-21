/**
 * Deterministic clinical safety engine.
 *
 * This runs INDEPENDENTLY of the language model. Rules here are hard-coded,
 * auditable and cannot be overridden by AI output: if a critical rule fires,
 * the final triage level is RED regardless of what the model says.
 *
 * Rule sources: WHO/IMNCI danger signs and Indian maternal-health (LaQshya /
 * SUMAN) referral triggers, simplified for a field decision-support prototype.
 */

import {
  maxTriage,
  type Severity,
  type TriageLevel,
  type VitalsInput,
} from './clinical.js'

export interface SafetyFinding {
  code: string
  /** English label. The UI resolves `code` through i18n and falls back here. */
  label: string
  level: TriageLevel
  /** `true` for rules that the AI may never downgrade. */
  critical: boolean
  detail?: string
}

export interface SafetyInput {
  age: number
  pregnancyStatus?: string | null
  symptoms: Array<{ symptom_name: string; severity?: string | null }>
  vitals: VitalsInput
}

export interface SafetyResult {
  findings: SafetyFinding[]
  /** Highest level any rule produced. AI can raise this, never lower it. */
  floor: TriageLevel
  /** `true` if at least one critical (non-overridable) rule fired. */
  hasCritical: boolean
}

const isChild = (age: number) => age < 5
const isInfant = (age: number) => age < 1

function has(input: SafetyInput, key: string): { present: boolean; severity: Severity | null } {
  const hit = input.symptoms.find((s) => s.symptom_name === key)
  if (!hit) return { present: false, severity: null }
  const sev = (hit.severity ?? '').toLowerCase()
  return {
    present: true,
    severity: sev === 'severe' || sev === 'moderate' || sev === 'mild' ? (sev as Severity) : null,
  }
}

const isPregnant = (input: SafetyInput) => {
  const p = (input.pregnancyStatus ?? '').toLowerCase()
  return p === 'pregnant' || p === 'postnatal'
}

export function runSafetyEngine(input: SafetyInput): SafetyResult {
  const findings: SafetyFinding[] = []
  const v = input.vitals
  const push = (f: SafetyFinding) => findings.push(f)
  const num = (x: number | null | undefined): number | null =>
    typeof x === 'number' && Number.isFinite(x) ? x : null

  // ----------------------------------------------------- critical: vitals
  const sys = num(v.systolic_bp)
  const dia = num(v.diastolic_bp)
  const spo2 = num(v.spo2)
  const temp = num(v.temperature)
  const pulse = num(v.pulse)
  const rr = num(v.respiratory_rate)
  const glucose = num(v.blood_glucose)

  if (sys !== null && sys >= 160) {
    push({ code: 'bp_systolic_severe', label: 'Severe hypertension — systolic BP at or above 160 mmHg', level: 'RED', critical: true, detail: `${sys} mmHg` })
  } else if (sys !== null && sys >= 140) {
    push({ code: 'bp_systolic_raised', label: 'Raised systolic blood pressure', level: 'YELLOW', critical: false, detail: `${sys} mmHg` })
  } else if (sys !== null && sys < 90) {
    push({ code: 'bp_systolic_low', label: 'Low systolic blood pressure — possible shock', level: 'RED', critical: true, detail: `${sys} mmHg` })
  }

  if (dia !== null && dia >= 110) {
    push({ code: 'bp_diastolic_severe', label: 'Severe hypertension — diastolic BP at or above 110 mmHg', level: 'RED', critical: true, detail: `${dia} mmHg` })
  } else if (dia !== null && dia >= 90) {
    push({ code: 'bp_diastolic_raised', label: 'Raised diastolic blood pressure', level: 'YELLOW', critical: false, detail: `${dia} mmHg` })
  }

  if (spo2 !== null && spo2 < 90) {
    push({ code: 'spo2_critical', label: 'Oxygen saturation below 90% — hypoxia', level: 'RED', critical: true, detail: `SpO₂ ${spo2}%` })
  } else if (spo2 !== null && spo2 < 94) {
    push({ code: 'spo2_low', label: 'Oxygen saturation below 94%', level: 'YELLOW', critical: false, detail: `SpO₂ ${spo2}%` })
  }

  if (temp !== null && temp >= 40) {
    push({ code: 'temp_critical', label: 'Very high fever at or above 40 °C', level: 'RED', critical: true, detail: `${temp.toFixed(1)} °C` })
  } else if (temp !== null && temp >= 38.5) {
    push({ code: 'temp_high', label: 'High fever', level: 'YELLOW', critical: false, detail: `${temp.toFixed(1)} °C` })
  } else if (temp !== null && temp < 35.5) {
    push({ code: 'temp_low', label: 'Low body temperature — hypothermia', level: 'RED', critical: true, detail: `${temp.toFixed(1)} °C` })
  }

  if (isInfant(input.age)) {
    if (rr !== null && rr >= 60) push({ code: 'rr_infant_fast', label: 'Fast breathing for age (infant, 60/min or more)', level: 'RED', critical: true, detail: `${rr}/min` })
  } else if (isChild(input.age)) {
    if (rr !== null && rr >= 50) push({ code: 'rr_child_fast', label: 'Fast breathing for age (child under 5, 50/min or more)', level: 'RED', critical: true, detail: `${rr}/min` })
  } else if (rr !== null && rr >= 30) {
    push({ code: 'rr_adult_fast', label: 'Fast breathing — respiratory rate 30/min or more', level: 'RED', critical: true, detail: `${rr}/min` })
  } else if (rr !== null && rr >= 24) {
    push({ code: 'rr_adult_raised', label: 'Raised respiratory rate', level: 'YELLOW', critical: false, detail: `${rr}/min` })
  }

  if (pulse !== null && (pulse >= 130 || pulse < 45)) {
    push({ code: 'pulse_critical', label: 'Dangerous pulse rate', level: 'RED', critical: true, detail: `${pulse} BPM` })
  } else if (pulse !== null && (pulse > 110 || pulse < 55)) {
    push({ code: 'pulse_abnormal', label: 'Abnormal pulse rate', level: 'YELLOW', critical: false, detail: `${pulse} BPM` })
  }

  if (glucose !== null && (glucose < 55 || glucose >= 300)) {
    push({ code: 'glucose_critical', label: 'Dangerous blood glucose level', level: 'RED', critical: true, detail: `${glucose} mg/dL` })
  } else if (glucose !== null && (glucose < 70 || glucose >= 200)) {
    push({ code: 'glucose_abnormal', label: 'Abnormal blood glucose level', level: 'YELLOW', critical: false, detail: `${glucose} mg/dL` })
  }

  // -------------------------------------------------- critical: danger signs
  const convulsions = has(input, 'convulsions')
  if (convulsions.present) {
    push({ code: 'convulsions', label: 'Convulsions reported', level: 'RED', critical: true })
  }

  const unconscious = has(input, 'unconsciousness')
  if (unconscious.present) {
    push({ code: 'unconsciousness', label: 'Unconscious or not responding', level: 'RED', critical: true })
  }

  const breathing = has(input, 'difficulty_breathing')
  if (breathing.present) {
    if (breathing.severity === 'severe' || (spo2 !== null && spo2 < 94) || breathing.severity === null) {
      push({
        code: 'breathing_severe',
        label: 'Difficulty breathing — respiratory distress',
        level: 'RED',
        critical: true,
      })
    } else {
      push({ code: 'breathing_mild', label: 'Difficulty breathing reported', level: 'YELLOW', critical: false })
    }
  }

  if (has(input, 'fast_breathing').present) {
    push({ code: 'fast_breathing', label: 'Fast breathing reported', level: 'RED', critical: true })
  }
  if (has(input, 'chest_indrawing').present) {
    push({ code: 'chest_indrawing', label: 'Chest indrawing — severe pneumonia sign', level: 'RED', critical: true })
  }

  const bleeding = has(input, 'vaginal_bleeding')
  if (bleeding.present) {
    const severe = bleeding.severity === 'severe' || bleeding.severity === 'moderate' || bleeding.severity === null
    push({
      code: severe ? 'bleeding_severe' : 'bleeding',
      label: severe ? 'Severe bleeding' : 'Bleeding reported',
      level: severe ? 'RED' : 'YELLOW',
      critical: severe,
    })
  }

  // ------------------------------------------------------ maternal specifics
  if (isPregnant(input)) {
    const severeHeadache = has(input, 'severe_headache').present
    const blurred = has(input, 'blurred_vision').present
    const swelling = has(input, 'swelling').present
    const raisedBp = (sys !== null && sys >= 140) || (dia !== null && dia >= 90)

    if (has(input, 'severe_abdominal_pain').present) {
      push({ code: 'maternal_abdominal_pain', label: 'Severe abdominal pain in pregnancy', level: 'RED', critical: true })
    }
    if (has(input, 'reduced_fetal_movement').present) {
      push({ code: 'reduced_fetal_movement', label: 'Reduced or absent fetal movement', level: 'RED', critical: true })
    }
    if (raisedBp && (severeHeadache || blurred)) {
      push({
        code: 'pre_eclampsia',
        label: 'Raised blood pressure with severe headache or blurred vision — possible pre-eclampsia',
        level: 'RED',
        critical: true,
      })
    } else if (severeHeadache || blurred) {
      push({ code: 'maternal_neuro_sign', label: 'Severe headache or blurred vision in pregnancy', level: 'YELLOW', critical: false })
    }
    if (swelling && raisedBp) {
      push({ code: 'maternal_oedema_bp', label: 'Swelling with raised blood pressure', level: 'YELLOW', critical: false })
    }
  }

  // --------------------------------------------------------- child specifics
  if (isChild(input.age)) {
    if (has(input, 'unable_to_drink').present) {
      push({ code: 'child_unable_to_drink', label: 'Child unable to drink or feed — IMNCI danger sign', level: 'RED', critical: true })
    }
    if (has(input, 'lethargy').present) {
      push({ code: 'child_lethargy', label: 'Lethargic or unusually drowsy child — IMNCI danger sign', level: 'RED', critical: true })
    }
    const vomiting = has(input, 'vomiting')
    if (vomiting.present && vomiting.severity === 'severe') {
      push({ code: 'child_vomiting_everything', label: 'Child vomiting everything — IMNCI danger sign', level: 'RED', critical: true })
    }
    const diarrhea = has(input, 'diarrhea')
    if (diarrhea.present && has(input, 'sunken_eyes').present) {
      push({ code: 'child_dehydration', label: 'Diarrhoea with signs of dehydration', level: 'RED', critical: true })
    } else if (diarrhea.present && vomiting.present) {
      push({ code: 'child_diarrhea_vomiting', label: 'Diarrhoea with vomiting in a young child', level: 'YELLOW', critical: false })
    }
    if (temp !== null && temp >= 38 && input.age < 0.25) {
      push({ code: 'neonate_fever', label: 'Fever in a newborn', level: 'RED', critical: true })
    }
  }

  // -------------------------------------------------------- symptom clusters
  const fever = has(input, 'fever').present
  if (fever && has(input, 'cough').present && !breathing.present) {
    push({ code: 'febrile_respiratory', label: 'Fever with cough — needs review', level: 'YELLOW', critical: false })
  }
  if (has(input, 'dizziness').present && has(input, 'weakness').present) {
    push({ code: 'weak_dizzy', label: 'Weakness with dizziness — possible anaemia or dehydration', level: 'YELLOW', critical: false })
  }
  if (has(input, 'chest_pain').present) {
    push({ code: 'chest_pain', label: 'Chest pain reported', level: 'YELLOW', critical: false })
  }
  if (has(input, 'diarrhea').present && has(input, 'vomiting').present && !isChild(input.age)) {
    push({ code: 'gi_fluid_loss', label: 'Diarrhoea with vomiting — risk of dehydration', level: 'YELLOW', critical: false })
  }

  const floor = findings.reduce<TriageLevel>((acc, f) => maxTriage(acc, f.level), 'GREEN')
  const hasCritical = findings.some((f) => f.critical)

  return { findings, floor: hasCritical ? 'RED' : floor, hasCritical }
}

/**
 * Combines the deterministic result with the AI assessment.
 * A critical deterministic finding is a hard floor of RED.
 */
export function reconcileTriage(
  safety: SafetyResult,
  aiRisk: TriageLevel | null,
): { level: TriageLevel; overrodeAi: boolean } {
  if (safety.hasCritical) {
    return { level: 'RED', overrodeAi: aiRisk !== null && aiRisk !== 'RED' }
  }
  if (!aiRisk) return { level: safety.floor, overrodeAi: false }
  const level = maxTriage(safety.floor, aiRisk)
  return { level, overrodeAi: level !== aiRisk }
}
