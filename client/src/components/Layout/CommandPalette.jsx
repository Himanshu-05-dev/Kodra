import React, { useState, useEffect } from 'react';
import { Search, FileCode2, Terminal, Plus, Sparkles, Headphones, X } from 'lucide-react';

export function CommandPalette({
  isOpen,
  onClose,
  files = [],
  onOpenFile,
  onCreateFile,
  onCreateProject,
  onToggleVibeMode,
  onToggleTerminal
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isOpen) return null;

  // Flatten file paths from tree
  const extractFiles = (node, acc = []) => {
    if (!node) return acc;
    if (node.type === 'file' && node.path) {
      acc.push(node.path);
    }
    if (node.children) {
      node.children.forEach((c) => extractFiles(c, acc));
    }
    return acc;
  };

  const allFiles = extractFiles(files);

  const commands = [
    {
      id: 'vibe',
      title: 'Toggle Vibe Coding Atmosphere (Lo-Fi)',
      icon: <Headphones size={14} className="text-pink-400" />,
      action: () => { onToggleVibeMode(); onClose(); }
    },
    {
      id: 'terminal',
      title: 'Toggle Terminal Panel',
      icon: <Terminal size={14} className="text-cyan-400" />,
      action: () => { onToggleTerminal(); onClose(); }
    },
    {
      id: 'new-project',
      title: 'Create New Project...',
      icon: <Plus size={14} className="text-purple-400" />,
      action: () => { onCreateProject(); onClose(); }
    }
  ];

  const filteredFiles = allFiles.filter((f) =>
    f.toLowerCase().includes(query.toLowerCase())
  );

  const items = [
    ...filteredFiles.map((f) => ({
      id: f,
      type: 'file',
      title: f,
      icon: <FileCode2 size={14} className="text-blue-400" />,
      action: () => { onOpenFile(f); onClose(); }
    })),
    ...commands.filter((c) =>
      c.title.toLowerCase().includes(query.toLowerCase())
    )
  ];

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-xl glass-dropdown rounded-xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search size={16} className="text-purple-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a file name, command, or shortcut..."
            className="w-full bg-transparent text-white text-xs placeholder:text-slate-500 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono text-slate-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
          {items.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs">
              No matching files or commands found.
            </div>
          ) : (
            items.map((item, index) => (
              <div
                key={item.id}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                  index === selectedIndex
                    ? 'bg-purple-500/20 text-white font-medium border border-purple-500/30'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate font-mono text-[11.5px]">
                  {item.icon}
                  <span className="truncate">{item.title}</span>
                </div>
                {item.type === 'file' && (
                  <span className="text-[10px] text-slate-500 uppercase font-sans">Open</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
