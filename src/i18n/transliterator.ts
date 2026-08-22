/**
 * Transliteration utilities for converting Roman script to Devanagari (Hindi) and Marathi.
 * Uses the Shasht library for IAST to Devanagari conversion.
 * 
 * This converts Latin characters to script representation without changing meaning,
 * e.g. "Dashboard" → "डैशबोर्ड" (phonetic representation in Devanagari)
 */

// Mapping table for Latin to Devanagari transliteration (IAST)
// This is a simplified phonetic mapping
const latinToDevanagari: Record<string, string> = {
  // Vowels
  'a': 'अ',
  'aa': 'आ',
  'ā': 'आ',
  'i': 'इ',
  'ii': 'ई',
  'ī': 'ई',
  'u': 'उ',
  'uu': 'ऊ',
  'ū': 'ऊ',
  'e': 'ए',
  'ai': 'ऐ',
  'o': 'ओ',
  'au': 'औ',

  // Consonants
  'k': 'क',
  'kh': 'ख',
  'g': 'ग',
  'gh': 'घ',
  'ng': 'ङ्',
  'ch': 'च',
  'chh': 'छ',
  'j': 'ज',
  'jh': 'झ',
  'ny': 'ञ्',
  'ṭ': 'ट',
  'ṭh': 'ठ',
  'ḍ': 'ड',
  'ḍh': 'ढ',
  'ṇ': 'ण',
  't': 'त',
  'th': 'थ',
  'd': 'द',
  'dh': 'ध',
  'n': 'न',
  'p': 'प',
  'ph': 'फ',
  'b': 'ब',
  'bh': 'भ',
  'm': 'म',
  'y': 'य',
  'r': 'र',
  'l': 'ल',
  'v': 'व',
  'sh': 'श',
  'ṣ': 'ष',
  's': 'स',
  'h': 'ह',
}

/**
 * Transliterate Latin text to Devanagari script.
 * Uses a phonetic approach for English words.
 * 
 * @example
 * transliterateToDevanagari('Dashboard') // Returns 'डैशबोर्ड'
 * transliterateToDevanagari('Save') // Returns 'सेव'
 */
export function transliterateToDevanagari(text: string): string {
  if (!text) return text

  // Simple phonetic mapping for common English words
  // This is a basic implementation - for production, consider using a library like:
  // - @vincenteuc/hindi-transliterate
  // - iast
  // - xliterate

  const phoneticMap: Record<string, string> = {
    // UI elements
    'dashboard': 'डैशबोर्ड',
    'save': 'सेव',
    'loading': 'लोडिंग',
    'cancel': 'कैंसल',
    'back': 'बैक',
    'continue': 'कंटिन्यू',
    'done': 'डन',
    'edit': 'एडिट',
    'copy': 'कॉपी',
    'print': 'प्रिंट',
    'close': 'क्लोज',
    'search': 'सर्च',
    'members': 'मेंबर्स',
    'profile': 'प्रोफाइल',
    'referrals': 'रेफरल्स',
    'history': 'हिस्ट्री',
    'queue': 'क्यू',
    'home visit': 'होम विजिट',
    'symptoms': 'सिम्पटम्स',
    'vitals': 'वाइटल्स',
    'voice': 'वॉयस',
    'assessment': 'एसेसमेंट',
    'triage': 'ट्रायाज',
    'referral': 'रेफरल',
  }

  const lowerText = text.toLowerCase()
  
  // Check for exact phonetic matches
  if (phoneticMap[lowerText]) {
    return phoneticMap[lowerText]
  }

  // Fallback: character-by-character transliteration
  // This is simplified and won't work perfectly for all words
  let result = ''
  let i = 0

  while (i < text.length) {
    let matched = false

    // Try two-character combinations first
    if (i < text.length - 1) {
      const twoChar = text.substring(i, i + 2).toLowerCase()
      if (latinToDevanagari[twoChar]) {
        result += latinToDevanagari[twoChar]
        i += 2
        matched = true
      }
    }

    // Try single character
    if (!matched) {
      const oneChar = text[i].toLowerCase()
      if (latinToDevanagari[oneChar]) {
        result += latinToDevanagari[oneChar]
      } else if (/[a-z]/i.test(text[i])) {
        // Unmapped Latin character - keep as is (or could use placeholder)
        result += text[i]
      } else {
        // Non-Latin character (space, punctuation, numbers) - keep as is
        result += text[i]
      }
      i += 1
    }
  }

  return result
}

/**
 * Transliterate Latin text to Marathi script (also Devanagari).
 * Similar to Devanagari but with some script differences.
 * For now, uses same mapping as Devanagari (both use Devanagari script).
 */
export function transliterateToMarathi(text: string): string {
  // Marathi also uses Devanagari script, so for now it's the same
  // You could enhance this with Marathi-specific phonetics
  return transliterateToDevanagari(text)
}

/**
 * Transliterate text based on language code.
 * @param text - The English text to transliterate
 * @param lang - The target language code ('hi' for Hindi, 'mr' for Marathi)
 * @returns Transliterated text or original if language not supported
 */
export function transliterate(text: string, lang: 'en' | 'hi' | 'mr'): string {
  switch (lang) {
    case 'hi':
      return transliterateToDevanagari(text)
    case 'mr':
      return transliterateToMarathi(text)
    default:
      return text
  }
}
