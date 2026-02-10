
import { useState, useRef, useEffect } from 'react';
import client from '../api/client';
import { MessageCircle, Send, X, Bot, Sparkles, User } from 'lucide-react';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

export const AiChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: 'Xin chào! Tôi là trợ lý ảo của QUANG HƯỞNG Computer. Tôi có thể giúp gì cho bạn?', sender: 'ai', timestamp: new Date() }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user', timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const { data } = await client.post('/ai/chat', { message: input });
            const aiMsg: Message = { id: (Date.now() + 1).toString(), text: data.response, sender: 'ai', timestamp: new Date() };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            const errorMsg: Message = { id: (Date.now() + 1).toString(), text: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.', sender: 'ai', timestamp: new Date() };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] font-sans">
            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-[#D70018] rounded-full flex items-center justify-center text-white shadow-lg shadow-red-500/30 hover:bg-[#b50014] transition-all transform hover:scale-110 active:scale-95 group"
                >
                    <MessageCircle size={28} className="group-hover:rotate-12 transition-transform" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="w-[360px] h-[520px] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-[#D70018] to-[#ff4d4d] flex justify-between items-center shadow-md z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                                <Bot size={22} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-black text-sm uppercase tracking-wide flex items-center gap-1">
                                    Quang Hưởng AI <Sparkles size={12} className="text-yellow-300" />
                                </h3>
                                <p className="text-red-100 text-[10px] font-medium opacity-90">Sẵn sàng hỗ trợ 24/7</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 scrollbar-thin scrollbar-thumb-gray-200">
                        <div className="text-center text-xs text-gray-400 my-2 font-medium">Hôm nay</div>

                        {messages.map(msg => (
                            <div key={msg.id} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.sender === 'ai' && (
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-1 border border-gray-200">
                                        <Bot size={14} className="text-[#D70018]" />
                                    </div>
                                )}

                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${msg.sender === 'user'
                                        ? 'bg-[#D70018] text-white rounded-br-none shadow-lg shadow-red-500/20'
                                        : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none shadow-md'
                                    }`}>
                                    <p className="leading-relaxed">{msg.text}</p>
                                    <div className={`text-[9px] mt-1.5 font-medium ${msg.sender === 'user' ? 'text-red-100 text-right' : 'text-gray-400 text-left'
                                        }`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>

                                {msg.sender === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-[#D70018] flex items-center justify-center flex-shrink-0 mt-1 shadow-lg shadow-red-500/20">
                                        <User size={14} className="text-white" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-2 justify-start">
                                <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                                    <Bot size={14} className="text-[#D70018]" />
                                </div>
                                <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none flex gap-1 items-center shadow-md">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 bg-white border-t border-gray-100">
                        <div className="flex gap-2 items-center bg-gray-50 p-1.5 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-[#D70018]/20 focus-within:border-[#D70018] transition-all">
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                placeholder="Nhập câu hỏi..."
                                className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 font-medium"
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="w-9 h-9 bg-[#D70018] rounded-lg flex items-center justify-center text-white hover:bg-[#b50014] disabled:opacity-50 disabled:hover:bg-[#D70018] transition-all shadow-sm active:scale-95"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                        <div className="text-center mt-2.5">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                                Powered by <span className="text-[#D70018]">Gemini AI</span>
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
