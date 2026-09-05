'use client';

import { Component, ReactNode, useState } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary component for catching React errors
 * Prevents entire app from crashing due to component errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Erreur interceptée:', error, errorInfo);
    
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        extra: errorInfo,
      });
    }
    
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-lg">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-error-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            
            <h2 className="mb-2 text-xl font-semibold text-neutral-900">
              Une erreur est survenue
            </h2>
            
            <p className="mb-4 text-neutral-600">
              {this.state.error?.message || 'Une erreur inattendue s\'est produite.'}
            </p>
            
            <div className="flex justify-center gap-3">
              <button type="button"
                onClick={this.handleReset}
                className="rounded-md bg-info-600 px-4 py-2 text-white transition-colors hover:bg-info-700"
              >
                Réessayer
              </button>
              
              <button type="button"
                onClick={() => window.location.reload()}
                className="rounded-md border border-neutral-300 px-4 py-2 text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                Recharger
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for using error boundary functionality
 */
export function useErrorHandler() {
  const [error, setError] = useState<Error | null>(null);

  const handleError = (err: Error) => {
    console.error('[useErrorHandler]', err);
    setError(err);
  };

  const clearError = () => {
    setError(null);
  };

  return { error, handleError, clearError };
}

export default ErrorBoundary;