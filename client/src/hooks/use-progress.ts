import { useState, useEffect, useRef, useCallback } from 'react';

export interface ProgressState {
  phase: string;
  total: number;
  processed: number;
  percent: number;
  message: string;
  isActive: boolean;
}

export interface UseProgressReturn {
  progress: ProgressState;
  isConnected: boolean;
}

const initialState: ProgressState = {
  phase: '',
  total: 0,
  processed: 0,
  percent: 0,
  message: '',
  isActive: false,
};

export function useProgress(): UseProgressReturn {
  const [progress, setProgress] = useState<ProgressState>(initialState);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setProgress({
            phase: data.phase || '',
            total: data.total || 0,
            processed: data.processed || 0,
            percent: data.percent || 0,
            message: data.message || '',
            isActive: data.percent < 100,
          });

          if (data.percent >= 100) {
            setTimeout(() => {
              setProgress(prev => ({ ...prev, isActive: false }));
            }, 500);
          }
        } catch (e) {
          console.error('Failed to parse progress message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
      reconnectTimeoutRef.current = setTimeout(connect, 2000);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { progress, isConnected };
}
