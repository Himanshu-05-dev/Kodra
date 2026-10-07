import React, { useState } from 'react';
import {
  Code2,
  FolderGit2,
  Save,
  Search,
  Sparkles,
  ChevronDown,
  Plus,
  Headphones,
  CheckCircle2,
  Command,
  Radio
} from 'lucide-react';

export function Navbar({
  currentProject,
  projects = [],
  onSelectProject,
  onCreateProjectClick,
  onSaveFile,
  isDirty,
  isSaving,
  activeFilePath,
  isVibeModeActive,
  onToggleVibeMode,
  onOpenCommandPalette
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="h-11 bg-[#090b10] border-b border-ide-border flex items-center justify-between px-3 text-xs select-none z-20 shrink-0">
      {/* Left: Brand & Project Selector */}
      <div className="flex items-center gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2 font-bold text-sm tracking-tight pr-3 border-r border-ide-border/60">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-purple-500 via-indigo-500 to-cyan-400 p-[1px] shadow-glow-sm">
            <div className="w-full h-full bg-[#0d0f17] rounded-[5px] flex items-center justify-center">
              <Code2 size={14} className="text-purple-300" />
            </div>
          </div>
          <span className="font-semibold tracking-wide bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            KODRA
          </span>
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono">
            vibe
          </span>
        </div>

        {/* Project Selector Glass Pill */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] hover:border-purple-500/50 hover:bg-white/[0.07] text-slate-300 hover:text-white transition-all shadow-sm"
          >
            <FolderGit2 size={13} className="text-purple-400" />
            <span className="font-medium max-w-[140px] truncate text-white">
              {currentProject ? currentProject.name : 'Select Project'}
            </span>
            <ChevronDown size={12} className="text-ide-muted" />
          </button>

          {dropdownOpen && (
            <div
              className="absolute left-0 mt-1 w-60 glass-dropdown rounded-lg shadow-2xl py-1 z-50 text-xs border border-white/10 animate-in fade-in zoom-in-95 duration-100"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div className="px-3 py-1.5 text-[10px] font-semibold text-ide-muted uppercase tracking-wider border-b border-white/5 flex items-center justify-between">
                <span>Projects</span>
                <span className="text-purple-400 font-mono">{projects.length}</span>
              </div>

              <div className="max-h-52 overflow-y-auto py-1">
                {projects.map((proj) => (
                  <button
                    key={proj._id}
                    onClick={() => {
                      onSelectProject(proj);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center justify-between transition-colors ${
                      currentProject?._id === proj._id ? 'text-purple-300 bg-purple-500/10 font-medium' : 'text-slate-300'
                    }`}
                  >
                    <span className="truncate">{proj.name}</span>
                    <span className="text-[9px] text-ide-muted font-mono uppercase bg-white/5 px-1.5 py-0.5 rounded">
                      {proj.template}
                    </span>
                  </button>
                ))}
              </div>

              <div className="border-t border-white/5 p-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onCreateProjectClick();
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 rounded flex items-center gap-2 font-medium transition-colors"
                >
                  <Plus size={13} />
                  Create New Project
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Spotlight Command Bar (Linear / Raycast style) */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.07] hover:border-purple-500/40 hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-all text-xs group"
        >
          <div className="flex items-center gap-2 truncate">
            <Search size={13} className="text-purple-400 group-hover:text-purple-300" />
            <span className="truncate">
              {activeFilePath ? (
                <span className="font-mono text-slate-300">{activeFilePath}</span>
              ) : (
                "Quick Open or Ask Kodra AI..."
              )}
            </span>
          </div>

          <kbd className="hidden lg:flex items-center gap-0.5 text-[10px] font-mono text-slate-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
            <Command size={10} /> K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Vibe Mode Headphone Button */}
        <button
          onClick={onToggleVibeMode}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            isVibeModeActive
              ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 border border-pink-500/30 shadow-sm shadow-pink-500/20'
              : 'text-slate-400 hover:text-white bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08]'
          }`}
          title="Toggle Vibe Coding Atmosphere"
        >
          <Headphones size={13} className={isVibeModeActive ? "text-pink-400 animate-pulse" : ""} />
          <span className="hidden sm:inline">Vibe</span>
        </button>

        {/* Save Button with Neon Glow on Dirty */}
        <button
          onClick={onSaveFile}
          disabled={!isDirty || isSaving}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
            isDirty
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow-purple hover:brightness-110 active:scale-95'
              : 'text-slate-500 bg-white/[0.02] border border-white/[0.05] cursor-not-allowed opacity-50'
          }`}
          title="Save file (Ctrl+S)"
        >
          <Save size={13} />
          <span>{isSaving ? 'Saving...' : 'Save'}</span>
        </button>
      </div>
    </header>
  );
}
