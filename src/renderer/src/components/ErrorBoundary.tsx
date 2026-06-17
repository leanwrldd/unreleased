import { Component, ReactNode } from 'react'
import { AlertTriangle, Copy, Check } from 'lucide-react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { error: Error | null; copied: boolean; logPath: string | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, copied: false, logPath: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    console.error('ErrorBoundary caught:', error, info)
    // Write to crash log file
    window.api.logCrash(error.message, (error.stack ?? '') + '\n\nComponent stack:' + info.componentStack)
      .then((result) => {
        if (result.ok && result.path) this.setState({ logPath: result.path })
      })
      .catch(() => {/* silently ignore */})
  }

  private copyError = (): void => {
    const { error } = this.state
    if (!error) return
    const text = `${error.message}\n\n${error.stack ?? ''}`
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true })
      setTimeout(() => this.setState({ copied: false }), 2000)
    }).catch(() => {/* ignore */})
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center gap-3 p-8 text-center h-full flex-1">
            <AlertTriangle className="text-text-muted w-8 h-8" />
            <p className="text-text-primary text-sm font-semibold">Something went wrong</p>
            <p className="text-red-400 text-xs font-mono max-w-md break-all">
              {this.state.error.message}
            </p>
            <div className="relative w-full max-w-lg">
              <pre className="text-text-muted text-[10px] font-mono max-h-44 overflow-auto text-left bg-surface-overlay rounded-lg p-3 whitespace-pre-wrap">
                {this.state.error.stack}
              </pre>
              <button
                onClick={this.copyError}
                title="Copy error to clipboard"
                className="absolute top-2 right-2 p-1.5 rounded bg-surface-raised hover:bg-surface-highest text-text-muted hover:text-text-primary transition-colors"
              >
                {this.state.copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              </button>
            </div>
            {this.state.logPath && (
              <p className="text-text-muted text-[10px] font-mono opacity-60">
                Saved to {this.state.logPath}
              </p>
            )}
            <button
              className="text-xs text-accent hover:text-accent-hover underline mt-1"
              onClick={() => this.setState({ error: null, logPath: null })}
            >
              Try again
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
