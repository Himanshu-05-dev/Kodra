import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Sparkles, Save, FileCode2, Terminal, Command } from 'lucide-react';

function getLanguageFromPath(filePath) {
  if (!filePath) return 'plaintext';
  const ext = filePath.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'jsx':
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'tsx':
    case 'ts':
      return 'typescript';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'py':
      return 'python';
    case 'sh':
      return 'shell';
    case 'yml':
    case 'yaml':
      return 'yaml';
    default:
      return 'plaintext';
  }
}

export function CodeEditor({
  activeFile,
  content,
  onChange,
  onSave,
  isSaving,
  onOpenAiChat
}) {
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define Custom "Kodra Vibe Dark" Theme
    monaco.editor.defineTheme('kodra-vibe-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'f43f5e', fontStyle: 'bold' },
        { token: 'identifier', foreground: 'e2e8f0' },
        { token: 'type', foreground: 'c084fc' },
        { token: 'function', foreground: '38bdf8' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'fbbf24' },
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'delimiter', foreground: '94a3b8' },
        { token: 'tag', foreground: 'ec4899' }
      ],
      colors: {
        'editor.background': '#0c0e15',
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': '#ffffff05',
        'editorCursor.foreground': '#a855f7',
        'editor.selectionBackground': '#a855f730',
        'editor.inactiveSelectionBackground': '#a855f715',
        'editorLineNumber.foreground': '#334155',
        'editorLineNumber.activeForeground': '#c084fc',
        'editorGutter.background': '#0c0e15',
        'editorIndentGuide.background': '#1e293b',
        'editorIndentGuide.activeBackground': '#a855f750'
      }
    });

    monaco.editor.setTheme('kodra-vibe-dark');

    // Add Ctrl+S / Cmd+S save action
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (activeFile) {
        onSave();
      }
    });

    editor.focus();
  };

  if (!activeFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0c0e15] text-slate-400 select-none p-6 relative overflow-hidden">
        {/* Ambient background aura */}
        <div className="absolute w-96 h-96 rounded-full bg-purple-600/5 blur-3xl pointer-events-none" />
        <div className="absolute w-64 h-64 rounded-full bg-cyan-600/5 blur-3xl pointer-events-none -bottom-10 right-10" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          {/* Glowing Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500/20 via-indigo-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-5 shadow-glow-purple">
            <Sparkles size={28} />
          </div>

          <h3 className="text-lg font-semibold text-white tracking-tight mb-2">
            Vibe Coding Environment
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Cloud development without local friction. Select any source file from the explorer on the left or prompt Kodra AI to build features.
          </p>

          {/* Quick Shortcuts Pill Grid */}
          <div className="grid grid-cols-2 gap-2.5 w-full text-[11px] text-slate-300">
            <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.07] flex items-center justify-between">
              <span className="text-slate-400">Save File</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-purple-300 text-[10px]">
                Ctrl + S
              </kbd>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.07] flex items-center justify-between">
              <span className="text-slate-400">Command Bar</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-cyan-300 text-[10px]">
                Ctrl + K
              </kbd>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const language = getLanguageFromPath(activeFile.path);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0c0e15] relative overflow-hidden">
      {/* Editor Sub-Header / Breadcrumb */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#090b10] border-b border-ide-border text-[11px] text-slate-400 select-none">
        <div className="flex items-center gap-2">
          <FileCode2 size={13} className="text-purple-400" />
          <span className="font-mono text-slate-300">{activeFile.path}</span>
          {activeFile.isDirty && (
            <span className="text-pink-400 text-[9px] font-mono tracking-wide bg-pink-500/10 border border-pink-500/20 px-1.5 py-0.2 rounded-full">
              UNSAVED
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-500">
            syntax: <strong className="text-purple-300 font-mono text-[10px] uppercase">{language}</strong>
          </span>
          <button
            onClick={onSave}
            disabled={!activeFile.isDirty || isSaving}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
              activeFile.isDirty
                ? 'bg-purple-600 text-white shadow-glow-purple hover:bg-purple-500'
                : 'text-slate-500 opacity-40 cursor-not-allowed'
            }`}
            title="Save file (Ctrl+S)"
          >
            <Save size={11} />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Monaco Mount */}
      <div className="flex-1 w-full h-full">
        <Editor
          height="100%"
          language={language}
          value={content}
          theme="vs-dark"
          onChange={(val) => onChange(val ?? '')}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 13.5,
            fontFamily: "'Fira Code', 'JetBrains Mono', Menlo, monospace",
            fontLigatures: true,
            tabSize: 2,
            insertSpaces: true,
            minimap: { enabled: true, maxColumn: 80 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            padding: { top: 10, bottom: 10 }
          }}
        />
      </div>
    </div>
  );
}
