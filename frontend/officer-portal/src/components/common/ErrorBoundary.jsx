import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '../ui';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 text-center my-4 max-w-2xl mx-auto">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-navy">Unable to display dashboard content</h3>
          <p className="mt-1 text-xs text-ink-soft max-w-md mx-auto">
            {this.state.error?.message || 'A transient rendering issue occurred while loading this view.'}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button size="sm" variant="outline" onClick={this.handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Try Again
            </Button>
            <Button size="sm" onClick={() => window.location.reload()}>
              Reload Workspace
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;

