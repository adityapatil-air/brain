/**
 * Integration Guide: Adding Transliteration Mode Toggle to ASHA Care
 * 
 * This file provides step-by-step instructions for integrating the transliteration
 * feature into existing pages (Profile, Settings, Login, etc.)
 */

// ============================================================================
// STEP 1: Profile Page Integration
// ============================================================================
// File: src/pages/asha/ProfilePage.tsx or src/pages/phc/ProfilePage.tsx

/*
import { useI18n } from '../../i18n/I18nProvider'
import { LanguageToggle } from '../../components/ui/LanguageToggle'
import { Button } from '../../components/ui/Button'

export function ProfilePage() {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <h1>{t('profile.title')}</h1>
      
      {/* Preferences Section */}
      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-4">{t('profile.preferences')}</h2>
        
        {/* Language & Transliteration Settings */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Display Language & Mode
          </h3>
          <LanguageToggle />
        </div>
      </div>
    </div>
  )
}
*/

// ============================================================================
// STEP 2: Login Page Integration
// ============================================================================
// File: src/pages/LoginPage.tsx

/*
import { LanguageToggle } from '../components/ui/LanguageToggle'

export function LoginPage() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      {/* Language toggle at top */}
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      {/* Login form */}
      <div className="w-full max-w-md space-y-6">
        <h1>{t('auth.welcome')}</h1>
        {/* Login form fields */}
      </div>
    </div>
  )
}
*/

// ============================================================================
// STEP 3: App Shell / Header Integration
// ============================================================================
// File: src/layouts/AppShell.tsx

/*
import { LanguageToggle } from '../components/ui/LanguageToggle'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div>
      <header className="flex justify-between items-center p-4">
        <div className="flex items-center gap-2">
          <Logo />
          <h1 className="text-xl font-semibold">{t('app.name')}</h1>
        </div>
        
        {/* Language toggle in top-right */}
        <LanguageToggle />
      </header>

      <main>{children}</main>
    </div>
  )
}
*/

// ============================================================================
// STEP 4: Extending the LanguageToggle Component
// ============================================================================
// If you want to customize the appearance, create a variant:

/*
// src/components/ui/LanguageToggleCompact.tsx

import { useI18n } from '../../i18n/I18nProvider'
import { Button } from './Button'

export function LanguageToggleCompact() {
  const { lang, setLang, transliterationMode, setTransliterationMode, languages } = useI18n()

  const isNonEnglish = lang !== 'en'

  return (
    <div className="flex gap-1">
      {/* Compact language selector - dropdown */}
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as any)}
        className="px-2 py-1 text-sm border rounded"
      >
        {Object.entries(languages).map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>

      {/* Mode toggle - only if non-English */}
      {isNonEnglish && (
        <select
          value={transliterationMode ? 'trans' : 'trans_latin'}
          onChange={(e) => setTransliterationMode(e.target.value === 'trans')}
          className="px-2 py-1 text-sm border rounded"
        >
          <option value="trans_latin">Translation</option>
          <option value="trans">Transliteration</option>
        </select>
      )}
    </div>
  )
}
*/

// ============================================================================
// STEP 5: Dashboard Changes
// ============================================================================
// Add to Dashboard header or stats section

/*
// src/pages/asha/DashboardPage.tsx

import { LanguageToggle } from '../../components/ui/LanguageToggle'

export function AshaDashboardPage() {
  const { t } = useI18n()

  return (
    <div>
      <PageHeader
        eyebrow={t('nav.dashboard')}
        title={t('dash.greeting', { name: profile.full_name.split(' ')[0] })}
        description={t('dash.subtitle', { 
          village: profile.village ?? '—',
          date: formatDate(new Date(), lang),
        })}
      />

      {/* Add language toggle in a subtle location */}
      <div className="absolute top-4 right-4">
        <LanguageToggleCompact />
      </div>

      {/* Rest of dashboard content */}
    </div>
  )
}
*/

// ============================================================================
// STEP 6: Testing the Integration
// ============================================================================

/*
// Example test file: src/__tests__/transliteration-integration.test.tsx

import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../i18n/I18nProvider'
import { LanguageToggle } from '../components/ui/LanguageToggle'
import userEvent from '@testing-library/user-event'

describe('Transliteration Integration', () => {
  it('displays English by default', () => {
    render(
      <I18nProvider>
        <LanguageToggle />
      </I18nProvider>
    )
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('switches to Hindi transliteration mode', async () => {
    const user = userEvent.setup()
    
    render(
      <I18nProvider>
        <LanguageToggle />
      </I18nProvider>
    )

    // Click Hindi button
    await user.click(screen.getByRole('button', { name: /hindi/i }))
    
    // Should show transliteration/translation toggle
    expect(screen.getByRole('button', { name: /translation/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /transliteration/i })).toBeInTheDocument()
  })

  it('persists language preference to localStorage', async () => {
    const user = userEvent.setup()
    
    render(
      <I18nProvider>
        <LanguageToggle />
      </I18nProvider>
    )

    await user.click(screen.getByRole('button', { name: /marathi/i }))
    
    expect(localStorage.getItem('ashacare.language')).toBe('mr')
  })

  it('persists transliteration mode to localStorage', async () => {
    const user = userEvent.setup()
    
    render(
      <I18nProvider>
        <LanguageToggle />
      </I18nProvider>
    )

    // Switch to Hindi first
    await user.click(screen.getByRole('button', { name: /hindi/i }))
    
    // Then switch to transliteration mode
    await user.click(screen.getByRole('button', { name: /transliteration/i }))
    
    expect(localStorage.getItem('ashacare.transliteration')).toBe('true')
  })
})
*/

