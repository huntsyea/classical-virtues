'use client';

import React from 'react';
import Link from 'next/link';
import Ornament from '@/components/Ornament';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={this.state.error!} 
            reset={() => this.setState({ hasError: false, error: undefined })}
          />
        );
      }

      return (
        <div role="alert" className="page-wrap py-24 text-center sm:py-32">
          <Ornament className="mx-auto text-primary" />
          <h1 className="headline-2 mt-6">This page could not be fetched just now</h1>
          <p className="dek mx-auto mt-4 max-w-md">
            Something interrupted it on the way. Please try again, or return to
            the stories.
          </p>
          <div className="mt-8 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="button-primary"
            >
              Try again
            </button>
            <Link href="/stories" className="text-link inline-flex min-h-11 items-center text-[0.9375rem]">
              Back to the stories
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;