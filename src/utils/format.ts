import type { LanguageCode } from '../../shared/clinical'

const LOCALE: Record<LanguageCode, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' }

export function formatDate(iso: string | Date, lang: LanguageCode = 'en'): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(LOCALE[lang], { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | Date, lang: LanguageCode = 'en'): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(LOCALE[lang], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(iso: string | Date, lang: LanguageCode = 'en'): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString(LOCALE[lang], { hour: '2-digit', minute: '2-digit' })
}

/** "3 min ago" style, deliberately short for dense tables. */
export function relativeTime(iso: string, lang: LanguageCode = 'en'): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diffSec = Math.round((then - Date.now()) / 1000)
  const abs = Math.abs(diffSec)
  const rtf = new Intl.RelativeTimeFormat(LOCALE[lang], { numeric: 'auto', style: 'short' })
  if (abs < 60) return rtf.format(Math.round(diffSec), 'second')
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), 'day')
  return rtf.format(Math.round(diffSec / 2592000), 'month')
}

/** Ages below 1 are shown in months, which matters clinically for infants. */
export function formatAge(age: number, lang: LanguageCode = 'en'): string {
  if (age < 1) {
    const months = Math.max(1, Math.round(age * 12))
    return lang === 'en' ? `${months} mo` : lang === 'hi' ? `${months} माह` : `${months} महिने`
  }
  return lang === 'en' ? `${Math.round(age)} yr` : lang === 'hi' ? `${Math.round(age)} वर्ष` : `${Math.round(age)} वर्षे`
}

export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined || !Number.isFinite(km)) return '—'
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function titleCase(s: string): string {
  return s
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}
