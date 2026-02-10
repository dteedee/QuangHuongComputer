import { memo } from 'react';
import { Check, CheckCheck } from 'lucide-react';

export interface MessageData {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  isOwn?: boolean;
  isSystem?: boolean;
  isRead?: boolean;
}

interface MessageBubbleProps {
  message: MessageData;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  showReadStatus?: boolean;
}

export const MessageBubble = memo<MessageBubbleProps>(({
  message,
  showAvatar = true,
  showTimestamp = true,
  showReadStatus = true
}: MessageBubbleProps) => {
  const { text, sender, timestamp, isOwn, isSystem, isRead } = message;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-gray-100 text-gray-600 text-xs italic px-4 py-2 rounded-full max-w-md text-center border border-gray-200">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      {showAvatar && !isOwn && (
        <span className="text-xs text-gray-500 mb-1 px-1 font-medium">{sender}</span>
      )}

      <div className="flex items-end gap-2 max-w-[75%]">
        {isOwn && showTimestamp && (
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {formatTime(timestamp)}
          </span>
        )}

        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
            isOwn
              ? 'bg-[#D70018] text-white rounded-br-sm shadow-lg shadow-red-500/20'
              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
          }`}
        >
          <div className="break-words whitespace-pre-wrap">{text}</div>

          {isOwn && showReadStatus && (
            <div className="flex justify-end mt-1">
              {isRead ? (
                <CheckCheck className="w-4 h-4 text-blue-200" />
              ) : (
                <Check className="w-4 h-4 text-white/60" />
              )}
            </div>
          )}
        </div>

        {!isOwn && showTimestamp && (
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {formatTime(timestamp)}
          </span>
        )}
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
