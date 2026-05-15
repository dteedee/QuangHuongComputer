import { useState, useMemo } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    Bell, Check, Search, X, 
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
    
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const confirm = useConfirm();

    const tabs: { id: TabType; label: string; icon?: React.ReactNode }[] = [
        { id: 'all', label: 'Tất cả thông báo' },
        { id: 'unread', label: 'Chưa đọc' },
        { id: 'order', label: 'Đơn hàng', icon: <ShoppingCart size={16} /> },
        { id: 'repair', label: 'Sửa chữa', icon: <Wrench size={16} /> },
        { id: 'warranty', label: 'Bảo hành', icon: <ShieldCheck size={16} /> },
        { id: 'inventory', label: 'Kho hàng', icon: <Box size={16} /> },
        { id: 'crm', label: 'CRM', icon: <Users size={16} /> },
        { id: 'system', label: 'Hệ thống', icon: <Settings size={16} /> },
    ];

    const filteredNotifications = useMemo(() => {
        return notifications.filter(notif => {
            if (activeTab === 'unread' && notif.read) return false;
            if (activeTab !== 'all' && activeTab !== 'unread' && notif.type !== activeTab) return false;
            
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
            message: 'Bạn có chắc chắn muốn đánh dấu toàn bộ thông báo là đã đọc?' 
        });
        if (!ok) return;
        
        await markAllAsRead();
        toast.success('Đã đánh dấu tất cả là đã đọc');
    };

    const getIcon = (type: string, priority?: string) => {
        if (priority === 'high') {
            return <div className="p-3 bg-red-100 text-red-600 rounded-2xl shadow-sm"><AlertCircle size={22} strokeWidth={2.5} /></div>;
        }
        switch (type) {
            case 'order': return <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-sm"><ShoppingCart size={22} /></div>;
            case 'repair': return <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl shadow-sm"><Wrench size={22} /></div>;
            case 'warranty': return <div className="p-3 bg-green-100 text-green-600 rounded-2xl shadow-sm"><ShieldCheck size={22} /></div>;
            case 'inventory': return <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl shadow-sm"><Box size={22} /></div>;
            case 'crm': return <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl shadow-sm"><Users size={22} /></div>;
            default: return <div className="p-3 bg-gray-100 text-gray-600 rounded-2xl shadow-sm"><Settings size={22} /></div>;
        }
    };

    return (
        <div className="p-4 lg:p-8 max-w-[1400px] mx-auto h-[calc(100vh-64px)] flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3 tracking-tight">
                        <div className="p-2 bg-accent/10 rounded-xl">
                            <Bell className="w-8 h-8 text-accent" />
                        </div>
                        Trung tâm Thông báo
                    </h1>
                    <p className="text-gray-500 text-base mt-2 ml-1">
                        Quản lý toàn bộ cập nhật, nhắc nhở và cảnh báo từ hệ thống Backoffice
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={refresh}
                        className="px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:border-gray-300 hover:bg-gray-50 transition-all active:scale-95"
                    >
                        Khôi phục
                    </button>
                    <button
                        onClick={handleMarkAllAsRead}
                        disabled={notifications.every(n => n.read)}
                        className="px-5 py-2.5 bg-accent text-white rounded-xl font-bold hover:bg-accent-hover transition-all active:scale-95 border-2 border-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-blue-600/15"
                    >
                        <Check size={18} strokeWidth={2.5} />
                        Đánh dấu tất cả đã đọc
                    </button>
                </div>
            </div>

            {/* Main Application Area */}
            <div className="flex-1 bg-white border flex flex-col md:flex-row rounded-3xl shadow-xl shadow-gray-200/40 overflow-hidden min-h-0">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-72 bg-gray-50/80 border-r border-gray-100 flex flex-col shrink-0">
                    <div className="p-5 border-b border-gray-100 bg-white">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm nội dung..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-10 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-200 text-gray-500 rounded-full hover:bg-gray-300 transition-colors"
                                >
                                    <X size={12} strokeWidth={3} />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="p-3 overflow-y-auto flex-1 custom-scrollbar">
                        <div className="space-y-1.5">
                            {tabs.map((tab) => {
                                const count = notifications.filter(n => {
                                    if (tab.id === 'all') return true;
                                    if (tab.id === 'unread') return !n.read;
                                    return n.type === tab.id;
                                }).length;
                                
                                const unreadInTab = notifications.filter(n => {
                                    if (tab.id === 'unread') return false; 
                                    if (tab.id === 'all') return !n.read;
                                    return n.type === tab.id && !n.read;
                                }).length;

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                                            activeTab === tab.id 
                                                ? 'bg-white text-accent shadow-sm ring-1 ring-gray-100' 
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {tab.icon && (
                                                <span className={`${activeTab === tab.id ? 'text-accent' : 'text-gray-400 group-hover:text-gray-600'} transition-colors`}>
                                                    {tab.icon}
                                                </span>
                                            )}
                                            {tab.label}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {unreadInTab > 0 && tab.id !== 'unread' && (
                                                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                                            )}
                                            <span className={`text-xs px-2.5 py-1 rounded-lg font-bold min-w-[28px] text-center ${
                                                activeTab === tab.id 
                                                    ? 'bg-accent/10 text-accent' 
                                                    : 'bg-gray-200/70 text-gray-500 group-hover:bg-gray-200'
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

                {/* Notifications Feed */}
                <div className="flex-1 overflow-y-auto bg-gray-50/30 relative">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <div className="w-10 h-10 border-4 border-gray-200 border-t-accent rounded-full animate-spin mb-4" />
                            <p className="font-bold">Đang đồng bộ dữ liệu...</p>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white">
                            <div className="p-6 bg-gray-50 rounded-full mb-6">
                                <Bell className="w-16 h-16 text-gray-300" />
                            </div>
                            <h3 className="font-semibold text-xl text-gray-900 mb-2">Hộp thư trống</h3>
                            <p className="text-gray-500 font-medium text-center max-w-sm">
                                Hiện không có thông báo nào trong danh mục này. Hãy thử chọn Tab khác.
                            </p>
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="mt-6 px-6 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Xóa bộ lọc tìm kiếm
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto">
                            {filteredNotifications.map((notification) => (
                                <div 
                                    key={notification.id} 
                                    className={`group relative p-5 bg-white rounded-3xl border transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 flex gap-5 ${
                                        !notification.read ? 'border-accent/30 ring-4 ring-accent/5' : 'border-gray-100'
                                    }`}
                                >
                                    {/* Invisible Overlay Div for making the whole card route without breaking nested buttons */}
                                    {notification.link && (
                                        <div 
                                            className="absolute inset-0 z-0 rounded-3xl cursor-pointer"
                                            onClick={() => {
                                                if (!notification.read) markAsRead(notification.id);
                                                navigate(notification.link!);
                                            }}
                                            title="Xem chi tiết"
                                        />
                                    )}

                                    {/* Unread dot */}
                                    {!notification.read && (
                                        <div className="absolute top-6 right-6 w-3 h-3 rounded-full bg-accent ring-4 ring-accent/20" />
                                    )}

                                    {/* Icon */}
                                    <div className="flex-shrink-0 z-10">
                                        {getIcon(notification.type, notification.priority)}
                                    </div>

                                    {/* Content Info */}
                                    <div className="flex-1 min-w-0 py-1 pr-8">
                                        <div className="flex items-center gap-3 mb-1.5">
                                            <h3 className={`font-bold text-[17px] truncate ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
                                                {notification.title}
                                            </h3>
                                            {notification.priority === 'high' && (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs uppercase font-semibold tracking-wider rounded-md shrink-0">
                                                    Khẩn cấp
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-[15px] leading-relaxed mb-4 ${!notification.read ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                                            {notification.message}
                                        </p>
                                        
                                        <div className="flex items-center justify-between z-10 relative">
                                            <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">
                                                <Clock size={14} />
                                                {notification.time}
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                {!notification.read && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            markAsRead(notification.id);
                                                        }}
                                                        className="px-4 py-2 bg-blue-50 text-accent font-bold text-sm rounded-xl hover:bg-blue-100 hover:text-blue-700 transition-colors"
                                                    >
                                                        Đã đọc
                                                    </button>
                                                )}
                                                {notification.link && (
                                                    <button
                                                        onClick={() => {
                                                            if (!notification.read) markAsRead(notification.id);
                                                            navigate(notification.link!);
                                                        }}
                                                        className="px-4 py-2 border-2 border-gray-100 bg-white text-gray-700 font-bold text-sm rounded-xl hover:border-gray-200 hover:bg-gray-50 transition-colors z-10 relative"
                                                    >
                                                        Chi tiết
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #e5e7eb;
                    border-radius: 10px;
                }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                    background-color: #d1d5db;
                }
            `}</style>
        </div>
    );
}
