import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#FFFBFC] dark:bg-[#050505]">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-pink-100 dark:border-pink-900/30 text-center space-y-6">
            <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/20 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-pink-500" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Something went wrong</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                We encountered an unexpected error. Don't worry, your vibes are still safe!
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl text-left overflow-auto max-h-32">
                <code className="text-xs text-pink-600 dark:text-pink-400 font-mono">
                  {this.state.error.message}
                </code>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => window.location.reload()}
                className="w-full h-12 rounded-full bg-pink-500 hover:bg-pink-600 text-white font-bold shadow-lg shadow-pink-500/20"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Try Again
              </Button>
              
              <Button 
                variant="outline"
                onClick={this.handleReset}
                className="w-full h-12 rounded-full border-pink-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300 font-bold"
              >
                <Home className="w-4 h-4 mr-2" /> Back to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
