import { useState, useEffect, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '../context/AuthContext';
import { NotificationDto } from '../api/notification';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

interface UseRealtimeNotificationsOptions {
    onNotification?: (notification: NotificationDto) => void;
    onNotificationRead?: (notificationId: string) => void;
    onAllNotificationsRead?: () => void;
}

interface UseRealtimeNotificationsReturn {
    connectionStatus: ConnectionState;
    isConnected: boolean;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    reconnect: () => void;
}

export const useRealtimeNotifications = (
    options: UseRealtimeNotificationsOptions = {}
): UseRealtimeNotificationsReturn => {
    const { isAuthenticated } = useAuth();
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('disconnected');

    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;
    const optionsRef = useRef(options);
    optionsRef.current = options;

    // Setup SignalR connection
    useEffect(() => {
        if (!isAuthenticated) {
            setConnectionStatus('disconnected');
            return;
        }

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const signalRUrl = `${apiUrl}/hubs/notification`;

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
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        // Connection event handlers
        newConnection.onreconnecting(() => {
            setConnectionStatus('reconnecting');
            reconnectAttemptsRef.current += 1;
        });

        newConnection.onreconnected(() => {
            setConnectionStatus('connected');
            reconnectAttemptsRef.current = 0;
        });

        newConnection.onclose(() => {
            setConnectionStatus('disconnected');
        });

        setConnection(newConnection);

        return () => {
            newConnection.stop();
        };
    }, [isAuthenticated]);

    // Start connection and setup handlers
    useEffect(() => {
        if (!connection) return;

        const startConnection = async () => {
            try {
                setConnectionStatus('connecting');
                await connection.start();
                setConnectionStatus('connected');
                reconnectAttemptsRef.current = 0;

                // Setup notification handlers
                connection.on('ReceiveNotification', (notification: NotificationDto) => {
                    optionsRef.current.onNotification?.(notification);
                });

                connection.on('NotificationRead', (notificationId: string) => {
                    optionsRef.current.onNotificationRead?.(notificationId);
                });

                connection.on('AllNotificationsRead', () => {
                    optionsRef.current.onAllNotificationsRead?.();
                });

            } catch (error) {
                console.error('Notification connection failed:', error);
                setConnectionStatus('failed');
            }
        };

        startConnection();
    }, [connection]);

    // Mark notification as read via SignalR
    const markAsRead = useCallback(async (notificationId: string) => {
        if (connection && connectionStatus === 'connected') {
            try {
                await connection.invoke('MarkAsRead', notificationId);
            } catch (error) {
                console.error('Failed to mark notification as read:', error);
            }
        }
    }, [connection, connectionStatus]);

    // Mark all notifications as read via SignalR
    const markAllAsRead = useCallback(async () => {
        if (connection && connectionStatus === 'connected') {
            try {
                await connection.invoke('MarkAllAsRead');
            } catch (error) {
                console.error('Failed to mark all notifications as read:', error);
            }
        }
    }, [connection, connectionStatus]);

    // Manual reconnect
    const reconnect = useCallback(() => {
        if (connection) {
            reconnectAttemptsRef.current = 0;
            setConnectionStatus('connecting');
            connection.start()
                .then(() => {
                    setConnectionStatus('connected');
                })
                .catch(() => {
                    setConnectionStatus('failed');
                });
        }
    }, [connection]);

    return {
        connectionStatus,
        isConnected: connectionStatus === 'connected',
        markAsRead,
        markAllAsRead,
        reconnect
    };
};

export default useRealtimeNotifications;
