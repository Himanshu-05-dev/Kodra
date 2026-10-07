import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FilePlus,
  FolderPlus,
  RefreshCw,
  Trash2,
  FolderTree
} from 'lucide-react';
import { FileIcon } from './FileIcon.jsx';

export function FileTree({
  tree,
  activeFilePath,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRefresh,
  isLoading
}) {
  const [expandedFolders, setExpandedFolders] = useState({ '': true, src: true, public: true });
  const [creatingType, setCreatingType] = useState(null); // 'file' | 'folder' | null
  const [newItemName, setNewItemName] = useState('');

  const toggleFolder = (folderPath) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (newItemName.trim()) {
      onCreateFile(newItemName.trim(), creatingType === 'folder');
      setNewItemName('');
      setCreatingType(null);
    }
  };

  const renderNode = (node, depth = 0) => {
    if (!node) return null;

    const isDir = node.type === 'directory';
    const isExpanded = expandedFolders[node.path];
    const isActive = activeFilePath === node.path;

    return (
      <div key={node.path || node.name} className="select-none">
        {node.path !== '' && (
          <div
            onClick={() => {
              if (isDir) {
                toggleFolder(node.path);
              } else {
                onSelectFile(node.path);
              }
            }}
            style={{ paddingLeft: `${depth * 13 + 8}px` }}
            className={`group flex items-center justify-between py-1 pr-2 text-xs cursor-pointer transition-all duration-100 rounded-sm mx-1 ${
              isActive
                ? 'bg-purple-500/15 text-white font-medium shadow-sm border border-purple-500/30'
                : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              {isDir && (
                <span className="text-slate-500 shrink-0">
                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </span>
              )}
              <FileIcon name={node.name} isDirectory={isDir} isOpen={isExpanded} size={14} />
              <span className="truncate font-mono text-[11.5px]">{node.name}</span>
            </div>

            {!isDir && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${node.name}"?`)) {
                    onDeleteFile(node.path);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-pink-400 p-0.5 rounded transition-opacity"
                title="Delete file"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}

        {isDir && (node.path === '' || isExpanded) && node.children && (
          <div>
            {node.children.map((child) => renderNode(child, node.path === '' ? 0 : depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0c13] border-r border-ide-border text-xs select-none">
      {/* Explorer Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border/70 text-[10.5px] tracking-wider uppercase text-slate-400 font-semibold">
        <span className="flex items-center gap-1.5 text-slate-300">
          <FolderTree size={13} className="text-purple-400" />
          Explorer
        </span>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setCreatingType(creatingType === 'file' ? null : 'file')}
            className={`p-1 rounded transition-colors ${creatingType === 'file' ? 'text-purple-400 bg-purple-500/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            title="New File"
          >
            <FilePlus size={13} />
          </button>
          <button
            onClick={() => setCreatingType(creatingType === 'folder' ? null : 'folder')}
            className={`p-1 rounded transition-colors ${creatingType === 'folder' ? 'text-purple-400 bg-purple-500/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            title="New Folder"
          >
            <FolderPlus size={13} />
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={`p-1 rounded text-slate-500 hover:text-white hover:bg-white/5 transition-colors ${isLoading ? 'animate-spin' : ''}`}
            title="Refresh Files"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Inline Creation Input */}
      {creatingType && (
        <form onSubmit={handleCreateSubmit} className="p-2 border-b border-ide-border bg-[#0d0f17]">
          <div className="flex items-center gap-1.5">
            <span className="text-purple-400">
              {creatingType === 'file' ? <FilePlus size={13} /> : <FolderPlus size={13} />}
            </span>
            <input
              type="text"
              autoFocus
              placeholder={creatingType === 'file' ? 'e.g. components/Card.jsx' : 'e.g. styles'}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setCreatingType(null)}
              className="w-full bg-[#121520] text-white text-xs px-2 py-1 rounded border border-purple-500/40 focus:border-purple-400 focus:outline-none font-mono"
            />
          </div>
        </form>
      )}

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto py-1">
        {isLoading && !tree ? (
          <div className="p-4 text-center text-slate-500 flex items-center justify-center gap-2 font-mono text-[11px]">
            <RefreshCw size={13} className="animate-spin text-purple-400" />
            loading workspace...
          </div>
        ) : tree ? (
          renderNode(tree)
        ) : (
          <div className="p-4 text-center text-slate-500 font-mono text-[11px]">No files in workspace</div>
        )}
      </div>
    </div>
  );
}
