import { useEffect, useRef, useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const WS_URL = API_URL.startsWith('https')
  ? API_URL.replace('https', 'wss') + '/ws'
  : API_URL.replace('http', 'ws') + '/ws';

export function useWebSocket() {
  const ws = useRef(null);
  const [stallUpdates, setStallUpdates] = useState([]);
  const [matchMinute, setMatchMinute] = useState(0);
  const [isPeak, setIsPeak] = useState(false);
  const [wsStatus, setWsStatus] = useState('connecting'); // 'connecting' | 'connected' | 'reconnecting'
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    if (reconnectAttempts.current > 0) {
      setWsStatus('reconnecting');
    } else {
      setWsStatus('connecting');
    }

    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        setWsStatus('connected');
        reconnectAttempts.current = 0; // Reset attempts on success
        console.log('🔌 WebSocket connected');
        
        // Broadcast custom event to trigger silent data sync across the app
        window.dispatchEvent(new CustomEvent('ws_reconnected'));
      };

      ws.current.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'stall_update') {
            setStallUpdates(msg.data || []);
            setMatchMinute(msg.match_minute || 0);
            setIsPeak(msg.is_peak || false);
          } else if (msg.type === 'order_update') {
            window.dispatchEvent(new CustomEvent('ws_order_update', { detail: msg }));
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.current.onclose = () => {
        setWsStatus('reconnecting');
        // Exponential backoff: 2s, 4s, 8s, 16s... max 30s
        const delay = Math.min(Math.pow(2, reconnectAttempts.current) * 1000, 30000);
        reconnectTimer.current = setTimeout(() => {
          reconnectAttempts.current += 1;
          connect();
        }, delay);
      };

      ws.current.onerror = () => {
        ws.current?.close();
      };
    } catch (e) {
      console.error('WS connection error:', e);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  const connected = wsStatus === 'connected';

  return { stallUpdates, matchMinute, isPeak, connected, wsStatus };
}
