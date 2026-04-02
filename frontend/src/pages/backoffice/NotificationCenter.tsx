import { useState, useMemo } from 'react';
import { useNotifications, type Notification } from '../../hooks/useNotifications';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
    Bell, Check, Trash2, Filter, Search, X, 
    ShoppingCart, Wrench, ShieldCheck, Box, Settings, Users,
    AlertCircle, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';

type TabType = 'all' | 'unread' | 'order' | 'repair' | 'warranty' | 'inventory' | 'system' | 'crm';

export default function NotificationCenter() {
    const { user } = useAuth();
    // Enable realtime but disable toast to avoid duplicate toasts if the Bell component already shows them
    const { 
        notifications, 
        loading, 
        markAsRead, 
        markAllAsRead, 
        refresh 
    } = useNotifications({ 
        roles: user?.roles || [],
        showToastOnNewNotification: false
    });
    
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const confirm = useConfirm();

    const tabs: { id: TabType; label: string; icon?: React.ReactNode }[] = [
        { id: 'all', label: 'Tất cả' },
        { id: 'unread', label: 'Chưa đọc' },
        { id: 'order', label: 'Đơn hàng', icon: <ShoppingCart size={14} /> },
        { id: 'repair', label: 'Sửa chữa', icon: <Wrench size={14} /> },
        { id: 'warranty', label: 'Bảo hành', icon: <ShieldCheck size={14} /> },
        { id: 'inventory', label: 'Kho hàng', icon: <Box size={14} /> },
        { id: 'system', label: 'Hệ thống', icon: <Settings size={14} /> },
        { id: 'crm', label: 'CRM', icon: <Users size={14} /> },
    ];

    const filteredNotifications = useMemo(() => {
        return notifications.filter(notif => {
            // Tab filter
            if (activeTab === 'unread' && notif.read) return false;
            if (activeTab !== 'all' && activeTab !== 'unread' && notif.type !== activeTab) return false;
            
            // Search filter
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                return notif.title.toLowerCase().includes(searchLower) || 
                       notif.message.toLowerCase().includes(searchLower);
            }
            
            return true;
        });
    }, [notifications, activeTab, searchTerm]);

    const handleMarkAllAsRead = async () => {
        const ok = await confirm({ 
            title: 'Đánh dấu tất cả đã đọc',
            message: 'Bạn có chắc chắn muốn đánh dấu tất cả thông báo là đã đọc?' 
        });
        if (!ok) return;
        
        await markAllAsRead();
        toast.success('Đã đánh dấu tất cả là đã đọc');
    };

    const getIcon = (type: string, priority?: string) => {
        if (priority === 'high') {
            return <div className="p-2 bg-red-100 text-red-600 rounded-lg"><AlertCircle size={20} /></div>;
        }
        switch (type) {
            case 'order': return <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ShoppingCart size={20} /></div>;
            case 'repair': return <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Wrench size={20} /></div>;
            case 'warranty': return <div className="p-2 bg-green-100 text-green-600 rounded-lg"><ShieldCheck size={20} /></div>;
            case 'inventory': return <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Box size={20} /></div>;
            case 'crm': return <div className="p-2 bg-violet-100 text-violet-600 rounded-lg"><Users size={20} /></div>;
            default: return <div className="p-2 bg-gray-100 text-gray-600 rounded-lg"><Settings size={20} /></div>;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Bell className="w-7 h-7 text-accent" />
                        Trung tâm Thông báo
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Quản lý tất cả thông báo và cảnh báo từ hệ thống
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={refresh}
                        className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        Tải lại
                    </button>
                    <button
                        onClick={handleMarkAllAsRead}
                        disabled={notifications.every(n => n.read)}
                        className="px-4 py-2 bg-accent text-white rounded-xl font-bold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Check size={18} />
                        Đánh dấu tất cả đã đọc
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row h-[700px]">
                {/* Sidebar / Filters */}
                <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50 flex flex-col">
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Tìm thông báo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-accent outline-none transition-colors"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="p-2 flex-grow overflow-y-auto">
                        <div className="space-y-1">
                            {tabs.map((tab) => {
                                const count = notifications.filter(n => {
                                    if (tab.id === 'all') return true;
                                    if (tab.id === 'unread') return !n.read;
                                    return n.type === tab.id;
                                }).length;
                                
                                const unreadInTab = notifications.filter(n => {
                                    if (tab.id === 'unread') return false; // not applicable
                                    if (tab.id === 'all') return !n.read;
                                    return n.type === tab.id && !n.read;
                                }).length;

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                            activeTab === tab.id 
                                                ? 'bg-accent/10 text-accent font-bold' 
                                                : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {tab.icon && <span className={activeTab === tab.id ? 'text-accent' : 'text-gray-400'}>{tab.icon}</span>}
                                            {tab.label}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {unreadInTab > 0 && tab.id !== 'unread' && (
                                                <span className="w-2 h-2 rounded-full bg-accent"></span>
                                            )}
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                activeTab === tab.id ? 'bg-accent/20 text-accent' : 'bg-gray-200 text-gray-500'
                                            }`}>
                                                {count}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Main Content Component List */}
                <div className="flex-1 overflow-y-auto bg-white p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <div className="w-8 h-8 border-4 border-gray-200 border-t-accent rounded-full animate-spin mb-4" />
                            Đang tải thông báo...
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <Bell className="w-16 h-16 mb-4 text-gray-200" />
                            <p className="font-medium text-lg text-gray-500">Trống</p>
                            <p className="text-sm">Không có thông báo nào thỏa mãn bộ lọc</p>
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="mt-4 text-accent text-sm font-bold hover:underline"
                                >
                                    Xóa bộ lọc tìm kiếm
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredNotifications.map((notification) => (
                                <div 
                                    key={notification.id} 
                                    className={`relative p-4 rounded-xl border transition-all ${
                                        !notification.read 
                                            ? 'bg-blue-50/50 border-blue-100 shadow-sm' 
                                            : 'bg-white border-gray-100 hover:border-gray-200'
                                    }`}
                                >
                                    {!notification.read && (
                                        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-accent" />
                                    )}
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 mt-1">
                                            {getIcon(notification.type, notification.priority)}
                                        </div>
                                        <div className="flex-1 pr-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                                <h3 className={`font-bold text-base ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                                    {notification.title}
                                                </h3>
                                                <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                                                    <Clock size={12} />
                                                    {notification.time}
                                                </div>
                                            </div>
                                            <p className={`text-sm mb-3 line-clamp-2 ${!notification.read ? 'text-gray-700' : 'text-gray-500'}`}>
                                                {notification.message}
                                            </p>
                                            
                                            <div className="flex items-center justify-between">
                                                {notification.link ? (
                                                    <Link 
                                                        to={notification.link}
                                                        className="text-accent text-sm font-bold hover:underline inline-flex items-center gap-1"
                                                        onClick={() => !notification.read && markAsRead(notification.id)}
                                                    >
                                                        Xem chi tiết
                                                    </Link>
                                                ) : (
                                                    <div />
                                                )}
                                                
                                                <div className="flex items-center gap-2">
                                                    {!notification.read && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                markAsRead(notification.id);
                                                            }}
                                                            className="text-xs font-bold text-gray-500 hover:text-accent bg-gray-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                                                        >
                                                            Đánh dấu đã đọc
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
