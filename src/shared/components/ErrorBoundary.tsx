import { Component, type ReactNode, type ComponentType } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ComponentType<{ error: Error; reset: () => void }>;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback;
        return <Fallback error={this.state.error} reset={this.handleReset} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-surface p-4">
          <div className="bg-card rounded-2xl p-8 shadow-sm text-center max-w-sm">
            <p style={{ fontSize: 48 }}>⚠️</p>
            <p className="text-text-primary font-bold mt-4 text-lg">Algo sali&oacute; mal</p>
            <p className="text-sm text-text-secondary mt-2">
              Ocurri&oacute; un error inesperado. Por favor, intenta de nuevo.
            </p>
            <button
              onClick={this.handleReset}
              className="mt-6 px-6 py-2.5 rounded-xl text-white font-medium text-sm"
              style={{ backgroundColor: 'var(--brand)' }}
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
