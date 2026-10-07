import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

export function XTerminal({
  onInput,
  onResize,
  subscribeOutput,
  status,
  onClear
}) {
  const containerRef = useRef(null);
  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialize xterm instance with Cyber Obsidian Vibe theme
    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: "'Fira Code', 'JetBrains Mono', Menlo, monospace",
      fontSize: 12.5,
      letterSpacing: 0,
      lineHeight: 1.25,
      scrollback: 5000,
      allowTransparency: true,
      theme: {
        background: '#07080d',
        foreground: '#e2e8f0',
        cursor: '#06b6d4',
        cursorAccent: '#07080d',
        selectionBackground: 'rgba(168, 85, 247, 0.35)',
        black: '#0a0c14',
        red: '#f43f5e',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#38bdf8',
        magenta: '#c084fc',
        cyan: '#06b6d4',
        white: '#f8fafc',
        brightBlack: '#475569',
        brightRed: '#fb7185',
        brightGreen: '#34d399',
        brightYellow: '#fcd34d',
        brightBlue: '#60a5fa',
        brightMagenta: '#e879f9',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff'
      }
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(containerRef.current);
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Fit dimensions immediately after mount
    try {
      fitAddon.fit();
      if (onResize) {
        onResize(terminal.cols, terminal.rows);
      }
    } catch {}

    // 2. Stream user input to WebSocket
    const inputDisposable = terminal.onData((data) => {
      if (onInput) {
        onInput(data);
      }
    });

    // 3. Stream incoming WebSocket data into terminal
    const unsubscribe = subscribeOutput((chunk) => {
      terminal.write(chunk);
    });

    // 4. Resize Observer for dynamic panel resizing
    let resizeTimeout = null;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        try {
          if (containerRef.current && fitAddonRef.current && terminalRef.current) {
            fitAddonRef.current.fit();
            if (onResize) {
              onResize(terminalRef.current.cols, terminalRef.current.rows);
            }
          }
        } catch {}
      }, 50);
    });

    resizeObserver.observe(containerRef.current);

    // Initial focus
    terminal.focus();

    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
      inputDisposable.dispose();
      unsubscribe();
      terminal.dispose();
    };
  }, [onInput, onResize, subscribeOutput]);

  return (
    <div className="w-full h-full p-2 bg-[#07080d] overflow-hidden select-text">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
