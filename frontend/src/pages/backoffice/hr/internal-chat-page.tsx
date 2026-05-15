import { useState, useRef, useEffect } from 'react';

interface Message {
    id: string;
    author: string;
    avatar: string;
    text: string;
    time: string;
}

interface Channel {
    id: string;
    name: string;
    description: string;
    unread: number;
}

const CHANNELS: Channel[] = [
    { id: 'general', name: '#general', description: 'Thông tin chung', unread: 0 },
    { id: 'announcements', name: '#announcements', description: 'Thông báo công ty', unread: 2 },
    { id: 'tech', name: '#ky-thuat', description: 'Kỹ thuật & IT', unread: 0 },
    { id: 'sales', name: '#kinh-doanh', description: 'Kinh doanh & bán hàng', unread: 1 },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
    general: [
        { id: '1', author: 'Nguyễn Văn A', avatar: 'N', text: 'Chào mọi người! Hôm nay bắt đầu tuần mới rồi 😊', time: '08:30' },
        { id: '2', author: 'Trần Thị B', avatar: 'T', text: 'Chào buổi sáng! Hôm nay họp lúc 9h nhé anh chị em.', time: '08:45' },
        { id: '3', author: 'Lê Văn C', avatar: 'L', text: 'Ok, mình sẽ tham gia đúng giờ!', time: '08:50' },
    ],
    announcements: [
        { id: '1', author: 'Ban Giám Đốc', avatar: 'B', text: '📢 Thông báo: Công ty sẽ tổ chức team building vào cuối tháng. Chi tiết sẽ được thông báo sau.', time: '09:00' },
        { id: '2', author: 'HR Manager', avatar: 'H', text: '📋 Nhắc nhở: Nộp báo cáo tháng trước ngày 15.', time: '10:00' },
    ],
    tech: [],
    sales: [
        { id: '1', author: 'Sale Team', avatar: 'S', text: 'Tháng này mục tiêu doanh số 500 triệu, cố lên team!', time: '08:00' },
    ],
};

export default function InternalChatPage() {
    const [activeChannel, setActiveChannel] = useState<string>('general');
    const [messages, setMessages] = useState<Record<string, Message[]>>(MOCK_MESSAGES);
    const [channels, setChannels] = useState<Channel[]>(CHANNELS);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeChannel]);

    const handleSend = () => {
        const text = input.trim();
        if (!text) return;
        const newMsg: Message = {
            id: Date.now().toString(),
            author: 'Bạn',
            avatar: 'B',
            text,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => ({
            ...prev,
            [activeChannel]: [...(prev[activeChannel] || []), newMsg],
        }));
        setInput('');
    };

    const handleChannelClick = (id: string) => {
        setActiveChannel(id);
        setChannels(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
    };

    const currentChannel = channels.find(c => c.id === activeChannel);
    const currentMessages = messages[activeChannel] || [];

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Chat Nội Bộ</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex" style={{ height: '70vh' }}>
                {/* Sidebar */}
                <div className="w-56 border-r border-gray-100 flex flex-col shrink-0">
                    <div className="p-4 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-400">Kênh</p>
                    </div>
                    <div className="flex-1 overflow-y-auto py-2">
                        {channels.map(ch => (
                            <button
                                key={ch.id}
                                onClick={() => handleChannelClick(ch.id)}
                                className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors rounded-lg mx-1 ${activeChannel === ch.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <span className="text-sm font-medium truncate">{ch.name}</span>
                                {ch.unread > 0 && (
                                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0 ml-1">
                                        {ch.unread}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="p-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400 text-center">
                            SignalR real-time<br />sẽ kết nối sau
                        </p>
                    </div>
                </div>

                {/* Main Chat */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
                        <div>
                            <p className="font-semibold text-sm text-gray-900">{currentChannel?.name}</p>
                            <p className="text-xs text-gray-400">{currentChannel?.description}</p>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {currentMessages.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-gray-400 text-sm">Chưa có tin nhắn trong kênh này</p>
                            </div>
                        ) : currentMessages.map(msg => (
                            <div key={msg.id} className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                                    {msg.avatar}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-sm font-semibold text-gray-800">{msg.author}</span>
                                        <span className="text-xs text-gray-400">{msg.time}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-gray-100">
                        <div className="flex gap-2">
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                placeholder={`Nhắn tin vào ${currentChannel?.name}...`}
                                className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Gửi
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
