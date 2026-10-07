import React from 'react';
import { X, Circle } from 'lucide-react';
import { FileIcon } from '../FileExplorer/FileIcon.jsx';

export function EditorTabs({
  tabs,
  activeTabPath,
  onSelectTab,
  onCloseTab
}) {
  if (!tabs || tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center bg-[#07090e] border-b border-ide-border overflow-x-auto no-scrollbar select-none text-xs h-9 px-1 gap-1">
      {tabs.map((tab) => {
        const isActive = tab.path === activeTabPath;
        const fileName = tab.path.split('/').pop();

        return (
          <div
            key={tab.path}
            onClick={() => onSelectTab(tab.path)}
            className={`group relative flex items-center gap-2 h-7 px-3 rounded-md cursor-pointer transition-all duration-150 max-w-[200px] shrink-0 ${
              isActive
                ? 'bg-[#121520] text-white font-medium border border-white/10 shadow-sm tab-active-glow'
                : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent'
            }`}
          >
            <FileIcon name={fileName} isDirectory={false} size={13} />
            <span className="truncate text-[11.5px] font-mono">{fileName}</span>

            <div className="flex items-center ml-1 shrink-0">
              {tab.isDirty ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.path);
                  }}
                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-white/10 text-pink-400"
                  title="Unsaved changes"
                >
                  <Circle size={7} fill="currentColor" className="animate-pulse" />
                </span>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.path);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:bg-white/10 text-slate-400 hover:text-white p-0.5 rounded transition-all"
                  title="Close tab"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
