import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface State {
  error: Error | null
}

/**
 * Last line of defence. The visit draft lives in sessionStorage, so a crash
 * here never loses the worker's entered data — hence the reassuring copy.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-md rounded-2xl border border-ink-200 bg-surface p-6 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-risk-amberSoft text-risk-amber">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="text-lg font-semibold text-ink-900">Something went wrong</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            The screen ran into an unexpected problem. Your entered data is still saved on this
            device.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-care-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-care-700"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Reload the page
          </button>
          {import.meta.env.DEV && (
            <pre className="scrollbar-slim mt-5 max-h-40 overflow-auto rounded-xl bg-ink-50 p-3 text-left text-xs text-ink-600">
              {this.state.error.stack ?? this.state.error.message}
            </pre>
          )}
        </div>
      </div>
    )
  }
}
