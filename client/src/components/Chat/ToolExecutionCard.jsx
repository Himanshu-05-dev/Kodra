import React, { useState } from 'react';
import {
  Terminal,
  FileText,
  FilePlus,
  FileEdit,
  Trash2,
  Search,
  FolderTree,
  ChevronDown,
  ChevronRight,
  Check,
  AlertTriangle,
  Loader2,
  Copy,
  Wrench
} from 'lucide-react';

export function ToolExecutionCard({ tool }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const getToolMeta = (name) => {
    switch (name) {
      case 'run_command':
        return {
          icon: <Terminal size={12} className="text-cyan-400" />,
          label: 'Shell Command',
          accentColor: 'border-cyan-500/30 bg-cyan-950/20'
        };
      case 'read_file':
        return {
          icon: <FileText size={12} className="text-blue-400" />,
          label: 'Read File',
          accentColor: 'border-blue-500/30 bg-blue-950/20'
        };
      case 'write_file':
        return {
          icon: <FilePlus size={12} className="text-emerald-400" />,
          label: 'Create / Write File',
          accentColor: 'border-emerald-500/30 bg-emerald-950/20'
        };
      case 'edit_file':
        return {
          icon: <FileEdit size={12} className="text-purple-400" />,
          label: 'Edit File',
          accentColor: 'border-purple-500/30 bg-purple-950/20'
        };
      case 'delete_file':
        return {
          icon: <Trash2 size={12} className="text-red-400" />,
          label: 'Delete File',
          accentColor: 'border-red-500/30 bg-red-950/20'
        };
      case 'search_files':
        return {
          icon: <Search size={12} className="text-amber-400" />,
          label: 'Search Files',
          accentColor: 'border-amber-500/30 bg-amber-950/20'
        };
      case 'list_files':
        return {
          icon: <FolderTree size={12} className="text-slate-400" />,
          label: 'List Files',
          accentColor: 'border-slate-500/30 bg-slate-900/30'
        };
      default:
        return {
          icon: <Wrench size={12} className="text-purple-400" />,
          label: name,
          accentColor: 'border-purple-500/30 bg-purple-950/20'
        };
    }
  };

  const meta = getToolMeta(tool.name);

  const getSummary = () => {
    if (tool.name === 'run_command') return tool.args?.command || '';
    if (tool.args?.path) return tool.args.path;
    if (tool.args?.query) return `"${tool.args.query}"`;
    return '';
  };

  const handleCopyOutput = (e) => {
    e.stopPropagation();
    const content = tool.result
      ? typeof tool.result === 'object'
        ? JSON.stringify(tool.result, null, 2)
        : String(tool.result)
      : tool.error || '';
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`my-1.5 rounded-lg border text-[11px] overflow-hidden transition-all ${meta.accentColor}`}>
      {/* Header bar */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-white/[0.04] text-left transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0">{meta.icon}</div>
          <span className="font-semibold text-slate-200 shrink-0">{meta.label}:</span>
          <span className="font-mono text-slate-400 truncate max-w-[180px]">{getSummary()}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {tool.status === 'running' && (
            <span className="flex items-center gap-1 text-purple-400 font-mono text-[10px]">
              <Loader2 size={11} className="animate-spin" />
              <span>Running</span>
            </span>
          )}

          {tool.status === 'success' && (
            <span className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
              <Check size={11} />
              {tool.durationMs !== undefined && <span>{tool.durationMs}ms</span>}
            </span>
          )}

          {tool.status === 'error' && (
            <span className="flex items-center gap-1 text-red-400 font-mono text-[10px]">
              <AlertTriangle size={11} />
              <span>Failed</span>
            </span>
          )}

          <div className="text-slate-500 hover:text-slate-300">
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </div>
        </div>
      </button>

      {/* Collapsible Details Body */}
      {isExpanded && (
        <div className="p-2.5 bg-[#080a10] border-t border-white/[0.06] space-y-2 text-[10.5px]">
          {/* Tool Arguments */}
          {tool.args && Object.keys(tool.args).length > 0 && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                Input Parameters:
              </div>
              <pre className="p-1.5 rounded bg-[#10131e] border border-white/5 font-mono text-slate-300 overflow-x-auto text-[10px]">
                {JSON.stringify(tool.args, null, 2)}
              </pre>
            </div>
          )}

          {/* Tool Output / Result */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
              <span>{tool.error ? 'Error Details:' : 'Execution Output:'}</span>
              <button
                onClick={handleCopyOutput}
                className="hover:text-white flex items-center gap-1 normal-case text-slate-400"
              >
                {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {tool.error ? (
              <div className="p-2 rounded bg-red-950/40 border border-red-500/30 text-red-300 font-mono text-[10px] whitespace-pre-wrap">
                {tool.error}
              </div>
            ) : tool.result ? (
              <pre className="p-2 rounded bg-[#10131e] border border-white/5 font-mono text-cyan-300/90 overflow-x-auto max-h-48 whitespace-pre-wrap text-[10px]">
                {typeof tool.result === 'object'
                  ? tool.result.stdout || tool.result.stderr || JSON.stringify(tool.result, null, 2)
                  : String(tool.result)}
              </pre>
            ) : (
              <div className="text-slate-500 italic text-[10px]">No output returned</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
