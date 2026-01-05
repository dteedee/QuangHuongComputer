import { useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '../context/AuthContext';
import { Users, Send, Info } from 'lucide-react';

export const ChatSupport = () => {
    const { isAuthenticated, user } = useAuth();
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
    const [messages, setMessages] = useState<{ user: string, text: string }[]>([]);
    const [input, setInput] = useState('');
    const [status, setStatus] = useState('Disconnected');

    useEffect(() => {
        if (!isAuthenticated) return;

        const newConnection = new signalR.HubConnectionBuilder()
            .withUrl("http://localhost:5000/hubs/chat", {
                accessTokenFactory: () => localStorage.getItem('token') || ""
            })
            .withAutomaticReconnect()
            .build();

        setConnection(newConnection);
    }, [isAuthenticated]);

    useEffect(() => {
        if (connection) {
            connection.start()
                .then(() => {
                    setStatus('Connected');
                    connection.on("ReceiveMessage", (userName: string, text: string) => {
                        setMessages(prev => [...prev, { user: userName, text }]);
                    });
                    connection.on("Notify", (msg: string) => {
                        setMessages(prev => [...prev, { user: 'System', text: msg }]);
                    });
                })
                .catch((e: Error) => {
                    console.log('Connection failed: ', e);
                    setStatus('Failed');
                });
        }
    }, [connection]);

    const handleSendMessage = async () => {
        if (connection && input) {
            await connection.invoke("SendMessage", user?.fullName || "Guest", input);
            setInput('');
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto bg-slate-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col h-[600px]">
                <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Users className="text-blue-400" />
                        <div>
                            <h3 className="text-white font-bold">Quang Hường Live Support</h3>
                            <p className="text-xs text-gray-500">Status: <span className={status === 'Connected' ? 'text-green-500' : 'text-red-500'}>{status}</span></p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex flex-col ${m.user === user?.fullName ? 'items-end' : 'items-start'}`}>
                            <span className="text-[10px] text-gray-500 mb-1">{m.user}</span>
                            <div className={`px-4 py-2 rounded-xl text-sm ${m.user === user?.fullName
                                    ? 'bg-blue-600 text-white'
                                    : m.user === 'System' ? 'bg-gray-800 text-gray-400 italic' : 'bg-white/10 text-gray-200'
                                }`}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-3">
                            <Info size={40} className="opacity-20" />
                            <p>Bắt đầu cuộc trò chuyện với đội ngũ kỹ thuật.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white/5 border-t border-white/10">
                    <div className="flex gap-3">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nhập tin nhắn..."
                        />
                        <button
                            onClick={handleSendMessage}
                            className="px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition flex items-center gap-2 font-semibold"
                        >
                            <Send size={18} /> Gửi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
