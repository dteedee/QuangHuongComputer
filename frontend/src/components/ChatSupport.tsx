import { useState, useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '../context/AuthContext';
import { Users, Send, Info, AlertCircle } from 'lucide-react';
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

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5000/hubs/chat', {
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto bg-slate-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col h-[700px]">
        {/* Header */}
        <div className="p-4 bg-white/5 border-b border-white/10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <Users className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-white font-bold">QUANG HƯỞNG Live Support</h3>
                <p className="text-xs text-gray-400">Hỗ trợ trực tuyến 24/7</p>
              </div>
            </div>
            <ConnectionStatus status={connectionStatus} onRetry={handleRetry} />
          </div>
        </div>

        {/* Messages Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-800/30">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-3">
              <Info size={48} className="opacity-20" />
              <p className="text-center">Bắt đầu cuộc trò chuyện với đội ngũ kỹ thuật của chúng tôi.</p>
              <p className="text-xs text-center text-gray-600">Chúng tôi luôn sẵn sàng hỗ trợ bạn!</p>
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
            <div className="flex items-center gap-2 justify-center text-yellow-500 text-xs bg-yellow-500/10 py-2 px-4 rounded-lg">
              <AlertCircle size={16} />
              <span>{messageQueue.length} tin nhắn đang chờ gửi</span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white/5 border-t border-white/10">
          {connectionStatus === 'failed' && (
            <div className="mb-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>Không có kết nối. Tin nhắn sẽ được gửi khi kết nối lại.</span>
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
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder={connectionStatus === 'connected' ? 'Nhập tin nhắn...' : 'Chờ kết nối...'}
              disabled={!connection}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || !connection}
              className="px-6 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
            >
              <Send size={18} /> Gửi
            </button>
          </div>

          <div className="mt-2 text-xs text-gray-500 text-center">
            Nhấn Enter để gửi, Shift+Enter để xuống dòng
          </div>
        </div>
      </div>
    </div>
  );
};
