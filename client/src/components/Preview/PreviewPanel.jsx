import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Globe,
  RefreshCw,
  ExternalLink,
  Monitor,
  Tablet,
  Smartphone,
  RotateCw,
  Copy,
  Check,
  Zap,
  ChevronDown,
  Radio,
  Terminal,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api.js';

export function PreviewPanel({
  projectId,
  onClose
}) {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Viewport states: 'desktop' | 'tablet' | 'mobile'
  const [viewport, setViewport] = useState('desktop');
  const [isLandscape, setIsLandscape] = useState(false);

  // URL states
  const [path, setPath] = useState('/');
  const [inputPath, setInputPath] = useState('/');
  const [urlMode, setUrlMode] = useState('direct'); // 'direct' (localhost:port) or 'subdomain' (*.preview.localhost)

  // Port selector dropdown state
  const [isPortDropdownOpen, setIsPortDropdownOpen] = useState(false);
  const [customPortInput, setCustomPortInput] = useState('');

  const iframeRef = useRef(null);
  const pollTimerRef = useRef(null);

  // Fetch preview status from backend
  const fetchStatus = useCallback(async (silent = false) => {
    if (!projectId) return;
    if (!silent) setIsLoading(true);

    try {
      const data = await api.getPreviewStatus(projectId);
      setStatus(data);
    } catch (err) {
      console.error('Failed to query preview status:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [projectId]);

  // Initial load and periodic auto-detection polling
  useEffect(() => {
    fetchStatus();

    // Poll status periodically (every 3.5s if offline, 10s if running)
    const startPolling = () => {
      clearInterval(pollTimerRef.current);
      const interval = status?.isRunning ? 10000 : 3500;
      pollTimerRef.current = setInterval(() => {
        fetchStatus(true);
      }, interval);
    };

    startPolling();
    return () => clearInterval(pollTimerRef.current);
  }, [fetchStatus, status?.isRunning]);

  // Handle manual hard refresh of iframe
  const handleRefresh = () => {
    setIsRefreshing(true);
    if (iframeRef.current) {
      // Force reload iframe
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = 'about:blank';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentSrc;
        }
        setIsRefreshing(false);
      }, 100);
    } else {
      setTimeout(() => setIsRefreshing(false), 500);
    }
    fetchStatus(true);
  };

  // Actively detect open dev ports
  const handleDetectPort = async () => {
    if (!projectId) return;
    setIsDetecting(true);
    try {
      const data = await api.detectPreviewPort(projectId);
      setStatus(data);
    } catch (err) {
      console.error('Port detection failed:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  // Change dev port
  const handleSetPort = async (newPort) => {
    if (!projectId || !newPort) return;
    setIsPortDropdownOpen(false);
    setIsLoading(true);
    try {
      const data = await api.setPreviewPort(projectId, newPort);
      setStatus(data);
    } catch (err) {
      console.error('Setting port failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Compute active preview URL
  const getActiveUrl = () => {
    if (!status) return 'http://localhost:5173';

    const baseUrl = urlMode === 'subdomain'
      ? status.previewUrl
      : status.directUrl;

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath === '/' ? '' : cleanPath}`;
  };

  const activeUrl = getActiveUrl();

  // Navigate to path on Enter in address bar
  const handleAddressSubmit = (e) => {
    e.preventDefault();
    let normalized = inputPath.trim();
    if (!normalized.startsWith('/')) {
      normalized = `/${normalized}`;
    }
    setPath(normalized);
  };

  // Copy URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Open in new browser tab
  const handleOpenExternal = () => {
    window.open(activeUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0c13] text-ide-text select-none overflow-hidden border-l border-ide-border">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col border-b border-ide-border bg-[#0d0f18]/90 backdrop-blur-md shrink-0">
        {/* Top Controls Row */}
        <div className="flex items-center justify-between px-3 py-2 gap-2 text-xs">
          {/* Status & Port Selector */}
          <div className="flex items-center gap-2">
            {/* Live Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                status?.isRunning
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status?.isRunning
                    ? 'bg-emerald-400 glow-dot-emerald animate-pulse'
                    : 'bg-amber-400 animate-ping'
                }`}
              />
              <span>{status?.isRunning ? 'HMR Live' : 'Offline'}</span>
            </div>

            {/* Port Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsPortDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-mono text-[11px] transition-colors"
                title="Select Dev Port"
              >
                <Zap size={12} className="text-purple-400" />
                <span>:{status?.port || 5173}</span>
                <ChevronDown size={12} className="text-ide-muted" />
              </button>

              {isPortDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-44 rounded-lg bg-[#141724] border border-white/10 shadow-2xl p-1.5 z-50 text-xs">
                  <div className="px-2 py-1 text-[10px] uppercase font-semibold text-ide-muted tracking-wider">
                    Common Ports
                  </div>
                  {[5173, 3000, 8080, 4173].map((p) => (
                    <button
                      key={p}
                      onClick={() => handleSetPort(p)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-colors font-mono ${
                        status?.port === p
                          ? 'bg-purple-600/30 text-purple-300 font-semibold'
                          : 'hover:bg-white/5 text-ide-text'
                      }`}
                    >
                      <span>Port {p}</span>
                      {status?.availablePorts?.includes(p) && (
                        <span className="text-[10px] text-emerald-400 font-sans">Active</span>
                      )}
                    </button>
                  ))}

                  <div className="my-1 border-t border-white/10" />

                  {/* Custom Port Input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (customPortInput) handleSetPort(parseInt(customPortInput, 10));
                    }}
                    className="p-1 flex items-center gap-1"
                  >
                    <input
                      type="number"
                      placeholder="Custom..."
                      value={customPortInput}
                      onChange={(e) => setCustomPortInput(e.target.value)}
                      className="w-full px-2 py-1 bg-black/40 border border-white/10 rounded text-[11px] text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <button
                      type="submit"
                      className="px-2 py-1 bg-purple-600 hover:bg-purple-500 rounded text-white text-[11px] font-medium"
                    >
                      Go
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Auto-detect button */}
            <button
              onClick={handleDetectPort}
              disabled={isDetecting}
              className={`p-1 rounded-md text-ide-muted hover:text-white hover:bg-white/5 transition-colors ${
                isDetecting ? 'animate-spin text-purple-400' : ''
              }`}
              title="Scan and auto-detect active dev ports"
            >
              <Radio size={14} />
            </button>
          </div>

          {/* Viewport Size Controls */}
          <div className="flex items-center bg-black/30 p-0.5 rounded-lg border border-white/5">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded-md transition-all ${
                viewport === 'desktop'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-ide-muted hover:text-white hover:bg-white/5'
              }`}
              title="Desktop Viewport (100%)"
            >
              <Monitor size={14} />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded-md transition-all ${
                viewport === 'tablet'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-ide-muted hover:text-white hover:bg-white/5'
              }`}
              title="Tablet Viewport (768px)"
            >
              <Tablet size={14} />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded-md transition-all ${
                viewport === 'mobile'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-ide-muted hover:text-white hover:bg-white/5'
              }`}
              title="Mobile Viewport (375px)"
            >
              <Smartphone size={14} />
            </button>

            {viewport !== 'desktop' && (
              <button
                onClick={() => setIsLandscape((prev) => !prev)}
                className={`p-1.5 ml-0.5 rounded-md text-ide-muted hover:text-white hover:bg-white/5 transition-colors ${
                  isLandscape ? 'text-purple-400' : ''
                }`}
                title="Rotate Orientation"
              >
                <RotateCw size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Address Bar Row */}
        <div className="flex items-center gap-1.5 px-3 pb-2">
          {/* Refresh Iframe */}
          <button
            onClick={handleRefresh}
            className={`p-1.5 rounded-md text-ide-muted hover:text-white hover:bg-white/5 transition-colors ${
              isRefreshing ? 'animate-spin text-purple-400' : ''
            }`}
            title="Reload Preview Frame"
          >
            <RefreshCw size={14} />
          </button>

          {/* Omnibox URL Bar */}
          <form
            onSubmit={handleAddressSubmit}
            className="flex-1 flex items-center bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs focus-within:border-purple-500/80 transition-colors"
          >
            <Globe size={13} className="text-ide-muted mr-1.5 shrink-0" />
            <span className="text-white/40 font-mono select-none text-[11px] shrink-0 mr-0.5">
              {urlMode === 'subdomain' ? `${status?.projectId || 'app'}.preview:` : 'localhost:'}
              {status?.port || 5173}
            </span>
            <input
              type="text"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder="/"
              className="w-full bg-transparent text-white font-mono text-[11px] focus:outline-none"
            />
          </form>

          {/* URL Mode Toggle (Subdomain vs Direct Localhost) */}
          <button
            onClick={() => setUrlMode((prev) => (prev === 'direct' ? 'subdomain' : 'direct'))}
            className="px-2 py-1 rounded-md text-[10px] font-mono border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-purple-300 transition-colors"
            title={`Switch to ${urlMode === 'direct' ? 'Subdomain Proxy' : 'Direct Localhost'} mode`}
          >
            {urlMode === 'direct' ? 'Direct' : 'Subdomain'}
          </button>

          {/* Copy URL */}
          <button
            onClick={handleCopyUrl}
            className="p-1.5 rounded-md text-ide-muted hover:text-white hover:bg-white/5 transition-colors"
            title="Copy Preview URL"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>

          {/* Open External */}
          <button
            onClick={handleOpenExternal}
            className="p-1.5 rounded-md text-ide-muted hover:text-white hover:bg-white/5 transition-colors"
            title="Open in New Tab"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* 2. Main Preview Viewport */}
      <div className="flex-1 w-full h-full overflow-hidden bg-[#07080d] flex items-center justify-center p-2 relative">
        {isLoading && !status ? (
          <div className="flex flex-col items-center justify-center gap-3 text-ide-muted">
            <RefreshCw size={24} className="animate-spin text-purple-400" />
            <span className="text-xs font-medium">Connecting to preview gateway...</span>
          </div>
        ) : !status?.isRunning ? (
          /* Offline Dev Server Guidance Screen */
          <div className="max-w-md w-full bg-[#0e1017]/90 border border-white/10 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-purple-600/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-glow-purple">
              <Zap size={26} />
            </div>

            <h3 className="text-white font-semibold text-base mb-1.5">
              Development Server Offline
            </h3>

            <p className="text-ide-muted text-xs leading-relaxed mb-4">
              No live application server was detected listening on port <span className="text-purple-300 font-mono">:{status?.port || 5173}</span>. Start your dev server in the terminal below to see the live preview with instant Hot Module Replacement.
            </p>

            {/* Run Command Card */}
            <div className="bg-black/50 border border-white/10 rounded-xl p-3 mb-4 flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2 text-cyan-300">
                <span className="text-ide-muted">$</span>
                <span>npm run dev</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('npm run dev');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="p-1 hover:text-white text-ide-muted transition-colors"
                title="Copy Command"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => fetchStatus()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all shadow-glow-sm flex items-center gap-2"
              >
                <RefreshCw size={13} />
                <span>Check Again</span>
              </button>
              <button
                onClick={handleDetectPort}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition-colors"
              >
                Scan All Ports
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-ide-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Auto-detecting dev servers in background...</span>
            </div>
          </div>
        ) : (
          /* Live Iframe Viewport with Responsive Frames */
          <div
            className={`transition-all duration-300 ease-out h-full overflow-hidden flex items-center justify-center ${
              viewport === 'desktop'
                ? 'w-full'
                : viewport === 'tablet'
                ? isLandscape
                  ? 'w-[1024px] max-w-full rounded-2xl border-4 border-slate-800 shadow-2xl bg-black'
                  : 'w-[768px] max-w-full rounded-2xl border-4 border-slate-800 shadow-2xl bg-black'
                : isLandscape
                ? 'w-[844px] max-w-full rounded-[2.5rem] border-[10px] border-slate-800 shadow-2xl bg-black'
                : 'w-[390px] max-w-full rounded-[2.5rem] border-[10px] border-slate-800 shadow-2xl bg-black'
            }`}
          >
            <iframe
              ref={iframeRef}
              src={activeUrl}
              title="Kodra Live Preview"
              className="w-full h-full bg-white border-0 rounded-inherit select-auto"
              sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts allow-downloads"
              allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; clipboard-read; clipboard-write;"
            />
          </div>
        )}
      </div>
    </div>
  );
}
