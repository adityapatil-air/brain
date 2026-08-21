import { useCallback, useEffect, useRef, useState } from 'react'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  reload: () => void
  setData: (updater: T | ((prev: T | null) => T | null)) => void
}

/**
 * Loads data on mount and whenever `deps` change, with a stable `reload()`.
 * Results from a superseded request are discarded.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)
  const runId = useRef(0)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    const id = ++runId.current
    setLoading(true)
    setError(null)
    void fnRef
      .current()
      .then((result) => {
        if (runId.current === id) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (runId.current === id) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setLoading(false)
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  const update = useCallback((updater: T | ((prev: T | null) => T | null)) => {
    setData((prev) => (typeof updater === 'function' ? (updater as (p: T | null) => T | null)(prev) : updater))
  }, [])

  return { data, loading, error, reload, setData: update }
}

/** Wraps a one-shot action with pending/error state, for buttons. */
export function useAction<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
): {
  run: (...args: Args) => Promise<R | undefined>
  pending: boolean
  error: Error | null
  reset: () => void
} {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const fnRef = useRef(fn)
  fnRef.current = fn

  const run = useCallback(async (...args: Args) => {
    setPending(true)
    setError(null)
    try {
      return await fnRef.current(...args)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      return undefined
    } finally {
      setPending(false)
    }
  }, [])

  return { run, pending, error, reset: () => setError(null) }
}
