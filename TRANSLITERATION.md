# Transliteration Feature Documentation

## Overview

The transliteration feature allows the ASHA Care dashboard to display English UI text in Devanagari script (used for Hindi and Marathi) **without replacing it with full translations**.

### Translation vs Transliteration

| Aspect | Translation | Transliteration |
|--------|-------------|-----------------|
| **Meaning** | Full conversion to native language | Phonetic conversion to different script |
| **Example** | "Dashboard" → "डैशबोर्ड" (meaning: dashboard in Hindi) | "Dashboard" → "डैशबोर्ड" (English word in script form) |
| **Use Case** | Native speakers who prefer their language | Bilingual users who want English text in local script |
| **Complexity** | Full translation dictionaries needed | Phonetic mapping sufficient |

## Architecture

### Components

#### 1. **`transliterator.ts`** - Core Transliteration Engine
Handles Latin-to-Devanagari phonetic conversion.

```typescript
// Basic usage
import { transliterate } from './i18n/transliterator'

transliterate('Dashboard', 'hi')  // → 'डैशबोर्ड'
transliterate('Save', 'hi')       // → 'सेव'
transliterate('Members', 'mr')    // → 'मेंबर्स'
```

**Features:**
- Phonetic mapping for common English words
- Character-by-character fallback transliteration
- Support for both Hindi (`hi`) and Marathi (`mr`)

#### 2. **`I18nProvider.tsx`** - Enhanced i18n Provider
Extended the existing i18n system with transliteration mode toggle.

**New Interface:**
```typescript
interface I18nValue {
  lang: LanguageCode
  setLang: (lang: LanguageCode) => void
  transliterationMode: boolean      // ← New
  setTransliterationMode: (mode: boolean) => void  // ← New
  t: (key: TKey, vars?: Record<string, string | number>) => string
  tDynamic: (key: string, fallback: string, vars?) => string
  languages: typeof LANGUAGES
}
```

**Behavior:**
- When `transliterationMode = true` and `lang = 'hi'` or `'mr'`:
  - Takes English text from `en` dictionary
  - Applies phonetic transliteration to Devanagari
  - Preserves all functionality (variable interpolation, fallbacks)

- When `transliterationMode = false` (default):
  - Uses full translation dictionaries (existing behavior)

#### 3. **`LanguageToggle.tsx`** - UI Component
Provides user interface for selecting language and mode.

```tsx
import { LanguageToggle } from './components/ui/LanguageToggle'

export function App() {
  return (
    <div>
      <LanguageToggle />
      {/* Rest of app */}
    </div>
  )
}
```

**Display:**
```
[English] [Hindi] [Marathi]

(when Hindi or Marathi selected)
[Translation] [Transliteration]
"English in Devanagari script"
```

## Usage Guide

### For Users

1. **Select Language**: Click English, Hindi, or Marathi
2. **For Hindi/Marathi**: Choose between:
   - **Translation** (full native language)
   - **Transliteration** (English text in Devanagari script)

### For Developers

#### Using in Components

```tsx
import { useI18n } from '../i18n/I18nProvider'

export function Dashboard() {
  const { t, lang, transliterationMode } = useI18n()

  return (
    <div>
      <h1>{t('nav.dashboard')}</h1>
      {/* Output changes based on mode:
          - English: "Dashboard"
          - Hindi (Translation): "डैशबोर्ड"
          - Hindi (Transliteration): "डैशबोर्ड"
      */}
      
      <p>Language: {lang} | Mode: {transliterationMode ? 'Transliteration' : 'Translation'}</p>
    </div>
  )
}
```

#### Adding Phonetic Mappings

Edit `src/i18n/transliterator.ts`:

```typescript
const phoneticMap: Record<string, string> = {
  'dashboard': 'डैशबोर्ड',
  'save': 'सेव',
  // Add new mappings here
  'new_feature': 'न्यू फीचर',
}
```

#### LocalStorage Persistence

Both language and mode preference are saved:
```typescript
localStorage.getItem('ashacare.language')        // 'en' | 'hi' | 'mr'
localStorage.getItem('ashacare.transliteration') // 'true' | 'false'
```

