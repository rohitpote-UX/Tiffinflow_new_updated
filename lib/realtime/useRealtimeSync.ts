'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeEvent } from './realtime-service';

export type RealtimeStatus = 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';

export interface UseRealtimeSyncOptions {
  onEvent?: (event: RealtimeEvent) => void;
  onReconcile?: () => void | Promise<void>;
  enabled?: boolean;
}

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const { onEvent, onReconcile, enabled = true } = options;
  const [status, setStatus] = useState<RealtimeStatus>('DISCONNECTED');
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const onEventRef = useRef(onEvent);
  const onReconcileRef = useRef(onReconcile);

  useEffect(() => {
    onEventRef.current = onEvent;
    onReconcileRef.current = onReconcile;
  }, [onEvent, onReconcile]);

  const triggerReconcile = useCallback(() => {
    if (onReconcileRef.current) {
      try {
        onReconcileRef.current();
      } catch (err) {
        console.warn('Realtime state reconciliation error:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let isMounted = true;
    let reconnectAttempts = 0;

    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setStatus(reconnectAttempts === 0 ? 'DISCONNECTED' : 'RECONNECTING');

      try {
        const es = new EventSource('/api/realtime/stream');
        eventSourceRef.current = es;

        es.addEventListener('connected', () => {
          if (!isMounted) return;
          setStatus('CONNECTED');
          reconnectAttempts = 0;
          triggerReconcile();
        });

        es.addEventListener('message', (e) => {
          if (!isMounted) return;
          try {
            const event: RealtimeEvent = JSON.parse(e.data);
            setLastEvent(event);
            if (onEventRef.current) {
              onEventRef.current(event);
            }
          } catch (err) {
            console.warn('Failed to parse realtime SSE message:', err);
          }
        });

        es.onerror = () => {
          if (!isMounted) return;
          es.close();
          setStatus('RECONNECTING');

          // Exponential backoff reconnect
          const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000);
          reconnectAttempts++;
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted) connect();
          }, delay);
        };
      } catch {
        setStatus('DISCONNECTED');
      }
    };

    connect();

    // Reconcile state when tab becomes visible or network reconnects
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerReconcile();
      }
    };

    const handleOnline = () => {
      triggerReconcile();
      connect();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, triggerReconcile]);

  return {
    status,
    lastEvent,
    reconcile: triggerReconcile,
    isConnected: status === 'CONNECTED',
    isReconnecting: status === 'RECONNECTING',
  };
}
