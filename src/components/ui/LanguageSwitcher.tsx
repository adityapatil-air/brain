import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Languages } from 'lucide-react'
import type { LanguageCode } from '../../../shared/clinical'
import { useI18n } from '../../i18n/I18nProvider'
import { cn } from '../../utils/cn'

/**
 * Switches the language of the entire interface. Every visible string in the
 * app resolves through `useI18n().t`, so this one control retranslates the
 * whole product.
 */
export function LanguageSwitcher({
  variant = 'default',
  className,
}: {
  variant?: 'default' | 'compact' | 'onDark'
  className?: string
}) {
  const { lang, setLang, languages, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = languages.find((l) => l.code === lang) ?? languages[0]!

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('common.language')}: ${current.english}`}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors',
          variant === 'onDark'
            ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
            : 'border-ink-200 bg-surface text-ink-700 hover:bg-ink-50',
        )}
      >
        <Languages className="h-4 w-4 shrink-0" aria-hidden />
        <span className={variant === 'compact' ? 'sr-only sm:not-sr-only' : ''}>{current.label}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('common.language')}
          className="absolute right-0 z-40 mt-1.5 w-48 animate-slide-up overflow-hidden rounded-xl border border-ink-200 bg-surface p-1 shadow-pop"
        >
          {languages.map((l) => {
            const selected = l.code === lang
            return (
              <li key={l.code} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    setLang(l.code as LanguageCode)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    selected ? 'bg-care-50 font-semibold text-care-800' : 'text-ink-700 hover:bg-ink-50',
                  )}
                >
                  <span>
                    {l.label}
                    {l.label !== l.english && (
                      <span className="ml-1.5 text-xs text-ink-400">{l.english}</span>
                    )}
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
