import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log the error to an error reporting service
        console.error('Error caught by ErrorBoundary:', error, errorInfo);

        // Log additional component stack
        console.error('Component Stack:', errorInfo.componentStack);

        // Send to error tracking service (e.g., Sentry, LogRocket)
        // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });

        this.setState({
            error,
            errorInfo
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });

        // Refresh the page to reset state
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                    <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
                        <div className="text-center">
                            <div className="text-red-500 text-6xl mb-4">
                                <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Đã có lỗi xảy ra!
                            </h1>
                            <p className="text-gray-600 mb-6">
                                Ứng dụng gặp một lỗi không mong muốn. Vui lòng tải lại trang hoặc thử lại sau.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={this.handleReset}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    Tải lại trang
                                </button>
                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                                >
                                    Về trang chủ
                                </button>
                            </div>
                        </div>

                        {import.meta.env.MODE === 'development' && this.state.error && (
                            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <h4 className="text-red-800 font-semibold mb-2">
                                    Chi tiết lỗi (Development Mode):
                                </h4>
                                <pre className="text-xs text-red-700 overflow-auto max-h-96">
                                    {this.state.error.toString()}
                                    {'\n'}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

/**
 * HOC to wrap components with Error Boundary
 */
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallback?: ReactNode
) {
    return function WithErrorBoundary(props: P) {
        return (
            <ErrorBoundary fallback={fallback}>
                <Component {...props} />
            </ErrorBoundary>
        );
    };
}

/**
 * Async Error Boundary for handling async errors
 */
export class AsyncErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Async error caught:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800">
                        Đang tải dữ liệu bị lỗi.{' '}
                        <button onClick={this.handleReset} className="underline font-semibold">
                            Thử lại
                        </button>
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}
