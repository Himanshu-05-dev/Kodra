import React, { useState } from 'react';
import {
  Terminal as TerminalIcon,
  Maximize2,
  Minimize2,
  RotateCcw,
  Cpu,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { XTerminal } from './XTerminal.jsx';
import { useTerminal } from '../../hooks/useTerminal.js';

export function TerminalPanel({
  projectId,
  isExpanded,
  onToggleExpand
}) {
  const [activeTab, setActiveTab] = useState('terminal');
  const { status, errorMessage, sendInput, sendResize, onData, reconnect } = useTerminal(projectId);

  return (
    <div className="flex flex-col h-full bg-[#07080d] border-t border-ide-border text-xs select-none">
      {/* Terminal Tab Bar */}
      <div className="flex items-center justify-between px-3 h-8 border-b border-ide-border bg-[#0b0d15] shrink-0">
        <div className="flex items-center gap-1 h-full">
          {/* Main Terminal Tab */}
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-2 h-full px-2.5 font-mono text-[11px] font-medium border-b-2 transition-all ${
              activeTab === 'terminal'
                ? 'border-cyan-400 text-cyan-300 bg-white/[0.02]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TerminalIcon size={12} className="text-cyan-400" />
            <span>terminal</span>

            {/* Connection status dot */}
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === 'connected'
                  ? 'bg-cyan-400 glow-dot-cyan'
                  : status === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-red-400'
              }`}
              title={`Status: ${status}`}
            />
          </button>

          {/* Sandbox Logs Tab */}
          <button
            onClick={() => setActiveTab('output')}
            className={`flex items-center gap-1.5 h-full px-2.5 font-mono text-[11px] font-medium border-b-2 transition-all ${
              activeTab === 'output'
                ? 'border-purple-400 text-purple-300 bg-white/[0.02]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu size={12} className="text-purple-400" />
            <span>logs</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 text-slate-400">
          {errorMessage && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] text-red-400 font-mono">
              <AlertCircle size={11} />
              {errorMessage}
            </span>
          )}

          <button
            onClick={reconnect}
            className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Restart terminal session"
          >
            <RotateCcw size={12} />
          </button>

          <button
            onClick={onToggleExpand}
            className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
            title={isExpanded ? 'Restore Terminal' : 'Maximize Terminal'}
          >
            {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Terminal Viewport / Content */}
      <div className="flex-1 w-full h-[calc(100%-32px)] overflow-hidden bg-[#07080d]">
        {activeTab === 'terminal' ? (
          projectId ? (
            <XTerminal
              onInput={sendInput}
              onResize={sendResize}
              subscribeOutput={onData}
              status={status}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 font-mono text-[11px]">
              No active project selected. Select a project to spawn a terminal.
            </div>
          )
        ) : (
          <div className="p-3 font-mono text-[11px] text-slate-400 space-y-1 overflow-auto h-full bg-[#06070a]">
            <div className="text-purple-400">[kodra-core] PTY engine active on host workspace</div>
            <div className="text-slate-500">[kodra-core] Terminal WebSocket attached to /ws/terminal</div>
            <div className="text-slate-500">[kodra-core] Status: {status}</div>
          </div>
        )}
      </div>
    </div>
  );
}
