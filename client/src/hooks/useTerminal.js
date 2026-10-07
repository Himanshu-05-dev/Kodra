import { useState, useRef, useEffect, useCallback } from 'react';
import { WebSocketEvents } from '@kodra/shared';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:5000';

export function useTerminal(projectId) {
  const [status, setStatus] = useState('disconnected'); // 'connecting' | 'connected' | 'disconnected' | 'error'
  const [errorMessage, setErrorMessage] = useState(null);
  const wsRef = useRef(null);
  const outputListenersRef = useRef(new Set());
  const pingIntervalRef = useRef(null);

  // Send input to backend PTY
  const sendInput = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: WebSocketEvents.TERMINAL_INPUT,
        data
      }));
    }
  }, []);

  // Send resize event to backend PTY
  const sendResize = useCallback((cols, rows) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: WebSocketEvents.TERMINAL_RESIZE,
        cols,
        rows
      }));
    }
  }, []);

  // Subscribe a listener to raw terminal output
  const onData = useCallback((listener) => {
    outputListenersRef.current.add(listener);
    return () => outputListenersRef.current.delete(listener);
  }, []);

  // Connect / Reconnect WebSocket
  const connect = useCallback(() => {
    if (!projectId) return;

    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
    }

    setStatus('connecting');
    setErrorMessage(null);

    const wsUrl = `${WS_BASE_URL}/ws/terminal?projectId=${encodeURIComponent(projectId)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      // Keepalive ping
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: WebSocketEvents.PING }));
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data);
        if (frame.type === WebSocketEvents.TERMINAL_OUTPUT && frame.data) {
          outputListenersRef.current.forEach((listener) => {
            try { listener(frame.data); } catch {}
          });
        } else if (frame.type === WebSocketEvents.ERROR) {
          setErrorMessage(frame.message);
        }
      } catch (err) {
        // Raw text fallback
        outputListenersRef.current.forEach((listener) => {
          try { listener(event.data); } catch {}
        });
      }
    };

    ws.onerror = () => {
      setStatus('error');
      setErrorMessage('Terminal WebSocket connection error');
    };

    ws.onclose = (event) => {
      setStatus('disconnected');
      clearInterval(pingIntervalRef.current);
      if (event.code !== 1000 && !event.wasClean) {
        setErrorMessage(`Disconnected from terminal (code ${event.code})`);
      }
    };
  }, [projectId]);

  // Connect when projectId changes
  useEffect(() => {
    connect();

    return () => {
      clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
      }
    };
  }, [connect]);

  return {
    status,
    errorMessage,
    sendInput,
    sendResize,
    onData,
    reconnect: connect
  };
}
