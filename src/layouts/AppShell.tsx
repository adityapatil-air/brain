import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ClipboardList,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  Send,
  Stethoscope,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'
import { useI18n } from '../i18n/I18nProvider'
import { isDemoBackend } from '../services/data'
import { Avatar } from '../components/ui/Misc'
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher'
import { Notice } from '../components/ui/States'
import { formatDate } from '../utils/format'
import { cn } from '../utils/cn'

interface NavItem {
  to: string
  labelKey: 'nav.dashboard' | 'nav.members' | 'nav.visits' | 'nav.referrals' | 'nav.profile' | 'nav.queue'
  icon: typeof LayoutDashboard
  end?: boolean
}

const ASHA_NAV: NavItem[] = [
  { to: '/asha', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/asha/members', labelKey: 'nav.members', icon: Users },
  { to: '/asha/history', labelKey: 'nav.visits', icon: ClipboardList },
  { to: '/asha/referrals', labelKey: 'nav.referrals', icon: Send },
  { to: '/asha/profile', labelKey: 'nav.profile', icon: UserRound },
]

const PHC_NAV: NavItem[] = [
  { to: '/phc', labelKey: 'nav.queue', icon: LayoutDashboard, end: true },
  { to: '/phc/profile', labelKey: 'nav.profile', icon: UserRound },
]

export function AppShell() {
  const { profile, signOut } = useAuth()
  const { t, lang } = useI18n()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => setMobileOpen(false), [location.pathname])

  if (!profile) return null

  const items = profile.role === 'asha' ? ASHA_NAV : PHC_NAV
  const home = profile.role === 'asha' ? '/asha' : '/phc'

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5" aria-label={t('nav.dashboard')}>
      {items.map(({ to, labelKey, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-care-50 text-care-800'
                : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                className={cn('h-[1.125rem] w-[1.125rem] shrink-0', isActive ? 'text-care-600' : 'text-ink-400')}
                aria-hidden
              />
              <span className="truncate">{t(labelKey)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )

  const sidebarInner = (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link to={home} className="flex items-center gap-3 rounded-xl px-1 py-1">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-care-600 text-white">
          <Stethoscope className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-[-0.01em] text-ink-900">
            {t('app.name')}
          </span>
          <span className="block truncate text-xs text-ink-500">{t('app.tagline')}</span>
        </span>
      </Link>

      {nav}

      <div className="space-y-3 border-t border-ink-100 pt-4">
        <div className="flex items-center gap-3 px-1">
          <Avatar name={profile.full_name} size="sm" tone={profile.role === 'asha' ? 'care' : 'neutral'} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">{profile.full_name}</p>
            <p className="truncate text-xs text-ink-500">
              {t(
                profile.role === 'asha'
                  ? 'profile.role.asha'
                  : profile.role === 'phc_doctor'
                    ? 'profile.role.phc_doctor'
                    : 'profile.role.admin',
              )}
              {profile.asha_code ? ` · ${profile.asha_code}` : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900"
        >
          <LogOut className="h-[1.125rem] w-[1.125rem] shrink-0 text-ink-400" aria-hidden />
          {t('auth.signOut')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas">
      {/* ------------------------------------------------- desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-ink-100 bg-surface lg:block">
        {sidebarInner}
      </aside>

      {/* -------------------------------------------------- mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-ink-900/30"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-slide-up bg-surface shadow-pop">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label={t('nav.closeMenu')}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            {sidebarInner}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* ----------------------------------------------------- top bar */}
        <header className="sticky top-0 z-20 border-b border-ink-100 bg-surface/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label={t('nav.openMenu')}
              className="-ml-1 rounded-xl p-2 text-ink-600 transition-colors hover:bg-ink-100 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900 lg:hidden">{t('app.name')}</p>
              <p className="hidden truncate text-sm text-ink-500 lg:block">
                {[profile.village, profile.district].filter(Boolean).join(', ')}
                {profile.village || profile.district ? ' · ' : ''}
                {formatDate(new Date(), lang)}
              </p>
            </div>

            <LanguageSwitcher variant="compact" />
          </div>

          {isDemoBackend && (
            <div className="border-t border-risk-amberBorder bg-risk-amberSoft px-4 py-2 sm:px-6">
              <p className="flex items-center gap-2 text-xs font-medium text-risk-amber">
                <Database className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="min-w-0">{t('demo.banner')}</span>
              </p>
            </div>
          )}
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
          <footer className="mt-10 border-t border-ink-100 pt-5">
            <Notice tone="info" className="border-dashed">
              {t('app.disclaimer')}
            </Notice>
          </footer>
        </main>
      </div>
    </div>
  )
}
