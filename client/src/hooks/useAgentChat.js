/**
 * @file useAgentChat.js
 * React hook managing AI Agent WebSocket streaming, message persistence,
 * real-time tool execution tracking, self-healing step progress, and runaway loop cancellation.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { WebSocketEvents } from '@kodra/shared';
import { api } from '../services/api.js';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:5000';

export function useAgentChat(projectId, onFileChanged) {
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeStep, setActiveStep] = useState(null); // { current, total, phase }
  const [isCancelling, setIsCancelling] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connecting' | 'connected' | 'disconnected' | 'error'
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const onFileChangedRef = useRef(onFileChanged);

  useEffect(() => {
    onFileChangedRef.current = onFileChanged;
  }, [onFileChanged]);

  // Load message history from DB when project changes
  useEffect(() => {
    if (!projectId) {
      setMessages([]);
      setActiveStep(null);
      return;
    }

    let isSubscribed = true;

    async function loadHistory() {
      try {
        const history = await api.getAgentMessages(projectId);
        if (isSubscribed && Array.isArray(history)) {
          const formatted = history.map((m) => ({
            ...m,
            role: m.role === 'model' ? 'assistant' : m.role,
            tools: m.toolCalls?.map((call, idx) => ({
              id: call.id || `hist-${idx}`,
              name: call.name,
              args: call.args,
              status: m.toolResults?.[idx]?.success ? 'success' : 'done',
              result: m.toolResults?.[idx]?.result,
              durationMs: m.toolResults?.[idx]?.durationMs
            })) || []
          }));
          setMessages(formatted);
        }
      } catch (err) {
        console.warn('Failed to load agent chat history:', err.message);
      }
    }

    loadHistory();

    return () => {
      isSubscribed = false;
    };
  }, [projectId]);

  // WebSocket Connection Lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    if (!projectId) return;

    setConnectionStatus('connecting');
    const wsUrl = `${WS_BASE_URL}/ws/agent?projectId=${projectId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) return;
      setConnectionStatus('connected');
      setError(null);

      // Heartbeat ping every 25 seconds
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: WebSocketEvents.PING }));
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      if (!isMountedRef.current) return;

      try {
        const frame = JSON.parse(event.data);

        switch (frame.type) {
          case WebSocketEvents.AGENT_THINKING:
            setIsThinking(true);
            setIsStreaming(false);
            break;

          case WebSocketEvents.AGENT_STEP:
            if (frame.step) {
              setActiveStep(frame.step);
            }
            break;

          case WebSocketEvents.AGENT_CHUNK:
            setIsThinking(false);
            setIsStreaming(true);
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant' && last.isStreaming) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: last.content + (frame.text || '') }
                ];
              }
              // First chunk of an assistant response
              return [
                ...prev,
                {
                  id: `stream-${Date.now()}`,
                  role: 'assistant',
                  content: frame.text || '',
                  isStreaming: true,
                  tools: [],
                  createdAt: new Date().toISOString()
                }
              ];
            });
            break;

          case WebSocketEvents.AGENT_TOOL_CALL: {
            setIsThinking(false);
            const call = frame.call;
            const newToolItem = {
              id: call.id || `tool-${Date.now()}`,
              name: call.name,
              args: call.args || {},
              status: 'running',
              startTime: Date.now()
            };

            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant') {
                const currentTools = last.tools || [];
                return [
                  ...prev.slice(0, -1),
                  { ...last, tools: [...currentTools, newToolItem] }
                ];
              }

              return [
                ...prev,
                {
                  id: `stream-${Date.now()}`,
                  role: 'assistant',
                  content: '',
                  isStreaming: true,
                  tools: [newToolItem],
                  createdAt: new Date().toISOString()
                }
              ];
            });
            break;
          }

          case WebSocketEvents.AGENT_TOOL_RESULT: {
            const { toolResult } = frame;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant' && last.tools) {
                const updatedTools = last.tools.map((t) => {
                  if (t.id === toolResult.id || (t.name === toolResult.name && t.status === 'running')) {
                    return {
                      ...t,
                      status: toolResult.success ? 'success' : 'error',
                      result: toolResult.result,
                      error: toolResult.error,
                      durationMs: toolResult.durationMs
                    };
                  }
                  return t;
                });

                return [
                  ...prev.slice(0, -1),
                  { ...last, tools: updatedTools }
                ];
              }
              return prev;
            });
            break;
          }

          case WebSocketEvents.FILE_CREATED:
          case WebSocketEvents.FILE_UPDATED:
          case WebSocketEvents.FILE_DELETED:
            if (onFileChangedRef.current) {
              onFileChangedRef.current(frame.path, frame.type);
            }
            break;

          case WebSocketEvents.AGENT_CANCELLED:
            setIsThinking(false);
            setIsStreaming(false);
            setIsCancelling(false);
            setActiveStep(null);
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant') {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    content: last.content
                      ? `${last.content}\n\n> ⏹ *Execution cancelled by user.*`
                      : '> ⏹ *Execution cancelled by user.*',
                    isStreaming: false
                  }
                ];
              }
              return prev;
            });
            break;

          case WebSocketEvents.AGENT_DONE:
            setIsThinking(false);
            setIsStreaming(false);
            setIsCancelling(false);
            setActiveStep(null);
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant') {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    id: frame.messageId || last.id,
                    content: frame.fullText || last.content,
                    isStreaming: false
                  }
                ];
              }
              return prev;
            });
            break;

          case WebSocketEvents.AGENT_ERROR:
            setIsThinking(false);
            setIsStreaming(false);
            setIsCancelling(false);
            setActiveStep(null);
            setError(frame.message || 'An error occurred during agent execution');
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant' && last.isStreaming) {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    content: last.content + `\n\n> ⚠️ *Error: ${frame.message || 'Stream interrupted'}*`,
                    isStreaming: false
                  }
                ];
              }
              return [
                ...prev,
                {
                  id: `err-${Date.now()}`,
                  role: 'assistant',
                  content: `> ⚠️ **Error:** ${frame.message || 'Failed to generate response'}`,
                  isStreaming: false,
                  tools: [],
                  createdAt: new Date().toISOString()
                }
              ];
            });
            break;

          case WebSocketEvents.PONG:
            // Heartbeat acknowledged
            break;

          default:
            break;
        }
      } catch (err) {
        console.error('Failed to parse agent WS frame:', err);
      }
    };

    ws.onclose = () => {
      if (!isMountedRef.current) return;
      setConnectionStatus('disconnected');
      clearInterval(pingIntervalRef.current);
    };

    ws.onerror = () => {
      if (!isMountedRef.current) return;
      setConnectionStatus('error');
      setError('Agent WebSocket connection error');
    };

    return () => {
      isMountedRef.current = false;
      clearInterval(pingIntervalRef.current);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [projectId]);

  // Send prompt to the AI agent
  const sendMessage = useCallback((promptText) => {
    if (!promptText || !promptText.trim()) return false;
    const trimmed = promptText.trim();

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsThinking(true);
    setError(null);
    setActiveStep(null);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: WebSocketEvents.AGENT_PROMPT,
        prompt: trimmed
      }));
      return true;
    } else {
      setIsThinking(false);
      setError('Cannot send message: AI agent is disconnected');
      return false;
    }
  }, []);

  // Cancel an active autonomous agent loop
  const cancelPrompt = useCallback(async () => {
    if (!projectId) return;
    setIsCancelling(true);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: WebSocketEvents.AGENT_CANCEL }));
    }

    try {
      await api.cancelAgentSession(projectId);
    } catch (err) {
      console.warn('Cancel session API error:', err.message);
    }
  }, [projectId]);

  // Quick autonomous repair trigger
  const triggerFixWithAI = useCallback(() => {
    return sendMessage('Fix with AI');
  }, [sendMessage]);

  // Clear chat conversation history
  const clearChat = useCallback(async () => {
    if (!projectId) return;
    try {
      await api.clearAgentMessages(projectId);
      setMessages([]);
      setActiveStep(null);
      setError(null);
    } catch (err) {
      setError(`Failed to clear chat: ${err.message}`);
    }
  }, [projectId]);

  return {
    messages,
    isThinking,
    isStreaming,
    activeStep,
    isCancelling,
    connectionStatus,
    error,
    sendMessage,
    cancelPrompt,
    triggerFixWithAI,
    clearChat
  };
}
