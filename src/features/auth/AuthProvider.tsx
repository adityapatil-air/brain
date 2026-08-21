import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { repo } from '../../services/data'
import type { Profile } from '../../types/domain'

interface AuthValue {
  profile: Profile | null
  loading: boolean
  signIn: (identifier: string, password: string) => Promise<Profile>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setProfile(await repo.currentProfile())
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const p = await repo.currentProfile()
        if (!cancelled) setProfile(p)
      } catch {
        if (!cancelled) setProfile(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    const unsubscribe = repo.onAuthChange(() => {
      void refresh()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [refresh])

  const signIn = useCallback(async (identifier: string, password: string) => {
    const p = await repo.signIn(identifier, password)
    setProfile(p)
    return p
  }, [])

  const signOut = useCallback(async () => {
    await repo.signOut()
    setProfile(null)
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ profile, loading, signIn, signOut, refresh }),
    [profile, loading, signIn, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Throws if called outside an authenticated route — keeps pages null-free. */
export function useProfile(): Profile {
  const { profile } = useAuth()
  if (!profile) throw new Error('useProfile requires an authenticated route')
  return profile
}
