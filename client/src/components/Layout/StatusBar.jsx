import React from 'react';
import { GitBranch, Wifi, Check, Zap, Music2, Globe } from 'lucide-react';

export function StatusBar({
  projectName,
  activeLanguage = 'JavaScript',
  isVibeModeActive,
  backendConnected,
  onTogglePreview,
  gitBranch = 'main',
  onToggleGit
}) {
  return (
    <footer className="h-6 bg-[#07080c] border-t border-ide-border px-3 flex items-center justify-between text-[11px] text-ide-muted select-none font-mono shrink-0 z-30">
      {/* Left items */}
      <div className="flex items-center gap-3">
        {/* Git branch */}
        <div
          onClick={onToggleGit}
          className="flex items-center gap-1.5 text-ide-text hover:text-white cursor-pointer transition-colors"
          title="Toggle Git Source Control"
        >
          <GitBranch size={12} className="text-purple-400" />
          <span>{gitBranch}</span>
        </div>

        {/* Project indicator */}
        {projectName && (
          <div className="hidden sm:flex items-center gap-1.5 text-ide-muted border-l border-ide-border/60 pl-3">
            <span>proj:</span>
            <span className="text-white font-medium">{projectName}</span>
          </div>
        )}

        {/* Live Preview Toggle Pill */}
        {onTogglePreview && (
          <button
            onClick={onTogglePreview}
            className="hidden md:flex items-center gap-1.5 text-emerald-400/90 hover:text-emerald-300 border-l border-ide-border/60 pl-3 cursor-pointer transition-colors"
            title="Open Live Application Preview"
          >
            <Globe size={11} className="text-emerald-400" />
            <span>Preview: Ready</span>
          </button>
        )}

        {/* Vibe Mode Status Bar */}
        {isVibeModeActive ? (
          <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300">
            {/* Equalizer animation */}
            <div className="flex items-end gap-[2px] h-3">
              <span className="w-[2px] bg-pink-400 rounded-full animate-equalizer-1" />
              <span className="w-[2px] bg-pink-400 rounded-full animate-equalizer-2" />
              <span className="w-[2px] bg-pink-400 rounded-full animate-equalizer-3" />
              <span className="w-[2px] bg-pink-400 rounded-full animate-equalizer-4" />
            </div>
            <span className="text-[10px] tracking-wide font-sans">VIBE MODE: LO-FI CHILL</span>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1 text-[10px] text-ide-muted/70">
            <Zap size={11} className="text-amber-400/80" />
            <span>Vibe: Ready</span>
          </div>
        )}
      </div>

      {/* Right items */}
      <div className="flex items-center gap-3.5">
        <span className="hidden sm:inline hover:text-white cursor-pointer transition-colors">
          UTF-8
        </span>
        <span className="hover:text-white cursor-pointer transition-colors">
          {activeLanguage}
        </span>
        <span className="hidden md:flex items-center gap-1 text-emerald-400">
          <Check size={11} />
          Prettier
        </span>

        {/* Server & DB Status Pill */}
        <div
          className="flex items-center gap-1.5 pl-2 border-l border-ide-border/60"
          title={backendConnected ? 'Engine: Online (MongoDB Atlas Connected)' : 'Engine: Reconnecting...'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              backendConnected ? 'bg-emerald-400 glow-dot-emerald' : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="text-[10px] text-ide-text">
            {backendConnected ? 'cloud-node: live' : 'offline'}
          </span>
        </div>
      </div>
    </footer>
  );
}
