import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ExtractionResult, LanguageCode, VitalsInput } from '../../shared/clinical'
import type { DraftSymptom } from '../services/data/types'
import type { FacilityResult } from '../services/maps/MapsService'
import type { TriageOutcome, VisitType } from '../types/domain'

export type VitalKey = keyof VitalsInput

/** Vitals are held as raw strings so half-typed values are never destroyed. */
export type VitalDraft = Partial<Record<VitalKey, string>>

export interface VisitDraft {
  memberId: string | null
  visitType: VisitType
  language: LanguageCode
  symptoms: DraftSymptom[]
  otherSymptoms: string
  vitals: VitalDraft
  transcript: string
  transcriptAccepted: boolean
  transcriptSimulated: boolean
  extraction: ExtractionResult | null
  outcome: TriageOutcome | null
  referralNote: string | null
  facility: FacilityResult | null
  step: number
  savedVisitId: string | null
  savedReferralId: string | null
  startedAt: string
}

const STORAGE_KEY = 'ashacare.visitDraft.v1'

export function emptyDraft(memberId: string | null = null): VisitDraft {
  return {
    memberId,
    visitType: 'home_visit',
    language: 'hi',
    symptoms: [],
    otherSymptoms: '',
    vitals: {},
    transcript: '',
    transcriptAccepted: false,
    transcriptSimulated: false,
    extraction: null,
    outcome: null,
    referralNote: null,
    facility: null,
    step: 0,
    savedVisitId: null,
    savedReferralId: null,
    startedAt: new Date().toISOString(),
  }
}

function load(): VisitDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as VisitDraft
    if (typeof parsed !== 'object' || parsed === null) return null
    return { ...emptyDraft(), ...parsed }
  } catch {
    return null
  }
}

interface DraftApi {
  draft: VisitDraft
  patch: (updates: Partial<VisitDraft>) => void
  /** Adds or replaces a symptom, preserving severity/duration already entered. */
  upsertSymptom: (symptom: DraftSymptom) => void
  removeSymptom: (name: string) => void
  toggleSymptom: (name: string, category: string) => void
  setVital: (key: VitalKey, value: string) => void
  reset: (memberId?: string | null) => void
  /** Parsed, validated vitals ready for the API and the database. */
  parsedVitals: VitalsInput
}

const DraftContext = createContext<DraftApi | null>(null)

export function VisitDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<VisitDraft>(() => load() ?? emptyDraft())
  const saveTimer = useRef<number | null>(null)

  // Persist to sessionStorage, debounced so typing stays smooth.
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
      } catch {
        /* ignore quota errors */
      }
    }, 200)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [draft])

  const patch = useCallback((updates: Partial<VisitDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }))
  }, [])

  const upsertSymptom = useCallback((symptom: DraftSymptom) => {
    setDraft((prev) => {
      const existing = prev.symptoms.find((s) => s.symptom_name === symptom.symptom_name)
      if (!existing) return { ...prev, symptoms: [...prev.symptoms, symptom] }
      return {
        ...prev,
        symptoms: prev.symptoms.map((s) =>
          s.symptom_name === symptom.symptom_name ? { ...s, ...symptom } : s,
        ),
      }
    })
  }, [])

  const removeSymptom = useCallback((name: string) => {
    setDraft((prev) => ({
      ...prev,
      symptoms: prev.symptoms.filter((s) => s.symptom_name !== name),
    }))
  }, [])

  const toggleSymptom = useCallback((name: string, category: string) => {
    setDraft((prev) => {
      const exists = prev.symptoms.some((s) => s.symptom_name === name)
      if (exists) {
        return { ...prev, symptoms: prev.symptoms.filter((s) => s.symptom_name !== name) }
      }
      return {
        ...prev,
        symptoms: [
          ...prev.symptoms,
          { symptom_name: name, category, severity: null, duration: null, source: 'manual' },
        ],
      }
    })
  }, [])

  const setVital = useCallback((key: VitalKey, value: string) => {
    setDraft((prev) => ({ ...prev, vitals: { ...prev.vitals, [key]: value } }))
  }, [])

  const reset = useCallback((memberId: string | null = null) => {
    const fresh = emptyDraft(memberId)
    setDraft(fresh)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    } catch {
      /* ignore */
    }
  }, [])

  const parsedVitals = useMemo<VitalsInput>(() => {
    const out: VitalsInput = {}
    for (const [key, raw] of Object.entries(draft.vitals)) {
      if (raw === undefined || raw === null || String(raw).trim() === '') continue
      const num = Number(raw)
      if (Number.isFinite(num)) out[key as VitalKey] = num
    }
    return out
  }, [draft.vitals])

  const value = useMemo<DraftApi>(
    () => ({
      draft,
      patch,
      upsertSymptom,
      removeSymptom,
      toggleSymptom,
      setVital,
      reset,
      parsedVitals,
    }),
    [draft, patch, upsertSymptom, removeSymptom, toggleSymptom, setVital, reset, parsedVitals],
  )

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
}

export function useVisitDraft(): DraftApi {
  const ctx = useContext(DraftContext)
  if (!ctx) throw new Error('useVisitDraft must be used inside <VisitDraftProvider>')
  return ctx
}
