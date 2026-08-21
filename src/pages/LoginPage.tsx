import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Database,
  Languages,
  MapPin,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'
import { useI18n } from '../i18n/I18nProvider'
import { isDemoBackend } from '../services/data'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/Field'
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher'
import { LoadingState, Notice } from '../components/ui/States'

const DEMO_ACCOUNTS = [
  { id: 'ASHA001', password: '123456', roleKey: 'auth.demoAsha' as const, name: 'Sunita Kamble' },
  { id: 'PHC001', password: '123456', roleKey: 'auth.demoPhc' as const, name: 'Dr. Anil Deshmukh' },
]

export function LoginPage() {
  const { profile, loading, signIn } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (loading) return <LoadingState className="min-h-screen" />
  if (profile) return <Navigate to={profile.role === 'asha' ? '/asha' : '/phc'} replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim() || !password) return
    setPending(true)
    setError(null)
    try {
      const p = await signIn(identifier, password)
      navigate(p.role === 'asha' ? '/asha' : '/phc', { replace: true })
    } catch (err) {
      const code = err instanceof Error ? err.message : ''
      setError(code === 'NO_PROFILE' ? t('auth.noProfile') : t('auth.failed'))
    } finally {
      setPending(false)
    }
  }

  const features = [
    { icon: Languages, text: t('auth.feature1') },
    { icon: ShieldCheck, text: t('auth.feature2') },
    { icon: MapPin, text: t('auth.feature3') },
  ]

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* ------------------------------------------------------- brand panel */}
      <div className="relative flex flex-col justify-between bg-care-700 px-6 py-8 text-white sm:px-10 lg:w-[46%] lg:px-14 lg:py-14">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <Stethoscope className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-lg font-semibold tracking-[-0.01em]">{t('app.name')}</p>
              <p className="text-sm text-care-100">{t('app.tagline')}</p>
            </div>
          </div>
          <div className="lg:hidden">
            <LanguageSwitcher variant="onDark" />
          </div>
        </div>

        <div className="mt-10 max-w-md lg:mt-0">
          <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
            {t('auth.welcome')}
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-care-100">{t('auth.subtitle')}</p>

          <ul className="mt-8 space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-sm leading-relaxed text-care-50">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-10 text-xs leading-relaxed text-care-200 lg:mt-0">{t('app.disclaimer')}</p>
      </div>

      {/* -------------------------------------------------------- form panel */}
      <div className="flex flex-1 items-center justify-center bg-canvas px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 hidden justify-end lg:flex">
            <LanguageSwitcher />
          </div>

          <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink-900">{t('auth.signIn')}</h2>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <TextInput
              label={t('auth.identifier')}
              hint={t('auth.identifierHint')}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              autoCapitalize="characters"
              spellCheck={false}
              required
            />
            <TextInput
              label={t('auth.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {error && (
              <Notice tone="red" icon={<AlertCircle className="h-4 w-4" aria-hidden />}>
                {error}
              </Notice>
            )}

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={pending}
              iconRight={!pending ? <ArrowRight className="h-4 w-4" aria-hidden /> : undefined}
            >
              {pending ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>

          {/* Demo credentials — this is a hackathon/demo build. */}
          <div className="mt-8 rounded-2xl border border-ink-200 bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-500">
              {t('auth.demoTitle')}
            </p>
            <ul className="mt-3 space-y-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <li key={acc.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setIdentifier(acc.id)
                      setPassword(acc.password)
                      setError(null)
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-ink-100 px-3 py-2.5 text-left transition-colors hover:border-care-300 hover:bg-care-50"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink-900">{t(acc.roleKey)}</span>
                      <span className="block truncate text-xs text-ink-500">
                        {acc.id} · {acc.password}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-care-700">
                      {t('auth.fillDemo')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {isDemoBackend && (
            <Notice tone="amber" className="mt-4" icon={<Database className="h-4 w-4" aria-hidden />}>
              {t('demo.banner')}
            </Notice>
          )}
        </div>
      </div>
    </div>
  )
}
