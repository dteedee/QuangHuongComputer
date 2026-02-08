import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: string;
    className?: string;
}

/**
 * Loading spinner component for async operations
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    color = 'currentColor',
    className = ''
}) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12'
    };

    return (
        <div className={`inline-block ${className}`}>
            <svg
                className={`animate-spin ${sizeClasses[size]}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                style={{ color }}
            >
                <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                />
                <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
            </svg>
        </div>
    );
};

/**
 * Full page loading overlay
 */
export const LoadingOverlay: React.FC<{
    isLoading: boolean;
    text?: string;
}> = ({ isLoading, text = 'Đang tải...' }) => {
    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-75 backdrop-blur-sm">
            <div className="text-center">
                <LoadingSpinner size="lg" color="#D70018" />
                <p className="mt-4 text-gray-700 font-medium">{text}</p>
            </div>
        </div>
    );
};

/**
 * Loading skeleton for content placeholders
 */
export const LoadingSkeleton: React.FC<{
    width?: string;
    height?: string;
    className?: string;
}> = ({ width = '100%', height = '1rem', className = '' }) => {
    return (
        <div
            className={`animate-pulse bg-gray-200 rounded ${className}`}
            style={{ width, height }}
        />
    );
};

/**
 * Card skeleton loader
 */
export const CardSkeleton: React.FC = () => {
    return (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
            <LoadingSkeleton height="200px" className="w-full" />
            <LoadingSkeleton width="75%" height="1.5rem" />
            <LoadingSkeleton width="50%" height="1rem" />
            <LoadingSkeleton width="25%" height="2rem" />
        </div>
    );
};

/**
 * Table row skeleton loader
 */
export const TableRowSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <tr key={i}>
                    <td className="px-6 py-4">
                        <LoadingSkeleton width="80%" />
                    </td>
                    <td className="px-6 py-4">
                        <LoadingSkeleton width="60%" />
                    </td>
                    <td className="px-6 py-4">
                        <LoadingSkeleton width="40%" />
                    </td>
                    <td className="px-6 py-4">
                        <LoadingSkeleton width="50%" />
                    </td>
                </tr>
            ))}
        </>
    );
};

export default LoadingSpinner;
