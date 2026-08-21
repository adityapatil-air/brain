import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '../../utils/cn'

const BASE_CONTROL =
  'w-full rounded-xl border bg-surface px-3.5 text-ink-900 placeholder:text-ink-400 transition-colors ' +
  'disabled:bg-ink-50 disabled:text-ink-400'

const STATE_OK = 'border-ink-200 hover:border-ink-300 focus:border-care-500'
const STATE_ERR = 'border-risk-redBorder bg-risk-redSoft/40 focus:border-risk-red'

interface FieldShellProps {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  required?: boolean
  suffix?: ReactNode
  children: ReactNode
  className?: string
}

export function FieldShell({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
        {required && <span className="ml-0.5 text-risk-red">*</span>}
      </label>
      {children}
      {error ? (
        <p className="flex items-start gap-1.5 text-sm font-medium text-risk-red">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-sm text-ink-500">{hint}</p>
      ) : null}
    </div>
  )
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
  /** Rendered inside the control on the right, e.g. a unit. */
  unit?: string
  iconLeft?: ReactNode
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, hint, error, unit, iconLeft, className, id, required, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} required={required}>
      <div className="relative">
        {iconLeft && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
            {iconLeft}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            BASE_CONTROL,
            'h-11',
            error ? STATE_ERR : STATE_OK,
            iconLeft && 'pl-10',
            unit && 'pr-14',
            className,
          )}
          {...rest}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-500">
            {unit}
          </span>
        )}
      </div>
    </FieldShell>
  )
})

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, className, id, required, rows = 4, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} required={required}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(BASE_CONTROL, 'py-2.5 leading-relaxed', error ? STATE_ERR : STATE_OK, className)}
        {...rest}
      />
    </FieldShell>
  )
})

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id, required, children, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} required={required}>
      <select
        ref={ref}
        id={inputId}
        required={required}
        className={cn(
          BASE_CONTROL,
          'h-11 cursor-pointer appearance-none bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-10',
          error ? STATE_ERR : STATE_OK,
          className,
        )}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7A76' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  )
})
