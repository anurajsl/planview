import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import { useToastStore } from '../stores/toast.store';

/**
 * Lightweight WebSocket client using native WebSocket API.
 * No socket.io-client dependency needed — the server supports
 * raw WebSocket transport. For production, swap in socket.io-client.
 *
 * This hook:
 * 1. Connects to the WS server with JWT auth
 * 2. Joins a project room for presence
 * 3. Listens for data events and invalidates React Query cache
 * 4. Tracks online users for collaboration indicators
 */

interface OnlineUser {
  userId: string;
  name: string;
  initials: string;
  color: string;
  cursor?: { storyId: string | null };
}

// Simple EventSource-like wrapper for Socket.IO protocol
// In production, use: import { io } from 'socket.io-client';
class SimpleSocketClient {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<(data: any) => void>>();
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;
  private maxReconnects = 5;

  constructor(
    private url: string,
    private token: string,
  ) {}

  connect() {
    try {
      // Socket.IO uses Engine.IO under the hood, but for raw WS we connect directly
      const wsUrl = this.url.replace('http', 'ws') + '/ws/?token=' + encodeURIComponent(this.token);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit('_connected', {});
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event) {
            this.fire(msg.event, msg.data || msg);
          }
        } catch {
          // Non-JSON message, ignore
        }
      };

      this.ws.onclose = () => {
        this.fire('_disconnected', {});
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // Error will trigger onclose
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnects) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  on(event: string, handler: (data: any) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: (data: any) => void) {
    this.listeners.get(event)?.delete(handler);
  }

  private fire(event: string, data: any) {
    this.listeners.get(event)?.forEach((fn) => fn(data));
  }

  emit(event: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    this.maxReconnects = 0; // prevent reconnect
    this.ws?.close();
    this.ws = null;
    this.listeners.clear();
  }
}

export function useWebSocket(projectId: string | null) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const toast = useToastStore();
  const clientRef = useRef<SimpleSocketClient | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    const token = localStorage.getItem('planview_access_token');
    if (!token || !projectId || !user) return;

    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:4000';
    const client = new SimpleSocketClient(wsUrl, token);
    clientRef.current = client;

    // ─── Connection events ───
    client.on('_connected', () => {
      setIsConnected(true);
      // Join project room
      client.emit('project:join', {
        projectId,
        name: user.name,
        initials: user.initials,
        color: user.color,
      });
    });

    client.on('_disconnected', () => {
      setIsConnected(false);
    });

    // ─── Presence events ───
    client.on('presence:sync', (data: { members: OnlineUser[] }) => {
      setOnlineUsers(data.members.filter((m) => m.userId !== user.id));
    });

    client.on('user:joined', (data: { user: OnlineUser }) => {
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.userId === data.user.userId)) return prev;
        return [...prev, data.user];
      });
    });

    client.on('user:left', (data: { userId: string }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    });

    client.on('cursor:update', (data: { userId: string; storyId: string | null }) => {
      setOnlineUsers((prev) =>
        prev.map((u) =>
          u.userId === data.userId ? { ...u, cursor: { storyId: data.storyId } } : u,
        ),
      );
    });

    // ─── Data events → invalidate React Query cache ───
    client.on('story:created', (payload: any) => {
      if (payload.actorId !== user.id) {
        queryClient.invalidateQueries({ queryKey: ['timeline'] });
        queryClient.invalidateQueries({ queryKey: ['timeline-summary'] });
      }
    });

    client.on('story:updated', (payload: any) => {
      if (payload.actorId !== user.id) {
        queryClient.invalidateQueries({ queryKey: ['timeline'] });
      }
    });

    client.on('story:moved', (payload: any) => {
      if (payload.actorId !== user.id) {
        queryClient.invalidateQueries({ queryKey: ['timeline'] });
      }
    });

    client.on('story:deleted', (payload: any) => {
      if (payload.actorId !== user.id) {
        queryClient.invalidateQueries({ queryKey: ['timeline'] });
        queryClient.invalidateQueries({ queryKey: ['timeline-summary'] });
      }
    });

    client.connect();

    return () => {
      client.emit('project:leave', { projectId });
      client.disconnect();
      clientRef.current = null;
      setIsConnected(false);
      setOnlineUsers([]);
    };
  }, [projectId, user?.id]);

  // Broadcast cursor position when selecting a story
  const broadcastCursor = useCallback(
    (storyId: string | null) => {
      if (!projectId) return;
      clientRef.current?.emit('cursor:move', { projectId, storyId });
    },
    [projectId],
  );

  return { onlineUsers, isConnected, broadcastCursor };
}
