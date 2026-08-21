import { VITAL_SPEC_BY_KEY, type VitalsInput } from '../../../shared/clinical'
import type { Member, TriageOutcome } from '../../types/domain'
import type { DraftSymptom } from '../data/types'

export interface ReferralNoteSections {
  patient: string
  visit: string
  concerns: string[]
  vitals: Array<{ label: string; value: string; abnormal: boolean }>
  triage: string
  reason: string
  action: string
  facility: string | null
}

const VITAL_LABELS: Record<keyof VitalsInput, string> = {
  temperature: 'Temperature',
  pulse: 'Pulse',
  respiratory_rate: 'Respiratory rate',
  spo2: 'SpO₂',
  systolic_bp: 'BP (systolic)',
  diastolic_bp: 'BP (diastolic)',
  weight: 'Weight',
  blood_glucose: 'Blood glucose',
}

export function formatVitalsForNote(
  vitals: VitalsInput,
): Array<{ label: string; value: string; abnormal: boolean }> {
  const rows: Array<{ label: string; value: string; abnormal: boolean }> = []

  const push = (key: keyof VitalsInput, label: string, value: string) => {
    const spec = VITAL_SPEC_BY_KEY[key]
    const raw = vitals[key]
    const abnormal =
      typeof raw === 'number' && (raw < spec.normal[0] || raw > spec.normal[1])
    rows.push({ label, value, abnormal })
  }

  if (vitals.temperature != null) push('temperature', VITAL_LABELS.temperature, `${vitals.temperature.toFixed(1)} °C`)
  if (vitals.systolic_bp != null && vitals.diastolic_bp != null) {
    const spec = VITAL_SPEC_BY_KEY.systolic_bp
    const dspec = VITAL_SPEC_BY_KEY.diastolic_bp
    rows.push({
      label: 'Blood pressure',
      value: `${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg`,
      abnormal:
        vitals.systolic_bp < spec.normal[0] ||
        vitals.systolic_bp > spec.normal[1] ||
        vitals.diastolic_bp < dspec.normal[0] ||
        vitals.diastolic_bp > dspec.normal[1],
    })
  } else {
    if (vitals.systolic_bp != null) push('systolic_bp', VITAL_LABELS.systolic_bp, `${vitals.systolic_bp} mmHg`)
    if (vitals.diastolic_bp != null) push('diastolic_bp', VITAL_LABELS.diastolic_bp, `${vitals.diastolic_bp} mmHg`)
  }
  if (vitals.spo2 != null) push('spo2', VITAL_LABELS.spo2, `${vitals.spo2}%`)
  if (vitals.pulse != null) push('pulse', VITAL_LABELS.pulse, `${vitals.pulse} BPM`)
  if (vitals.respiratory_rate != null) push('respiratory_rate', VITAL_LABELS.respiratory_rate, `${vitals.respiratory_rate}/min`)
  if (vitals.weight != null) push('weight', VITAL_LABELS.weight, `${vitals.weight} kg`)
  if (vitals.blood_glucose != null) push('blood_glucose', VITAL_LABELS.blood_glucose, `${vitals.blood_glucose} mg/dL`)

  return rows
}

/** Short human reason used in the PHC queue. */
export function buildReferralReason(outcome: TriageOutcome): string {
  const critical = outcome.findings.filter((f) => f.critical)
  const pool = critical.length ? critical : outcome.findings
  if (pool.length) {
    return pool
      .slice(0, 2)
      .map((f) => (f.detail ? `${f.label} (${f.detail})` : f.label))
      .join('; ')
  }
  return outcome.assessment.reasoning[0] ?? outcome.assessment.summary.slice(0, 140)
}

/**
 * Plain-text referral note. This is what gets copied, printed and stored — the
 * receiving doctor must be able to read it in a few seconds.
 */
export function buildReferralNoteText(args: {
  member: Member
  outcome: TriageOutcome
  symptoms: DraftSymptom[]
  vitals: VitalsInput
  visitDate: Date
  ashaName?: string | null
  ashaCode?: string | null
  facilityName?: string | null
  symptomLabel: (key: string) => string
}): string {
  const { member, outcome, symptoms, vitals, visitDate, symptomLabel } = args
  const dateStr = visitDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const ageStr = member.age < 1 ? `${Math.round(member.age * 12)} months` : `${Math.round(member.age)}`
  const pregnancy =
    member.pregnancy_status !== 'not_applicable' ? ` · ${member.pregnancy_status.replace(/_/g, ' ')}` : ''

  const lines: string[] = [
    'REFERRAL NOTE',
    '',
    'Patient:',
    `${member.full_name}, ${ageStr} · ${member.gender}${pregnancy}`,
    `${member.member_code}${member.village ? ` · ${member.village}` : ''}`,
    '',
    'Visit:',
    `Home visit · ${dateStr}`,
    '',
    'Chief concerns:',
    ...(symptoms.length
      ? symptoms.map(
          (s) =>
            `• ${symptomLabel(s.symptom_name)}${s.severity ? ` (${s.severity})` : ''}${s.duration ? `, ${s.duration}` : ''}`,
        )
      : ['• None recorded']),
  ]

  const vitalRows = formatVitalsForNote(vitals)
  if (vitalRows.length) {
    lines.push('', 'Vitals:', ...vitalRows.map((v) => `${v.label}: ${v.value}${v.abnormal ? '  (abnormal)' : ''}`))
  }

  if (member.existing_conditions.length) {
    lines.push('', 'Known conditions:', ...member.existing_conditions.map((c) => `• ${c}`))
  }
  if (member.allergies.length) {
    lines.push('', 'Allergies:', member.allergies.join(', '))
  }

  lines.push(
    '',
    'Triage:',
    outcome.level === 'RED'
      ? 'RED — URGENT REFERRAL'
      : outcome.level === 'YELLOW'
        ? 'YELLOW — NEEDS MONITORING'
        : 'GREEN — LOW RISK',
    '',
    'Reason:',
    ...outcome.assessment.reasoning.slice(0, 5).map((r) => `• ${r}`),
    '',
    'Recommended action:',
    outcome.assessment.recommendedAction,
  )

  if (outcome.assessment.referralNote?.trim()) {
    lines.push('', 'Clinical hand-off:', outcome.assessment.referralNote.trim())
  }

  if (args.facilityName) {
    lines.push('', 'Referred to:', args.facilityName)
  }

  if (args.ashaName) {
    lines.push(
      '',
      'Raised by:',
      `${args.ashaName}${args.ashaCode ? ` (${args.ashaCode})` : ''}`,
    )
  }

  if (outcome.safetyOverride) {
    lines.push(
      '',
      'Note: this level was set by the deterministic clinical safety rules and cannot be lowered by the AI.',
    )
  }

  lines.push('', '— Clinical decision-support prototype. Not a diagnostic system.')

  return lines.join('\n')
}
