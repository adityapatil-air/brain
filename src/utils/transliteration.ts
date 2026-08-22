/**
 * Transliteration utilities for Roman script to Devanagari/Marathi conversion.
 * Converts Roman/Hinglish text to native scripts (Hindi/Marathi).
 */

type ScriptType = 'hi' | 'mr'

/**
 * Comprehensive mapping of Roman/Hinglish phonetic patterns to Devanagari.
 * Handles common transliteration patterns used in Hindi/Hinglish speech.
 */
const romanToDevanagariMap: Record<string, string> = {
  // Vowels (standalone)
  a: 'अ',
  aa: 'आ',
  i: 'इ',
  ii: 'ई',
  u: 'उ',
  uu: 'ऊ',
  e: 'ए',
  ai: 'ऐ',
  o: 'ओ',
  au: 'औ',

  // Consonants + vowels (ka-varga)
  ka: 'क',
  kha: 'ख',
  ga: 'ग',
  gha: 'घ',
  nga: 'ङ',

  // Consonants + vowels (cha-varga)
  cha: 'च',
  chha: 'छ',
  ja: 'ज',
  jha: 'झ',
  nya: 'ञ',

  // Consonants + vowels (ta-varga)
  ta: 'त',
  tha: 'थ',
  da: 'द',
  dha: 'ध',
  na: 'न',

  // Consonants + vowels (ta-varga - retroflex)
  tta: 'ट',
  ttha: 'ठ',
  dda: 'ड',
  ddha: 'ढ',
  nna: 'ण',

  // Consonants + vowels (pa-varga)
  pa: 'प',
  pha: 'फ',
  ba: 'ब',
  bha: 'भ',
  ma: 'म',

  // Consonants + vowels (ya-varga)
  ya: 'य',
  ra: 'र',
  la: 'ल',
  va: 'व',
  wa: 'व',

  // Consonants + vowels (sha-varga)
  sha: 'श',
  sa: 'स',
  ha: 'ह',

  // Consonants without vowels (half forms)
  k: 'क्',
  kh: 'ख्',
  g: 'ग्',
  gh: 'घ्',
  ng: 'ङ्',
  ch: 'च्',
  chh: 'छ्',
  j: 'ज्',
  jh: 'झ्',
  ny: 'ञ्',
  t: 'त्',
  th: 'थ्',
  d: 'द्',
  dh: 'ध्',
  n: 'न्',
  tt: 'ट्',
  tth: 'ठ्',
  dd: 'ड्',
  ddh: 'ढ्',
  nn: 'ण्',
  p: 'प्',
  ph: 'फ्',
  b: 'ब्',
  bh: 'भ्',
  m: 'म्',
  y: 'य्',
  r: 'र्',
  l: 'ल्',
  w: 'व्',
  v: 'व्',
  sh: 'श्',
  s: 'स्',
  h: 'ह्',

  // Special characters
  '.': '।',
  '..': '॥',
}

/**
 * Roman to Marathi mapping (similar to Devanagari with some differences)
 */
const romanToMarathiMap: Record<string, string> = {
  ...romanToDevanagariMap,
  // Marathi-specific mappings can go here if needed
}

/**
 * Transliterate Roman/Hinglish text to Devanagari (Hindi).
 * @param text - The Roman/Hinglish text to transliterate
 * @returns The transliterated Devanagari text
 */
export function romanToDevanagari(text: string): string {
  if (!text) return text
  
  let result = text.toLowerCase()
  
  // Sort by length (longest first) to handle multi-character patterns first
  const sortedKeys = Object.keys(romanToDevanagariMap).sort((a, b) => b.length - a.length)
  
  for (const key of sortedKeys) {
    const regex = new RegExp(`\\b${key}\\b|${key}(?=[aeiou]|$)`, 'gi')
    result = result.replace(regex, romanToDevanagariMap[key])
  }
  
  return result
}

/**
 * Transliterate Roman/Hinglish text to Marathi script.
 * @param text - The Roman/Hinglish text to transliterate
 * @returns The transliterated Marathi text
 */
export function romanToMarathi(text: string): string {
  if (!text) return text
  
  let result = text.toLowerCase()
  
  // Sort by length (longest first)
  const sortedKeys = Object.keys(romanToMarathiMap).sort((a, b) => b.length - a.length)
  
  for (const key of sortedKeys) {
    const regex = new RegExp(`\\b${key}\\b|${key}(?=[aeiou]|$)`, 'gi')
    result = result.replace(regex, romanToMarathiMap[key])
  }
  
  return result
}

/**
 * Main transliteration function - converts Roman text to native script based on language code.
 * @param text - The Roman/Hinglish text to transliterate
 * @param targetScript - Target script ('hi' for Devanagari, 'mr' for Marathi)
 * @returns The transliterated text
 */
export function transliterate(text: string, targetScript: ScriptType): string {
  if (!text) return text
  
  switch (targetScript) {
    case 'hi':
      return romanToDevanagari(text)
    case 'mr':
      return romanToMarathi(text)
    default:
      return text
  }
}

/**
 * Detect if text is likely Roman/Hinglish (Latin script).
 * @param text - The text to check
 * @returns true if text appears to be Roman/Hinglish
 */
export function isRomanScript(text: string): boolean {
  if (!text) return false
  
  // Count Latin characters vs Devanagari characters
  const latinCount = (text.match(/[a-zA-Z]/g) || []).length
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length
  
  return latinCount > devanagariCount
}

/**
 * Check if text contains Devanagari script.
 * @param text - The text to check
 * @returns true if text contains Devanagari characters
 */
export function hasDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text)
}

/**
 * Check if text contains Marathi script (same as Devanagari).
 * @param text - The text to check
 * @returns true if text contains Marathi characters
 */
export function hasMarathi(text: string): boolean {
  return /[\u0900-\u097F]/.test(text)
}
