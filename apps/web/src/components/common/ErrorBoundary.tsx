import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs the error, and displays a fallback UI with a retry button.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <GanttChart ... />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);

    // In production, send to error tracking service (Sentry, etc.)
    // errorReporter.capture(error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            textAlign: 'center',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            minHeight: 300,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              marginBottom: 16,
            }}
          >
            💥
          </div>

          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-primary, #1f2937)',
              marginBottom: 6,
            }}
          >
            Something went wrong
          </h3>

          <p
            style={{
              fontSize: 13,
              color: 'var(--text-secondary, #6b7280)',
              maxWidth: 400,
              lineHeight: 1.5,
              marginBottom: 20,
            }}
          >
            An unexpected error occurred. This has been logged. You can try again or refresh the page.
          </p>

          {/* Error details (dev only) */}
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <details
              style={{
                fontSize: 11,
                color: '#ef4444',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '8px 12px',
                maxWidth: 500,
                textAlign: 'left',
                marginBottom: 16,
                cursor: 'pointer',
              }}
            >
              <summary style={{ fontWeight: 600, marginBottom: 4 }}>
                Error details
              </summary>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: 10,
                  margin: 0,
                }}
              >
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: 'none',
                background: '#1e3a5f',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: '1px solid var(--border, #e5e7eb)',
                background: 'var(--bg-surface, #fff)',
                color: 'var(--text-secondary, #6b7280)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
