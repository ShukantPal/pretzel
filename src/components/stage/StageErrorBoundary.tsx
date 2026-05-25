import React from 'react';

interface StageErrorBoundaryProps {
  children: React.ReactNode;
}

interface StageErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class StageErrorBoundary extends React.Component<StageErrorBoundaryProps, StageErrorBoundaryState> {
  state: StageErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): StageErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error) {
    console.error('[StageErrorBoundary] Stage panel crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass" style={{ padding: '18px', color: '#f5f7fb' }}>
          <h3 className="pane-title" style={{ color: 'var(--neon-orange)' }}>Stage Panel Error</h3>
          <p className="pane-subtle" style={{ marginTop: '8px' }}>
            The arrangement view crashed, but the rest of the stage is still alive.
          </p>
          <pre className="mono" style={{ marginTop: '12px', whiteSpace: 'pre-wrap' }}>
            {this.state.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
