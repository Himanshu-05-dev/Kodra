import React from 'react';
import {
  Files,
  Sparkles,
  Terminal,
  Globe,
  Headphones,
  Settings,
  Code2
} from 'lucide-react';

export function ActivityBar({
  activeView,
  onToggleView,
  isVibeModeActive,
  onToggleVibeMode
}) {
  return (
    <aside className="w-12 h-full bg-[#090b10] border-r border-ide-border flex flex-col justify-between items-center py-2.5 select-none z-30 shrink-0">
      {/* Top Icons */}
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Brand Icon */}
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 p-[1px] mb-2 shadow-glow-sm">
          <div className="w-full h-full bg-ide-bg rounded-[7px] flex items-center justify-center text-white">
            <Code2 size={15} className="text-purple-400" />
          </div>
        </div>

        {/* Files Explorer Tab */}
        <button
          onClick={() => onToggleView('files')}
          className={`relative p-2 rounded-lg transition-all duration-200 group ${
            activeView === 'files'
              ? 'text-white bg-white/10 shadow-glow-sm'
              : 'text-ide-muted hover:text-white hover:bg-white/5'
          }`}
          title="File Explorer"
        >
          {activeView === 'files' && (
            <span className="absolute -left-2.5 top-2 bottom-2 w-1 bg-ide-accent rounded-r-full shadow-glow-purple" />
          )}
          <Files size={17} />
        </button>

        {/* AI Agent Tab */}
        <button
          onClick={() => onToggleView('agent')}
          className={`relative p-2 rounded-lg transition-all duration-200 group ${
            activeView === 'agent'
              ? 'text-purple-300 bg-purple-500/15 shadow-glow-purple'
              : 'text-ide-muted hover:text-purple-400 hover:bg-white/5'
          }`}
          title="Kodra AI Agent (Ctrl+I)"
        >
          {activeView === 'agent' && (
            <span className="absolute -left-2.5 top-2 bottom-2 w-1 bg-purple-400 rounded-r-full shadow-glow-purple" />
          )}
          <Sparkles size={17} />
        </button>

        {/* Terminal Tab */}
        <button
          onClick={() => onToggleView('terminal')}
          className={`relative p-2 rounded-lg transition-all duration-200 group ${
            activeView === 'terminal'
              ? 'text-cyan-300 bg-cyan-500/15 shadow-glow-cyan'
              : 'text-ide-muted hover:text-cyan-400 hover:bg-white/5'
          }`}
          title="Interactive Terminal"
        >
          {activeView === 'terminal' && (
            <span className="absolute -left-2.5 top-2 bottom-2 w-1 bg-ide-cyan rounded-r-full shadow-glow-cyan" />
          )}
          <Terminal size={17} />
        </button>

        {/* Live Preview Tab */}
        <button
          onClick={() => onToggleView('preview')}
          className={`relative p-2 rounded-lg transition-all duration-200 group ${
            activeView === 'preview'
              ? 'text-emerald-300 bg-emerald-500/15'
              : 'text-ide-muted hover:text-emerald-400 hover:bg-white/5'
          }`}
          title="Live Application Preview"
        >
          {activeView === 'preview' && (
            <span className="absolute -left-2.5 top-2 bottom-2 w-1 bg-ide-emerald rounded-r-full" />
          )}
          <Globe size={17} />
        </button>
      </div>

      {/* Bottom Icons: Vibe Mode & Settings */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        {/* Vibe Mode Lo-Fi Audio / Ambient Toggle */}
        <button
          onClick={onToggleVibeMode}
          className={`relative p-2 rounded-lg transition-all duration-200 group ${
            isVibeModeActive
              ? 'text-pink-400 bg-pink-500/15 shadow-sm shadow-pink-500/30'
              : 'text-ide-muted hover:text-pink-300 hover:bg-white/5'
          }`}
          title={isVibeModeActive ? "Vibe Mode: ON (Lo-Fi Chill)" : "Turn on Vibe Mode"}
        >
          <Headphones size={17} />
          {isVibeModeActive && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-pink-500 animate-ping" />
          )}
        </button>

        <button
          className="p-2 rounded-lg text-ide-muted hover:text-white hover:bg-white/5 transition-colors"
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </aside>
  );
}
