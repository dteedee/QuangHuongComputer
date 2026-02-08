import React, { ButtonHTMLAttributes } from 'react';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    loadingText?: string;
    children: React.ReactNode;
}

/**
 * Button component with built-in loading state
 * Prevents double submissions and provides user feedback
 */
export const LoadingButton: React.FC<LoadingButtonProps> = ({
    isLoading = false,
    loadingText = 'Đang xử lý...',
    children,
    disabled,
    className = '',
    ...props
}) => {
    return (
        <button
            disabled={disabled || isLoading}
            className={`
                inline-flex items-center justify-center
                px-4 py-2 border border-transparent
                text-sm font-medium rounded-md
                focus:outline-none focus:ring-2 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
                ${isLoading ? 'cursor-wait' : ''}
                ${className}
            `}
            {...props}
        >
            {isLoading ? (
                <>
                    <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
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
                    {loadingText}
                </>
            ) : (
                children
            )}
        </button>
    );
};

/**
 * Primary loading button variant
 */
export const PrimaryLoadingButton: React.FC<LoadingButtonProps> = (props) => {
    return (
        <LoadingButton
            className="bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
            {...props}
        />
    );
};

/**
 * Secondary loading button variant
 */
export const SecondaryLoadingButton: React.FC<LoadingButtonProps> = (props) => {
    return (
        <LoadingButton
            className="bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500"
            {...props}
        />
    );
};

/**
 * Danger loading button variant
 */
export const DangerLoadingButton: React.FC<LoadingButtonProps> = (props) => {
    return (
        <LoadingButton
            className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
            {...props}
        />
    );
};

export default LoadingButton;
