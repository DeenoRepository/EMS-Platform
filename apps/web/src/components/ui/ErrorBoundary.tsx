'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorState } from './ErrorState';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  title?: string;
  description?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    } else {
      console.error('[ErrorBoundary caught error]:', error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, title, description } = this.props;

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback(error, this.handleReset);
      }

      if (fallback) {
        return fallback;
      }

      return (
        <ErrorState
          title={title || 'Произошла ошибка при отображении компонента'}
          description={description || 'Возникло исключение при рендеринге страницы или виджета.'}
          error={error}
          onRetry={this.handleReset}
          paper
        />
      );
    }

    return children;
  }
}
