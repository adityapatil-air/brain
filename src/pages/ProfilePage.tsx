import { CheckCircle2, Database, LogOut, MapPin, Mic, Sparkles, XCircle } from 'lucide-react'
import { useAuth, useProfile } from '../features/auth/AuthProvider'
import { useI18n } from '../i18n/I18nProvider'
import { isDemoBackend } from '../services/data'
import { useCapabilities } from '../hooks/useCapabilities'
import { Card, CardBody, CardHeader, DataRow, PageHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Misc'
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher'
import { Notice } from '../components/ui/States'

function ServiceRow({
  label,
  ok,
  detail,
  icon,
}: {
  label: string
  ok: boolean
  detail?: string
  icon: React.ReactNode
}) {
  const { t } = useI18n()
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-500">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink-900">{label}</span>
          {detail && <span className="block truncate text-xs text-ink-500">{detail}</span>}
        </span>
      </span>
      <span
        className={`flex shrink-0 items-center gap-1.5 text-sm font-semibold ${
          ok ? 'text-risk-green' : 'text-ink-400'
        }`}
      >
        {ok ? (
          <CheckCircle2 className="h-4 w-4" aria-hidden />
        ) : (
          <XCircle className="h-4 w-4" aria-hidden />
        )}
        {ok ? t('profile.service.configured') : t('profile.service.missing')}
      </span>
    </div>
  )
}

export function ProfilePage() {
  const profile = useProfile()
  const { signOut } = useAuth()
  const { t } = useI18n()
  const { caps } = useCapabilities()

  const roleKey =
    profile.role === 'asha'
      ? 'profile.role.asha'
      : profile.role === 'phc_doctor'
        ? 'profile.role.phc_doctor'
        : 'profile.role.admin'

  return (
    <>
      <PageHeader eyebrow={t('nav.profile')} title={t('profile.title')} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <Avatar name={profile.full_name} size="lg" />
              <div className="min-w-0">
                <p className="text-lg font-semibold tracking-[-0.01em] text-ink-900">
                  {profile.full_name}
                </p>
                <p className="mt-0.5 text-sm text-ink-500">{t(roleKey)}</p>
              </div>
            </div>
          </CardBody>
          <dl className="divide-y divide-ink-100 border-t border-ink-100 px-5 py-2 sm:px-6">
            <DataRow label={t('profile.code')} value={profile.asha_code ?? '—'} />
            <DataRow label={t('member.phone')} value={profile.phone ?? '—'} />
            <DataRow
              label={t('profile.area')}
              value={[profile.village, profile.district, profile.state].filter(Boolean).join(', ') || '—'}
            />
          </dl>
          <div className="border-t border-ink-100 px-5 py-4 sm:px-6">
            <Button
              variant="secondary"
              onClick={() => void signOut()}
              iconLeft={<LogOut className="h-4 w-4" aria-hidden />}
            >
              {t('auth.signOut')}
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t('profile.preferences')} />
            <CardBody>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-ink-900">{t('common.language')}</p>
                  <p className="mt-0.5 text-xs text-ink-500">हिन्दी · मराठी · English</p>
                </div>
                <LanguageSwitcher />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('profile.systemStatus')} />
            <CardBody className="divide-y divide-ink-100 py-1">
              <ServiceRow
                label={t('profile.service.database')}
                ok={!isDemoBackend}
                detail={isDemoBackend ? t('demo.banner') : undefined}
                icon={<Database className="h-4 w-4" aria-hidden />}
              />
              <ServiceRow
                label={t('profile.service.whisper')}
                ok={caps.whisper}
                detail={caps.whisper ? caps.whisperModel : undefined}
                icon={<Mic className="h-4 w-4" aria-hidden />}
              />
              <ServiceRow
                label={t('profile.service.gemini')}
                ok={caps.gemini}
                detail={caps.gemini ? caps.geminiModel : undefined}
                icon={<Sparkles className="h-4 w-4" aria-hidden />}
              />
              <ServiceRow
                label={t('profile.service.places')}
                ok={caps.places}
                icon={<MapPin className="h-4 w-4" aria-hidden />}
              />
            </CardBody>
            {!caps.apiReachable && (
              <div className="border-t border-ink-100 px-5 py-4 sm:px-6">
                <Notice tone="amber">
                  {t('error.load')} — <code className="font-mono text-xs">npm run dev</code>
                </Notice>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
