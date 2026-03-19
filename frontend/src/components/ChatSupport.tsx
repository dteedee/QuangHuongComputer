
import { useState, useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '../context/AuthContext';
import { Users, Send, Info, AlertCircle, Phone, X, RefreshCw } from 'lucide-react';
import { MessageBubble, type MessageData } from './chat/MessageBubble';
import { TypingIndicator } from './chat/TypingIndicator';
import { ConnectionStatus, type ConnectionState } from './chat/ConnectionStatus';
import toast from 'react-hot-toast';

interface QueuedMessage {
  id: string;
  text: string;
  timestamp: Date;
}

export const ChatSupport = () => {
  const { isAuthenticated, user } = useAuth();
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [input, setInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('disconnected');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const [readReceipts, setReadReceipts] = useState<Map<string, boolean>>(new Map());

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  // Setup SignalR connection
  useEffect(() => {
    if (!isAuthenticated) return;

    const signalRUrl = import.meta.env.VITE_SIGNALR_HUB_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/hubs/chat`;
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(signalRUrl, {
        accessTokenFactory: () => localStorage.getItem('token') || ''
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount >= maxReconnectAttempts) {
            return null; // Stop reconnecting
          }
          // Exponential backoff: 2s, 4s, 8s, 16s, 32s
          return Math.min(2000 * Math.pow(2, retryContext.previousRetryCount), 32000);
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Connection event handlers
    newConnection.onreconnecting(() => {
      setConnectionStatus('reconnecting');
      reconnectAttemptsRef.current += 1;
      toast.loading('Đang kết nối lại...', { id: 'reconnecting' });
    });

    newConnection.onreconnected(() => {
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
      toast.success('Đã kết nối lại', { id: 'reconnecting' });

      // Send queued messages
      if (messageQueue.length > 0) {
        messageQueue.forEach(async (queuedMsg) => {
          try {
            await newConnection.invoke('SendMessage', user?.fullName || 'Guest', queuedMsg.text);
            setMessageQueue(prev => prev.filter(m => m.id !== queuedMsg.id));
          } catch (error) {
            console.error('Failed to send queued message:', error);
          }
        });
      }
    });

    newConnection.onclose(() => {
      setConnectionStatus('failed');
      toast.error('Mất kết nối với máy chủ', { id: 'reconnecting' });
    });

    setConnection(newConnection);

    return () => {
      newConnection.stop();
    };
  }, [isAuthenticated]);

  // Start connection and setup message handlers
  useEffect(() => {
    if (!connection) return;

    const startConnection = async () => {
      try {
        setConnectionStatus('reconnecting');
        await connection.start();
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Setup message handlers
        connection.on('ReceiveMessage', (userName: string, text: string, messageId?: string, timestamp?: string) => {
          const newMessage: MessageData = {
            id: messageId || Date.now().toString(),
            sender: userName,
            text,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            isOwn: userName === user?.fullName,
            isSystem: false
          };
          setMessages(prev => [...prev, newMessage]);

          // Send read receipt if not own message
          if (userName !== user?.fullName && messageId) {
            connection.invoke('MarkAsRead', messageId).catch(console.error);
          }
        });

        connection.on('Notify', (msg: string) => {
          const systemMessage: MessageData = {
            id: Date.now().toString(),
            sender: 'System',
            text: msg,
            timestamp: new Date(),
            isSystem: true
          };
          setMessages(prev => [...prev, systemMessage]);
        });

        connection.on('UserTyping', (userName: string) => {
          if (userName !== user?.fullName) {
            setTypingUsers(prev => new Set(prev).add(userName));

            // Clear typing after 3 seconds
            setTimeout(() => {
              setTypingUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(userName);
                return newSet;
              });
            }, 3000);
          }
        });

        connection.on('MessageRead', (messageId: string) => {
          setReadReceipts(prev => new Map(prev).set(messageId, true));
        });

      } catch (error) {
        console.error('Connection failed:', error);
        setConnectionStatus('failed');
        toast.error('Không thể kết nối đến máy chủ');
      }
    };

    startConnection();
  }, [connection, user?.fullName]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!connection || connectionStatus !== 'connected') return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    connection.invoke('UserTyping', user?.fullName || 'Guest').catch(console.error);

    typingTimeoutRef.current = setTimeout(() => {
      // Stop typing after 3 seconds of inactivity
    }, 3000);
  }, [connection, connectionStatus, user?.fullName]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const messageText = input.trim();
    const messageId = `${Date.now()}-${Math.random()}`;

    setInput('');

    // Add optimistic message
    const optimisticMessage: MessageData = {
      id: messageId,
      sender: user?.fullName || 'Guest',
      text: messageText,
      timestamp: new Date(),
      isOwn: true,
      isRead: false
    };
    setMessages(prev => [...prev, optimisticMessage]);

    if (connection && connectionStatus === 'connected') {
      try {
        await connection.invoke('SendMessage', user?.fullName || 'Guest', messageText, messageId);
      } catch (error) {
        console.error('Failed to send message:', error);
        toast.error('Không thể gửi tin nhắn');

        // Add to queue
        const queuedMessage: QueuedMessage = {
          id: messageId,
          text: messageText,
          timestamp: new Date()
        };
        setMessageQueue(prev => [...prev, queuedMessage]);

        // Remove optimistic message
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } else {
      // Connection is not active, add to queue
      const queuedMessage: QueuedMessage = {
        id: messageId,
        text: messageText,
        timestamp: new Date()
      };
      setMessageQueue(prev => [...prev, queuedMessage]);
      toast('Tin nhắn sẽ được gửi khi kết nối lại', { icon: '📤' });
    }
  };

  // Handle retry connection
  const handleRetry = useCallback(() => {
    if (connection) {
      reconnectAttemptsRef.current = 0;
      connection.start()
        .then(() => {
          setConnectionStatus('connected');
          toast.success('Kết nối thành công');
        })
        .catch(() => {
          setConnectionStatus('failed');
          toast.error('Kết nối thất bại');
        });
    }
  }, [connection]);

  if (!isAuthenticated) return null;

  return (
    <div className="container mx-auto px-4 py-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xl flex flex-col h-[700px]">
        {/* Header */}
        <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D70018] rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
              <Users className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-gray-900 font-black uppercase text-sm tracking-wide">QUANG HƯỞNG Live Support</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <p className="text-xs text-gray-500 font-medium">Hỗ trợ trực tuyến 24/7</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionStatus status={connectionStatus} onRetry={handleRetry} />
            {connectionStatus === 'failed' && (
              <button onClick={handleRetry} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 transition">
                <RefreshCw size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-[#D70018]">
                <Info size={40} />
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900 mb-1">Bắt đầu cuộc trò chuyện</p>
                <p className="text-xs text-gray-500 max-w-xs">Đội ngũ kỹ thuật viên của Quang Hưởng Computer luôn sẵn sàng hỗ trợ bạn.</p>
              </div>
              <button
                onClick={() => handleSendMessage()} // Mock action
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase text-gray-600 shadow-sm hover:border-[#D70018] hover:text-[#D70018] transition-all"
              >
                <Phone size={14} /> Hotline: 1900.6321
              </button>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={{
                ...message,
                isRead: readReceipts.get(message.id) || false
              }}
              showAvatar={true}
              showTimestamp={true}
              showReadStatus={true}
            />
          ))}

          {/* Typing Indicators */}
          {Array.from(typingUsers).map((userName) => (
            <TypingIndicator key={userName} userName={userName} />
          ))}

          {/* Queued Messages Warning */}
          {messageQueue.length > 0 && (
            <div className="flex items-center gap-2 justify-center text-amber-600 text-xs bg-amber-50 py-2 px-4 rounded-lg font-medium border border-amber-100">
              <AlertCircle size={16} />
              <span>{messageQueue.length} tin nhắn đang chờ gửi...</span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
          {connectionStatus === 'failed' && (
            <div className="mb-3 bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-2 text-red-600 text-xs font-medium">
              <AlertCircle size={16} />
              <span>Mất kết nối. Tin nhắn sẽ được gửi tự động khi có mạng.</span>
            </div>
          )}

          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D70018]/20 focus:border-[#D70018] transition-all font-medium text-sm"
              placeholder={connectionStatus === 'connected' ? 'Nhập tin nhắn hỗ trợ...' : 'Đang kết nối lại...'}
              disabled={!connection}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || !connection}
              className="px-6 bg-[#D70018] hover:bg-[#b50014] text-white rounded-xl transition-all flex items-center gap-2 font-bold text-sm shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
            >
              <Send size={18} /> Gửi
            </button>
          </div>

          <div className="mt-2 text-[10px] text-gray-400 text-center font-medium">
            Nhấn Enter để gửi, Shift+Enter để xuống dòng
          </div>
        </div>
      </div>
    </div>
  );
};
