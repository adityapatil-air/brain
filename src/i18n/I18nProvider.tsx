import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { LanguageCode } from '../../shared/clinical'
import { DICTIONARIES, en, LANGUAGES, type TKey } from './translations'
import { transliterate } from './transliterator'

const STORAGE_KEY = 'ashacare.language'
const TRANSLITERATION_MODE_KEY = 'ashacare.transliteration'

interface I18nValue {
  lang: LanguageCode
  setLang: (lang: LanguageCode) => void
  /** Use transliteration mode (phonetic script conversion) instead of translation */
  transliterationMode: boolean
  setTransliterationMode: (mode: boolean) => void
  /** Translate a key, substituting `{placeholders}`. Falls back to English. */
  t: (key: TKey, vars?: Record<string, string | number>) => string
  /** Translate a dynamic key that may not exist (rules, symptoms). */
  tDynamic: (key: string, fallback: string, vars?: Record<string, string | number>) => string
  languages: typeof LANGUAGES
}

const I18nContext = createContext<I18nValue | null>(null)

function readInitial(): LanguageCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'hi' || stored === 'mr' || stored === 'hinglish') return stored as LanguageCode
  } catch {
    /* localStorage may be unavailable in private mode */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en'
  if (nav.startsWith('mr')) return 'mr'
  if (nav.startsWith('hi')) return 'hi'
  return 'en'
}

function readTransliterationMode(): boolean {
  try {
    const stored = localStorage.getItem(TRANSLITERATION_MODE_KEY)
    if (stored === 'true' || stored === 'false') return stored === 'true'
  } catch {
    /* localStorage may be unavailable in private mode */
  }
  return false
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  )
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(readInitial)
  const [transliterationMode, setTransliterationModeState] = useState(readTransliterationMode)

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* ignore */
    }
  }, [lang])

  useEffect(() => {
    try {
      localStorage.setItem(TRANSLITERATION_MODE_KEY, String(transliterationMode))
    } catch {
      /* ignore */
    }
  }, [transliterationMode])

  const setLang = useCallback((next: LanguageCode) => setLangState(next), [])
  const setTransliterationMode = useCallback(
    (mode: boolean) => setTransliterationModeState(mode),
    [],
  )

  const t = useCallback<I18nValue['t']>(
    (key, vars) => {
      if (lang === 'en') {
        // English - no translation or transliteration needed
        const value = en[key] ?? String(key)
        return interpolate(value, vars)
      }

      if (transliterationMode) {
        // Transliteration mode: phonetically convert English text to script
        const englishText = en[key] ?? String(key)
        const transliteratedText = transliterate(englishText, lang)
        return interpolate(transliteratedText, vars)
      } else {
        // Translation mode: use full translations (existing behavior)
        const dict = DICTIONARIES[lang]
        const value = dict[key] ?? en[key] ?? String(key)
        return interpolate(value, vars)
      }
    },
    [lang, transliterationMode],
  )

  const tDynamic = useCallback<I18nValue['tDynamic']>(
    (key, fallback, vars) => {
      if (lang === 'en') {
        // English - no translation or transliteration needed
        const enDict = en as Record<string, string | undefined>
        const value = enDict[key] ?? fallback
        return interpolate(value, vars)
      }

      if (transliterationMode) {
        // Transliteration mode: phonetically convert English text to script
        const enDict = en as Record<string, string | undefined>
        const englishText = enDict[key] ?? fallback
        const transliteratedText = transliterate(englishText, lang)
        return interpolate(transliteratedText, vars)
      } else {
        // Translation mode: use full translations
        const dict = DICTIONARIES[lang] as Record<string, string | undefined>
        const enDict = en as Record<string, string | undefined>
        const value = dict[key] ?? enDict[key] ?? fallback
        return interpolate(value, vars)
      }
    },
    [lang, transliterationMode],
  )

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      transliterationMode,
      setTransliterationMode,
      t,
      tDynamic,
      languages: LANGUAGES,
    }),
    [lang, setLang, transliterationMode, setTransliterationMode, t, tDynamic],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}

/** Convenience helpers for translating domain values. */
export function useLabels() {
  const { t, tDynamic } = useI18n()
  return useMemo(
    () => ({
      symptom: (key: string) => tDynamic(`sym.${key}`, key.replace(/_/g, ' ')),
      rule: (code: string, fallback: string) => tDynamic(`rule.${code}`, fallback),
      category: (c: string) => tDynamic(`category.${c}`, c),
      pregnancy: (p: string) => tDynamic(`pregnancy.${p}`, p),
      gender: (g: string) => tDynamic(`gender.${g}`, g),
      visitType: (v: string) => tDynamic(`visitType.${v}`, v),
      facilityType: (f: string) => tDynamic(`facility.type.${f}`, f),
      referralStatus: (s: string) => tDynamic(`referral.status.${s}`, s),
      urgency: (u: string) => tDynamic(`referral.urgency.${u}`, u),
      severity: (s: string) => tDynamic(`symptoms.severity.${s}`, s),
      triage: (level: string) => tDynamic(`triage.${level}`, level),
      triageShort: (level: string) => tDynamic(`triage.${level}.short`, level),
      t,
    }),
    [t, tDynamic],
  )
}
