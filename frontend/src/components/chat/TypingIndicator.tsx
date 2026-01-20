import { memo } from 'react';

interface TypingIndicatorProps {
  userName?: string;
  variant?: 'default' | 'compact';
}

export const TypingIndicator = memo(({ userName, variant = 'default' }: TypingIndicatorProps) => {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="px-4 py-3 rounded-xl bg-white/10 flex items-center gap-2">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      {userName && (
        <span className="text-xs text-gray-400 mt-1">{userName} đang soạn tin...</span>
      )}
    </div>
  );
});

TypingIndicator.displayName = 'TypingIndicator';
