import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '../ui/button';
import { AlertCircle, RefreshCcw, Home, ArrowLeft } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] h-full flex flex-col items-center justify-center p-6 bg-background text-foreground text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            We encountered an unexpected error while trying to render this section. 
            Please try refreshing or navigating back.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button onClick={this.handleRetry} variant="default">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button onClick={() => window.history.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={() => window.location.href = '/student'} variant="secondary">
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