// ============================================================================
// STEP 7: Styling Considerations
// ============================================================================

/*
// Optional: Add custom CSS for better appearance

// src/styles/transliteration.css

.language-toggle {
  @apply flex flex-col gap-3;
}

.language-toggle-buttons {
  @apply flex gap-2;
}

.language-toggle-mode {
  @apply flex gap-2 text-sm mt-2;
}

.language-toggle-hint {
  @apply text-xs text-gray-500 self-center ml-2;
}

/* Responsive design */
@media (max-width: 640px) {
  .language-toggle {
    @apply gap-2;
  }

  .language-toggle-buttons {
    @apply flex-wrap;
  }
}
*/

// ============================================================================
// STEP 8: Enhancing the Phonetic Map
// ============================================================================

/*
// src/i18n/transliterator.ts

// Add more common UI terms to phoneticMap:

const phoneticMap: Record<string, string> = {
  // Navigation
  'dashboard': 'डैशबोर्ड',
  'members': 'मेंबर्स',
  'profile': 'प्रोफाइल',
  'referrals': 'रेफरल्स',
  'history': 'हिस्ट्री',
  'queue': 'क्यू',

  // Common actions
  'save': 'सेव',
  'cancel': 'कैंसल',
  'delete': 'डिलीट',
  'edit': 'एडिट',
  'search': 'सर्च',
  'filter': 'फिल्टर',
  'print': 'प्रिंट',
  'download': 'डाउनलोड',

  // Status
  'pending': 'पेंडिंग',
  'completed': 'कम्प्लीटेड',
  'approved': 'अप्रूव्ड',
  'rejected': 'रिजेक्टेड',

  // Fields
  'name': 'नेम',
  'email': 'ईमेल',
  'phone': 'फोन',
  'address': 'एड्रेस',
  'date': 'डेट',

  // Clinic-specific
  'symptoms': 'सिम्पटम्स',
  'vitals': 'वाइटल्स',
  'triage': 'ट्रायाज',
  'referral': 'रेफरल',
  'assessment': 'एसेसमेंट',
}
*/

// ============================================================================
// STEP 9: Documentation Updates
// ============================================================================

/*
Update your project README.md with:

## Language & Transliteration

ASHA Care supports:
- **English** (default)
- **Hindi** - Full translation or Transliteration mode
- **Marathi** - Full translation or Transliteration mode

### Transliteration Mode
When enabled for Hindi/Marathi, the interface displays English text 
phonetically converted to Devanagari script. This is useful for:
- Bilingual users who prefer Latin phonetics
- Users learning to read Devanagari
- Maintaining consistent UI structure across languages

### User Preference
Language and mode selection are automatically saved to browser localStorage 
and restored on subsequent visits.
*/

// ============================================================================
// STEP 10: Monitoring & Analytics (Optional)
// ============================================================================

/*
// Track transliteration usage

// src/i18n/telemetry.ts

export function logLanguageChange(lang: string, mode: string) {
  // Send to analytics
  console.log(`Language changed to: ${lang}, Mode: ${mode}`)
  
  // If you have an analytics service:
  // analytics.track('language_changed', { language: lang, mode })
}

// In I18nProvider.tsx:
const setLang = useCallback((next: LanguageCode) => {
  setLangState(next)
  logLanguageChange(next, transliterationMode ? 'transliteration' : 'translation')
}, [transliterationMode])
*/

// ============================================================================
// IMPLEMENTATION CHECKLIST
// ============================================================================

/*
☐ 1. Create transliterator.ts utility
☐ 2. Update I18nProvider.tsx with transliterationMode
☐ 3. Create LanguageToggle.tsx component
☐ 4. Add LanguageToggle to ProfilePage
☐ 5. Add LanguageToggle to LoginPage
☐ 6. Add LanguageToggleCompact to AppShell header
☐ 7. Test all three languages (en, hi, mr)
☐ 8. Test both modes (translation & transliteration) for hi/mr
☐ 9. Test localStorage persistence
☐ 10. Update phonetic map with missing words
☐ 11. Write unit tests for transliterator
☐ 12. Write integration tests for LanguageToggle
☐ 13. Update README with feature documentation
☐ 14. User acceptance testing on dashboard pages
☐ 15. Deploy to staging environment
☐ 16. Gather user feedback
☐ 17. Deploy to production
*/

export {}
