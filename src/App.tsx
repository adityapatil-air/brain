import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthProvider'
import { I18nProvider, useI18n } from './i18n/I18nProvider'
import { VisitDraftProvider } from './store/visitDraft'
import { ToastProvider } from './components/ui/Toast'
import { AppShell } from './layouts/AppShell'
import { LoadingState } from './components/ui/States'
import { EmptyState } from './components/ui/States'
import { ButtonLink } from './components/ui/Button'
import { LoginPage } from './pages/LoginPage'
import { AshaDashboardPage } from './pages/asha/DashboardPage'
import { MembersPage } from './pages/asha/MembersPage'
import { MemberProfilePage } from './pages/asha/MemberProfilePage'
import { NewVisitPage } from './pages/asha/NewVisitPage'
import { VisitDetailPage } from './pages/asha/VisitDetailPage'
import { HistoryPage } from './pages/asha/HistoryPage'
import { AshaReferralsPage } from './pages/asha/ReferralsPage'
import { ProfilePage } from './pages/ProfilePage'
import { PhcDashboardPage } from './pages/phc/PhcDashboardPage'
import { PhcReferralDetailPage } from './pages/phc/PhcReferralDetailPage'
import type { Role } from './types/domain'

function RequireAuth({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <LoadingState className="min-h-screen" />
  if (!profile) return <Navigate to="/login" replace />
  if (!roles.includes(profile.role)) {
    return <Navigate to={profile.role === 'asha' ? '/asha' : '/phc'} replace />
  }
  return <>{children}</>
}

function LandingRedirect() {
  const { profile, loading } = useAuth()
  if (loading) return <LoadingState className="min-h-screen" />
  if (!profile) return <Navigate to="/login" replace />
  return <Navigate to={profile.role === 'asha' ? '/asha' : '/phc'} replace />
}

function NotFoundPage() {
  const { t } = useI18n()
  const { profile } = useAuth()
  return (
    <EmptyState
      className="min-h-[60vh]"
      title={t('error.notFound')}
      description={t('error.notFoundHint')}
      action={
        <ButtonLink to={profile?.role === 'phc_doctor' ? '/phc' : '/asha'} variant="secondary">
          {t('error.goHome')}
        </ButtonLink>
      }
    />
  )
}

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <VisitDraftProvider>
            <Routes>
              <Route path="/" element={<LandingRedirect />} />
              <Route path="/login" element={<LoginPage />} />

              {/* ------------------------------------------------------ ASHA */}
              <Route
                element={
                  <RequireAuth roles={['asha', 'admin']}>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route path="/asha" element={<AshaDashboardPage />} />
                <Route path="/asha/members" element={<MembersPage />} />
                <Route path="/asha/member/:id" element={<MemberProfilePage />} />
                <Route path="/asha/visit/new" element={<NewVisitPage />} />
                <Route path="/asha/visit/:id" element={<VisitDetailPage />} />
                <Route path="/asha/history" element={<HistoryPage />} />
                <Route path="/asha/referrals" element={<AshaReferralsPage />} />
                <Route path="/asha/profile" element={<ProfilePage />} />
              </Route>

              {/* ------------------------------------------------------- PHC */}
              <Route
                element={
                  <RequireAuth roles={['phc_doctor', 'admin']}>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route path="/phc" element={<PhcDashboardPage />} />
                <Route path="/phc/referral/:id" element={<PhcReferralDetailPage />} />
                <Route path="/phc/visit/:id" element={<VisitDetailPage />} />
                <Route path="/phc/profile" element={<ProfilePage />} />
              </Route>

              <Route
                path="*"
                element={
                  <RequireAuth roles={['asha', 'phc_doctor', 'admin']}>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </VisitDraftProvider>
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  )
}
