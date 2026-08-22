/**
 * Language and transliteration mode selector component.
 * Allows users to:
 * 1. Select language (English, Hindi, Marathi)
 * 2. Toggle between Translation and Transliteration modes for Hindi/Marathi
 */

import { useI18n } from '../../i18n/I18nProvider'
import { Button } from './Button'

export function LanguageToggle() {
  const { lang, setLang, transliterationMode, setTransliterationMode, languages } = useI18n()

  const isNonEnglish = lang !== 'en'

  return (
    <div className="flex flex-col gap-3">
      {/* Language Selection */}
      <div className="flex gap-2">
        {Object.entries(languages).map(([code, label]) => (
          <Button
            key={code}
            variant={lang === code ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLang(code as any)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Transliteration/Translation Mode Toggle */}
      {isNonEnglish && (
        <div className="flex gap-2 text-sm">
          <Button
            variant={!transliterationMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTransliterationMode(false)}
            title="Full translation to native language"
          >
            Translation
          </Button>
          <Button
            variant={transliterationMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTransliterationMode(true)}
            title="English text converted to Devanagari script phonetically"
          >
            Transliteration
          </Button>
          <span className="text-xs text-gray-500 self-center ml-2">
            {transliterationMode
              ? 'English in Devanagari script'
              : 'Native language translation'}
          </span>
        </div>
      )}
    </div>
  )
}