## Integration Points

### 1. Profile Page
Add `LanguageToggle` to user preferences:

```tsx
// src/pages/asha/ProfilePage.tsx
import { LanguageToggle } from '../../components/ui/LanguageToggle'

export function ProfilePage() {
  return (
    <div>
      <h2>{t('profile.preferences')}</h2>
      <LanguageToggle />
    </div>
  )
}
```

### 2. Login Screen
```tsx
// src/pages/LoginPage.tsx
export function LoginPage() {
  return (
    <div>
      <LanguageToggle />
      {/* Login form */}
    </div>
  )
}
```

### 3. App Header
```tsx
// src/layouts/AppShell.tsx
export function AppShell() {
  return (
    <header>
      <div className="flex justify-between items-center">
        <Logo />
        <LanguageToggle />
      </div>
    </header>
  )
}
```

## Testing

### Manual Testing Checklist

- [ ] Switch to Hindi (Translation mode) - see full Hindi translations
- [ ] Switch to Hindi (Transliteration mode) - see English text in Devanagari
- [ ] Switch to Marathi - repeat above
- [ ] Refresh page - preference persists
- [ ] Check variable interpolation works: `{name}`, `{count}` etc.
- [ ] Test all dashboard pages (members, referrals, history, etc.)

### Example Test Cases

```typescript
// transliterator.test.ts
import { transliterate } from './transliterator'

describe('Transliterator', () => {
  it('transliterates Dashboard', () => {
    expect(transliterate('Dashboard', 'hi')).toBe('डैशबोर्ड')
  })

  it('transliterates Save', () => {
    expect(transliterate('Save', 'hi')).toBe('सेव')
  })

  it('returns English for en language', () => {
    expect(transliterate('Dashboard', 'en')).toBe('Dashboard')
  })

  it('preserves non-Latin characters', () => {
    expect(transliterate('Visit (2023)', 'hi')).toContain('(2023)')
  })
})
```

## Performance Considerations

1. **Phonetic Map Lookup**: O(1) - instant
2. **Fallback Transliteration**: O(n) where n = text length (very fast)
3. **No API Calls**: All processing client-side
4. **LocalStorage**: Minimal overhead (~100 bytes per user)

## Future Enhancements

### 1. Production-Ready Library
Consider using `@vincenteuc/hindi-transliterate` or `iast` for better accuracy:

```bash
npm install @vincenteuc/hindi-transliterate
```

```typescript
import { toDevanagari } from '@vincenteuc/hindi-transliterate'

export function transliterateToDevanagari(text: string): string {
  return toDevanagari(text, { bhaAs: 'A' })
}
```

### 2. Extended Language Support
- Gujarati script (`gu`)
- Tamil script (`ta`)
- Telugu script (`te`)
- Kannada script (`kn`)

### 3. Smart Mode Selection
Auto-detect user preference based on:
- Browser language
- Keyboard layout
- Previous interactions

### 4. Hybrid Mode
Mix translations and transliterations:
```typescript
// Some strings translated, others transliterated
// Useful for domain-specific medical terms
```

## Troubleshooting

### Issue: Transliteration looks incorrect
**Solution:** Add to phonetic map in `transliterator.ts` with correct Devanagari representation

### Issue: Mode not persisting
**Solution:** Check browser localStorage is enabled (not in private mode)

### Issue: Special characters not displaying
**Solution:** Ensure font supports Devanagari (most modern browsers do by default)

## References

- **Devanagari Script**: https://en.wikipedia.org/wiki/Devanagari
- **IAST (Indian Alphabetic Script Transliteration)**: https://en.wikipedia.org/wiki/International_Alphabet_of_Sanskrit_Transliteration
- **Hindi Language**: https://en.wikipedia.org/wiki/Hindi
- **Marathi Language**: https://en.wikipedia.org/wiki/Marathi_language

## Support

For issues or questions:
1. Check this documentation
2. Review `src/i18n/transliterator.ts` source code
3. Run test suite: `npm test transliterator.test.ts`
4. Open GitHub issue with "transliteration" label
