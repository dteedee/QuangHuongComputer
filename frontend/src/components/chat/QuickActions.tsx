import { memo } from 'react';
import { MessageSquare, Package, Shield, Phone } from 'lucide-react';

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  message: string;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: 'products',
    label: 'Xem sản phẩm',
    icon: <Package className="w-4 h-4" />,
    message: 'Cho tôi xem các sản phẩm laptop mới nhất'
  },
  {
    id: 'warranty',
    label: 'Chính sách bảo hành',
    icon: <Shield className="w-4 h-4" />,
    message: 'Chính sách bảo hành là gì?'
  },
  {
    id: 'support',
    label: 'Hỗ trợ',
    icon: <Phone className="w-4 h-4" />,
    message: 'Tôi cần hỗ trợ kỹ thuật'
  },
  {
    id: 'questions',
    label: 'Câu hỏi thường gặp',
    icon: <MessageSquare className="w-4 h-4" />,
    message: 'Các câu hỏi thường gặp'
  }
];

interface QuickActionsProps {
  actions?: QuickAction[];
  onActionClick: (message: string) => void;
  className?: string;
}

export const QuickActions = memo(({
  actions = DEFAULT_ACTIONS,
  onActionClick,
  className = ''
}: QuickActionsProps) => {
  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onActionClick(action.message)}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white transition-all hover:scale-[1.02]"
        >
          <div className="text-blue-400">{action.icon}</div>
          <span className="text-xs font-medium">{action.label}</span>
        </button>
      ))}
    </div>
  );
});

QuickActions.displayName = 'QuickActions';
