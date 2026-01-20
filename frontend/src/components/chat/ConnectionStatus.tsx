import { memo } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting' | 'failed';

interface ConnectionStatusProps {
  status: ConnectionState;
  onRetry?: () => void;
  showLabel?: boolean;
}

export const ConnectionStatus = memo(({ status, onRetry, showLabel = true }: ConnectionStatusProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="w-4 h-4" />,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          label: 'Đã kết nối',
          pulseColor: 'bg-green-500'
        };
      case 'reconnecting':
        return {
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          label: 'Đang kết nối lại...',
          pulseColor: 'bg-yellow-500'
        };
      case 'failed':
        return {
          icon: <WifiOff className="w-4 h-4" />,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          label: 'Kết nối thất bại',
          pulseColor: 'bg-red-500'
        };
      case 'disconnected':
      default:
        return {
          icon: <WifiOff className="w-4 h-4" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          label: 'Không kết nối',
          pulseColor: 'bg-gray-500'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor}`}>
        <div className="relative">
          {status === 'connected' && (
            <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 ${config.pulseColor} rounded-full animate-ping`} />
          )}
          <div className={config.color}>{config.icon}</div>
        </div>
        {showLabel && (
          <span className={`text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        )}
      </div>

      {status === 'failed' && onRetry && (
        <button
          onClick={onRetry}
          className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors font-medium"
        >
          Thử lại
        </button>
      )}
    </div>
  );
});

ConnectionStatus.displayName = 'ConnectionStatus';
