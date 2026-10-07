import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Globe,
  Sparkles,
  Send,
  ExternalLink,
  RefreshCw,
  X,
  Laptop,
  Smartphone,
  Tablet,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Terminal,
  Zap,
  Square,
  Wrench
} from 'lucide-react';
import { marked } from 'marked';
import { useAgentChat } from '../../hooks/useAgentChat.js';
import { ToolExecutionCard } from './ToolExecutionCard.jsx';

// Configure marked for clean, break-enabled markdown
marked.setOptions({
  breaks: true,
  gfm: true
});

export function ChatPanel({ projectId, onClose, onFileChanged }) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'preview'
  const [inputMessage, setInputMessage] = useState('');
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const {
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
  } = useAgentChat(projectId, onFileChanged);

  // Auto-scroll to bottom on incoming messages or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Handle prompt submission
  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isThinking) return;

    const sent = sendMessage(inputMessage);
    if (sent) {
      setInputMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // Keyboard shortcut: Enter to submit, Shift+Enter for newline
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Copy message text to clipboard
  const handleCopyText = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const suggestionPrompts = [
    "⚡ Fix with AI (Autonomous test & build self-repair)",
    "✨ Explain the project architecture and main entry points",
    "🎨 Add glowing dark-mode button hover styles in CSS",
    "🛠️ Create a modern Navbar component with responsive layout"
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0c13] border-l border-ide-border text-xs select-none">
      {/* 1. Header Navigation Bar */}
      <div className="flex items-center justify-between px-2.5 h-8 border-b border-ide-border bg-[#0d0f17]">
        <div className="flex items-center gap-2 h-full">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 h-full px-2 font-medium transition-all ${
              activeTab === 'chat'
                ? 'border-b-2 border-purple-400 text-purple-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles size={13} className={isStreaming ? 'text-purple-400 animate-spin' : 'text-purple-400'} />
            AI Copilot
            {isStreaming && (
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 h-full px-2 font-medium transition-all ${
              activeTab === 'preview'
                ? 'border-b-2 border-emerald-400 text-emerald-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe size={13} className="text-emerald-400" />
            Live Preview
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Connection status indicator */}
          <div
            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono"
            title={`Agent WebSocket: ${connectionStatus}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 shadow-glow-emerald'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-red-400'
              }`}
            />
            <span className="text-slate-400 text-[10px] uppercase hidden sm:inline">
              {connectionStatus === 'connected' ? 'LIVE' : connectionStatus}
            </span>
          </div>

          {/* Clear history */}
          {activeTab === 'chat' && messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors"
              title="Clear chat history"
            >
              <Trash2 size={12} />
            </button>
          )}

          {/* Close panel */}
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            title="Close panel"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* 2. Main Content Body */}
      {activeTab === 'chat' ? (
        <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#090a10]">
          {/* Conversation Feed */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3.5 pr-2 select-text">
            {/* Empty state & Welcome greeting */}
            {messages.length === 0 && (
              <div className="p-3.5 rounded-xl bg-gradient-to-b from-purple-500/10 via-[#0d0f18] to-transparent border border-purple-500/20 text-slate-200 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 shadow-glow-purple">
                      <Bot size={13} />
                    </div>
                    <span className="font-semibold text-xs text-white">Kodra AI Agent</span>
                  </div>
                  <span className="text-[9px] font-mono text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1">
                    <Zap size={10} className="text-purple-400" />
                    STREAMING
                  </span>
                </div>

                <p className="text-slate-400 text-[11.5px] leading-relaxed mb-3">
                  Autonomous AI assistant attached to your cloud workspace. Ask me to write code, review architecture, generate tests, or execute terminal commands.
                </p>

                {/* Quick suggestions */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold font-mono">
                    Suggested Prompts:
                  </div>
                  {suggestionPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const cleanPrompt = prompt.replace(/^[^\w]+/, '');
                        sendMessage(cleanPrompt);
                      }}
                      className="w-full text-left p-1.5 rounded-md bg-white/[0.03] hover:bg-purple-500/15 border border-white/[0.06] hover:border-purple-500/30 text-slate-300 hover:text-white text-[11px] transition-all flex items-center gap-2 group"
                    >
                      <span className="group-hover:translate-x-0.5 transition-transform">{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rendered Messages */}
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id || index}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div className="flex items-center gap-1.5 px-1 text-[10px] text-slate-500 font-mono">
                    {isUser ? (
                      <span>You</span>
                    ) : (
                      <span className="text-purple-400 font-semibold flex items-center gap-1">
                        <Bot size={11} /> Kodra Agent
                      </span>
                    )}
                    {msg.createdAt && (
                      <span className="text-slate-600">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div
                    className={`relative group max-w-[95%] rounded-xl p-3 border transition-all ${
                      isUser
                        ? 'bg-[#151928] text-white border-purple-500/30 shadow-glow-sm'
                        : 'bg-[#0e111a] text-slate-200 border-white/[0.08]'
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap text-[11.5px] leading-relaxed">
                        {msg.content}
                      </div>
                    ) : (
                      <>
                        {/* Tool Executions Stream */}
                        {msg.tools && msg.tools.length > 0 && (
                          <div className="space-y-1 mb-2">
                            {msg.tools.map((tool) => (
                              <ToolExecutionCard key={tool.id} tool={tool} />
                            ))}
                          </div>
                        )}

                        {msg.content && (
                          <div
                            className="markdown-content"
                            dangerouslySetInnerHTML={{
                              __html: marked.parse(msg.content || '')
                            }}
                          />
                        )}
                        {msg.isStreaming && <span className="streaming-cursor" />}
                      </>
                    )}

                    {/* Copy action on hover */}
                    <button
                      onClick={() => handleCopyText(msg.id || index, msg.content)}
                      className="absolute top-2 right-2 p-1 rounded bg-[#181c2b] border border-white/10 opacity-0 group-hover:opacity-100 hover:text-white text-slate-400 transition-opacity"
                      title="Copy content"
                    >
                      {copiedId === (msg.id || index) ? (
                        <Check size={11} className="text-emerald-400" />
                      ) : (
                        <Copy size={11} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Thinking / Analyzing indicator */}
            {isThinking && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 animate-pulse">
                <Loader2 size={13} className="animate-spin text-purple-400" />
                <span className="text-[11px] font-mono">Thinking & generating response...</span>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-[11px]">
                <AlertCircle size={13} className="text-red-400 shrink-0" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Step Progress Banner for Autonomous Loops */}
            {activeStep && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-[11px] animate-in fade-in">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping shrink-0" />
                <span className="font-mono font-semibold text-purple-300">
                  Step {activeStep.current}/{activeStep.total}:
                </span>
                <span className="text-slate-300 truncate">{activeStep.phase}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 3. Input Controls Bar */}
          <div className="p-2.5 border-t border-ide-border/60 bg-[#0c0e16]">
            <form onSubmit={handleSubmit} className="relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Kodra to inspect code, write features, or debug..."
                rows={2}
                disabled={!projectId}
                className="w-full bg-[#121520] text-white text-xs p-2.5 rounded-lg border border-white/10 focus:border-purple-500/70 focus:outline-none resize-none pr-14 font-sans placeholder:text-slate-500 disabled:opacity-50"
              />

              {/* Action Button: Send OR Stop/Interrupt */}
              {(isThinking || isStreaming) ? (
                <button
                  type="button"
                  onClick={cancelPrompt}
                  disabled={isCancelling}
                  className="absolute right-2 bottom-3 px-2 py-1 rounded-md bg-red-950/90 border border-red-500/40 hover:bg-red-900/90 text-red-300 transition-all flex items-center gap-1.5 font-mono text-[10.5px] shadow-glow-sm cursor-pointer"
                  title="Interrupt autonomous loop"
                >
                  <Square size={10} fill="currentColor" className="text-red-400" />
                  <span>{isCancelling ? 'Stopping...' : 'Stop'}</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || !projectId}
                  className="absolute right-2 bottom-3 p-1.5 rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-20 disabled:hover:bg-purple-600 text-white transition-all shadow-glow-sm cursor-pointer"
                  title="Send message (Enter)"
                >
                  <Send size={12} />
                </button>
              )}
            </form>

            <div className="flex items-center justify-between px-1 pt-1 text-[10px] text-slate-500">
              <span className="font-mono">Enter ↵ to send • Shift+Enter newline</span>
              <span className="flex items-center gap-1 font-mono text-purple-400">
                <Zap size={10} /> Full Context Active
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* 4. Live Preview Viewport Tab */
        <div className="flex-1 flex flex-col h-full bg-[#08090d]">
          {/* Device switcher toolbar */}
          <div className="flex items-center justify-between p-2 bg-[#0d0f17] border-b border-ide-border text-[11px]">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1 rounded ${previewDevice === 'desktop' ? 'text-emerald-400 bg-white/10' : 'text-slate-500 hover:text-white'}`}
                title="Desktop View (100%)"
              >
                <Laptop size={13} />
              </button>
              <button
                onClick={() => setPreviewDevice('tablet')}
                className={`p-1 rounded ${previewDevice === 'tablet' ? 'text-emerald-400 bg-white/10' : 'text-slate-500 hover:text-white'}`}
                title="Tablet View (768px)"
              >
                <Tablet size={13} />
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1 rounded ${previewDevice === 'mobile' ? 'text-emerald-400 bg-white/10' : 'text-slate-500 hover:text-white'}`}
                title="Mobile View (375px)"
              >
                <Smartphone size={13} />
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-1 max-w-[200px] mx-2">
              <input
                type="text"
                readOnly
                value="http://preview.localhost:5000"
                className="w-full bg-[#121520] px-2 py-0.5 rounded border border-white/10 text-slate-400 font-mono text-[10px] truncate"
              />
            </div>

            <div className="flex items-center gap-1 text-slate-500">
              <button className="p-1 hover:text-white rounded" title="Reload Preview">
                <RefreshCw size={11} />
              </button>
              <button className="p-1 hover:text-white rounded" title="Open in new window">
                <ExternalLink size={11} />
              </button>
            </div>
          </div>

          {/* Viewport canvas */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
            <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-emerald-400/60 mb-3">
              <Globe size={24} />
            </div>
            <p className="text-xs font-semibold text-white mb-1">Live Application Gateway</p>
            <p className="text-[11px] max-w-xs text-slate-400 leading-relaxed">
              When dev servers run inside the sandbox container, your interactive Vite/React application will render live in this viewport.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
