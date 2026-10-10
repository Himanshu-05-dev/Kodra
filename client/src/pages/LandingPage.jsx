import React, { useState } from 'react';
import {
  Code2,
  Sparkles,
  Terminal,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  Globe,
  Headphones,
  CheckCircle2,
  ArrowRight,
  Play,
  Server,
  FileCode,
  Lock,
  ChevronDown,
  ChevronRight,
  Github,
  Command,
  LayoutGrid,
  ExternalLink,
  Flame,
  Check,
  RefreshCw,
  Box
} from 'lucide-react';
import { UserMenu } from '../components/Auth/UserMenu.jsx';

export function LandingPage({
  onLaunchDashboard,
  onOpenAuthModal,
  isAuthenticated,
  user
}) {
  const [activeTab, setActiveTab] = useState('agent'); // 'agent' | 'sandbox' | 'preview'
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#06070a] text-ide-text select-none overflow-x-hidden font-sans">
      {/* 1. Global Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-white/[0.08] bg-[#07080d]/85 backdrop-blur-xl z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-cyan-400 p-[1px] shadow-glow-sm">
              <div className="w-full h-full bg-[#0d0f17] rounded-[11px] flex items-center justify-center">
                <Code2 size={18} className="text-purple-300" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                KODRA
              </span>
              <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                vibe cloud
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
            <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">
              Features
            </button>
            <button onClick={() => scrollToSection('agent-engine')} className="hover:text-white transition-colors">
              Agent Engine
            </button>
            <button onClick={() => scrollToSection('architecture')} className="hover:text-white transition-colors">
              Architecture
            </button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">
              Pricing
            </button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors">
              FAQ
            </button>
          </nav>
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <button
                onClick={onLaunchDashboard}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-sm transition-all active:scale-95"
              >
                <LayoutGrid size={13} />
                <span>Open Workspaces</span>
              </button>
              <UserMenu onOpenAuthModal={onOpenAuthModal} />
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                onClick={onOpenAuthModal}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={onLaunchDashboard}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-sm transition-all active:scale-95"
              >
                <span>Launch Studio Free</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-36 pb-20 px-6 overflow-hidden">
        {/* Ambient Neon Blobs */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-purple-600/20 via-indigo-600/15 to-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-96 left-1/4 w-[300px] h-[300px] bg-pink-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-medium text-purple-300 mb-6 backdrop-blur-md shadow-inner animate-in fade-in duration-300">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-glow-cyan" />
            <span className="font-mono text-[11px] uppercase tracking-wider">Kodra 2.0 Autonomous Engine</span>
            <span className="text-white/30">•</span>
            <span className="text-slate-400">Zero Local Setup</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] mb-6">
            Code at the Speed of Thought.{' '}
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
              Built for Autonomous Vibe Coding.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
            The next-generation cloud browser IDE powered by multi-step self-healing AI agent loops, instant containerized execution sandboxes, and zero-flicker live preview with Hot Module Reloading.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
            <button
              onClick={onLaunchDashboard}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white text-sm font-semibold shadow-glow-purple transition-all active:scale-95"
            >
              <Zap size={16} className="fill-current" />
              <span>Launch Cloud Studio (Free)</span>
            </button>

            <button
              onClick={() => scrollToSection('features')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all"
            >
              <span>Explore Capabilities</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Social Proof Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto py-5 px-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md">
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white">0s</div>
              <div className="text-[11px] text-ide-muted mt-0.5">Setup & Spin-up Time</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-400">100%</div>
              <div className="text-[11px] text-ide-muted mt-0.5">Docker Workspace Isolation</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-purple-400">15+</div>
              <div className="text-[11px] text-ide-muted mt-0.5">Autonomous Healing Steps</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">60 FPS</div>
              <div className="text-[11px] text-ide-muted mt-0.5">Live HMR Preview Refresh</div>
            </div>
          </div>
        </div>

        {/* 3. Interactive IDE Product Showcase / Demo Window */}
        <div className="max-w-6xl mx-auto mt-14 relative z-10">
          <div className="rounded-2xl border border-white/15 bg-[#090b12] shadow-2xl shadow-purple-950/30 overflow-hidden ring-1 ring-white/10">
            {/* Window Titlebar */}
            <div className="h-10 bg-[#0d0f18] border-b border-white/10 px-4 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-xs text-slate-400 truncate">
                  kodra-cloud-workspace — /src/App.jsx
                </span>
              </div>

              {/* Showcase Switcher Pills */}
              <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5 text-[11px]">
                <button
                  onClick={() => setActiveTab('agent')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                    activeTab === 'agent'
                      ? 'bg-purple-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles size={11} />
                  <span>AI Loop Engine</span>
                </button>
                <button
                  onClick={() => setActiveTab('sandbox')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                    activeTab === 'sandbox'
                      ? 'bg-cyan-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Terminal size={11} />
                  <span>Docker PTY Terminal</span>
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                    activeTab === 'preview'
                      ? 'bg-emerald-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Globe size={11} />
                  <span>Live HMR Preview</span>
                </button>
              </div>
            </div>

            {/* Showcase Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px] bg-[#07090f]">
              {/* Left Column: Monaco Code Simulation */}
              <div className="lg:col-span-7 p-5 font-mono text-xs border-r border-white/5 overflow-x-auto leading-relaxed">
                <div className="text-ide-muted mb-2">// Autonomous Vite React Component with Tailwind</div>
                <div className="text-purple-400">import <span className="text-white">React, &#123; useState, useEffect &#125;</span> from <span className="text-emerald-300">'react'</span>;</div>
                <div className="text-purple-400">import <span className="text-white">&#123; Sparkles, Zap, Flame &#125;</span> from <span className="text-emerald-300">'lucide-react'</span>;</div>
                <br />
                <div className="text-purple-400">export function <span className="text-cyan-300">AutonomousDashboard</span>() &#123;</div>
                <div className="pl-4 text-purple-400">const <span className="text-white">[metrics, setMetrics]</span> = useState(&#123; compute: <span className="text-amber-300">'99.9%'</span>, healSteps: <span className="text-amber-300">12</span> &#125;);</div>
                <br />
                <div className="pl-4 text-ide-muted">// Agent tool: self-healed missing import on step 2</div>
                <div className="pl-4 text-purple-400">return (</div>
                <div className="pl-8 text-cyan-300">&lt;<span className="text-purple-300">div</span> <span className="text-cyan-200">className</span>=<span className="text-emerald-300">"grid grid-cols-3 gap-4 p-6 bg-[#0c0e18] rounded-2xl"</span>&gt;</div>
                <div className="pl-12 text-cyan-300">&lt;<span className="text-purple-300">h2</span> <span className="text-cyan-200">className</span>=<span className="text-emerald-300">"text-lg font-bold text-white flex items-center gap-2"</span>&gt;</div>
                <div className="pl-16 text-cyan-300">&lt;<span className="text-purple-300">Sparkles</span> <span className="text-cyan-200">size</span>=&#123;<span className="text-amber-300">16</span>&#125; <span className="text-cyan-200">className</span>=<span className="text-emerald-300">"text-purple-400"</span> /&gt;</div>
                <div className="pl-16 text-white">Autonomous Cloud Engine Ready</div>
                <div className="pl-12 text-cyan-300">&lt;/<span className="text-purple-300">h2</span>&gt;</div>
                <div className="pl-8 text-cyan-300">&lt;/<span className="text-purple-300">div</span>&gt;</div>
                <div className="pl-4 text-purple-400">);</div>
                <div className="text-purple-400">&#125;</div>
              </div>

              {/* Right Column: Dynamic Panel based on Active Tab */}
              <div className="lg:col-span-5 p-4 bg-[#0a0c14] flex flex-col justify-between">
                {activeTab === 'agent' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-ide-muted border-b border-white/5 pb-2">
                      <span className="flex items-center gap-1.5 font-semibold text-purple-300">
                        <Sparkles size={12} />
                        Autonomous Agent Execution
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px]">
                        Iteration 3 / 15
                      </span>
                    </div>

                    {/* Step Card 1 */}
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
                      <div className="flex items-center justify-between font-mono text-[10px] text-cyan-400 mb-1">
                        <span>✓ TOOL: list_dir</span>
                        <span className="text-ide-muted">14ms</span>
                      </div>
                      <p className="text-[11px] text-slate-300">Scanned /workspace/src and discovered App.jsx</p>
                    </div>

                    {/* Step Card 2: Self-healing */}
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                      <div className="flex items-center justify-between font-mono text-[10px] text-amber-400 mb-1">
                        <span>⚙ SELF-HEALING DEBUGGER</span>
                        <span className="text-ide-muted">Detected</span>
                      </div>
                      <p className="text-[11px] text-amber-200/90">
                        Exit code 1 on "npm run build": Missing export "AutonomousDashboard". Auto-correcting...
                      </p>
                    </div>

                    {/* Step Card 3 */}
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
                      <div className="flex items-center justify-between font-mono text-[10px] text-purple-400 mb-1">
                        <span>✓ TOOL: write_file</span>
                        <span className="text-ide-muted">32ms</span>
                      </div>
                      <p className="text-[11px] text-purple-200">Appended missing export to src/App.jsx. Build verified ✓</p>
                    </div>
                  </div>
                )}

                {activeTab === 'sandbox' && (
                  <div className="h-full flex flex-col justify-between font-mono text-xs">
                    <div className="space-y-1.5 text-slate-300">
                      <div className="text-emerald-400">$ docker run -d --name kodra-box node:20-alpine</div>
                      <div className="text-ide-muted">[docker] container id: a782fc490b1e</div>
                      <div className="text-cyan-300">[docker] mounted: /host/workspaces/proj-01 -&gt; /workspace</div>
                      <div className="text-slate-400">$ npm run dev</div>
                      <div className="text-emerald-300">&gt; vite dev --host 0.0.0.0 --port 5173</div>
                      <div className="text-white mt-2">
                        VITE v5.4.10 ready in <span className="text-cyan-400">182 ms</span>
                      </div>
                      <div className="text-emerald-400">
                        ➜ Local: <span className="underline">http://localhost:5173/</span>
                      </div>
                      <div className="text-purple-300">
                        ➜ Kodra Gateway: <span className="underline">http://preview.localhost:5000/</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] text-ide-muted flex items-center justify-between mt-4">
                      <span>PTY Stream: WebSocket Active</span>
                      <span className="text-emerald-400 font-mono">0.4ms latency</span>
                    </div>
                  </div>
                )}

                {activeTab === 'preview' && (
                  <div className="h-full flex flex-col justify-between">
                    <div className="p-4 rounded-xl bg-[#0e111c] border border-white/10 text-center space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                        <Globe size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-white">Live Reverse Proxy Active</h4>
                      <p className="text-xs text-slate-400">
                        WebSockets proxy dynamic Vite HMR frames with zero subpath corruption.
                      </p>
                      <div className="p-2 rounded bg-black/40 border border-white/5 font-mono text-[10px] text-emerald-400 truncate">
                        http://preview.localhost:5000/preview/66f9a01
                      </div>
                    </div>
                    <div className="text-[11px] text-center text-ide-muted mt-2">
                      Reflects code modifications instantaneously in real-time.
                    </div>
                  </div>
                )}

                {/* Footer status */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-ide-muted">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 size={11} />
                    <span>Dual Engine Healthy</span>
                  </span>
                  <span className="font-mono">Docker Desktop 4.31</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Feature Highlights Grid */}
      <section id="features" className="py-24 px-6 border-t border-white/[0.06] bg-[#07080d]/60 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-purple-400 mb-2">
              Engineered For Power & Flow
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Everything you need for autonomous cloud engineering.
            </h3>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              From low-level Linux pseudo-terminals to multi-step recursive LLM tool calls, Kodra is built from the ground up for developer speed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-purple-500/40 hover:-translate-y-1 transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Box size={20} />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Dual-Engine Sandboxes</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dedicated Docker containers per project with CPU & memory limits, with automated fallback to host workspace isolation if Docker is offline.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-cyan-500/40 hover:-translate-y-1 transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sparkles size={20} />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Self-Healing AI Loop</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                The agent doesn't just write code — it installs packages, runs build tests, catches errors in stderr, and repairs issues automatically.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Globe size={20} />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Reverse Proxy Live Preview</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dynamic port detection probes active container ports and proxies HTTP/WebSockets with Hot Module Reloading right inside your browser window.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-pink-500/40 hover:-translate-y-1 transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Command size={20} />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Raycast Spotlight (Ctrl+K)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Fuzzy search project files, toggle Vibe Mode, spin up terminals, switch dev ports, or query Kodra AI with keyboard shortcuts.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-amber-500/40 hover:-translate-y-1 transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Headphones size={20} />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Ambient Lo-Fi Vibe Mode</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Built-in Web Audio API synthesizer generates endless relaxing lo-fi chill chord progressions with neon glow effects for deep coding focus.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-indigo-500/40 hover:-translate-y-1 transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck size={20} />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Multi-Tenant Scoping</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Strict user-scoped data isolation enforced at the API, database, and disk layers. No user can view, execute in, or modify another tenant's project.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 4-Layer Architecture Deep Dive */}
      <section id="architecture" className="py-24 px-6 border-t border-white/[0.06] bg-[#050609] relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400 mb-2">
              Rigorous Engineering
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Strict 4-Layer Clean Architecture
            </h3>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Built with zero circular dependencies and complete separation of concerns between presentation, business services, data repositories, and infrastructure adapters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Layer 1 */}
            <div className="p-5 rounded-2xl bg-[#090b12] border border-purple-500/30 flex flex-col justify-between">
              <div>
                <div className="font-mono text-[10px] text-purple-400 uppercase tracking-wider mb-1">
                  Layer 1
                </div>
                <h4 className="text-sm font-bold text-white mb-2">Presentation & Gateways</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  React 18 + Tailwind frontend, Express route controllers, WebSocket PTY gateways, and HTTP proxy gateways.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 font-mono text-[10px] text-purple-300">
                • /api/v1/* • /ws/terminal • /ws/agent
              </div>
            </div>

            {/* Layer 2 */}
            <div className="p-5 rounded-2xl bg-[#090b12] border border-cyan-500/30 flex flex-col justify-between">
              <div>
                <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider mb-1">
                  Layer 2
                </div>
                <h4 className="text-sm font-bold text-white mb-2">Business Logic Services</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ProjectService, WorkspaceService, SandboxService, PreviewService, and AgentLoopEngine handling autonomous iterations.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 font-mono text-[10px] text-cyan-300">
                • Dual-Engine • Self-Healing Loop
              </div>
            </div>

            {/* Layer 3 */}
            <div className="p-5 rounded-2xl bg-[#090b12] border border-emerald-500/30 flex flex-col justify-between">
              <div>
                <div className="font-mono text-[10px] text-emerald-400 uppercase tracking-wider mb-1">
                  Layer 3
                </div>
                <h4 className="text-sm font-bold text-white mb-2">Data Repositories</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ProjectRepository (MongoDB Mongoose models) & FileSystemRepository with canonical path traversal security defenses.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 font-mono text-[10px] text-emerald-300">
                • Path Traversal Guard • Multi-Tenant
              </div>
            </div>

            {/* Layer 4 */}
            <div className="p-5 rounded-2xl bg-[#090b12] border border-pink-500/30 flex flex-col justify-between">
              <div>
                <div className="font-mono text-[10px] text-pink-400 uppercase tracking-wider mb-1">
                  Layer 4
                </div>
                <h4 className="text-sm font-bold text-white mb-2">Infrastructure Adapters</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  DockerManager (Dockerode container lifecycle), BaseProvider (Gemini, OpenAI, Ollama), and FirebaseAuthAdapter.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 font-mono text-[10px] text-pink-300">
                • Docker Engine • Firebase Admin SDK
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Agent Engine Workflow: How It Works */}
      <section id="agent-engine" className="py-24 px-6 border-t border-white/[0.06] bg-[#07080d]/60 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-purple-400 mb-2">
              Autonomous Intelligence
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              How the Self-Healing Loop Operates
            </h3>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              No manual copy-pasting code back and forth. The agent reasons, executes in Docker, reads command output, and repairs errors autonomously.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 relative">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 font-mono text-xs font-bold flex items-center justify-center mb-4">
                01
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Prompt & Plan</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Developer provides instructions in natural language. The agent formulates a step-by-step implementation strategy.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 relative">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center mb-4">
                02
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Inspect & Write</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Agent calls <code className="text-cyan-300 font-mono">read_file</code> and <code className="text-cyan-300 font-mono">write_file</code> to inspect codebase context and inject modifications.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 relative">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 font-mono text-xs font-bold flex items-center justify-center mb-4">
                03
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Execute & Test</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Agent runs commands (<code className="text-amber-300 font-mono">npm test</code>, <code className="text-amber-300 font-mono">vite build</code>) inside the Docker sandbox with strict timeout guards.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 relative">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center mb-4">
                04
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Self-Heal & Verify</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                If the build fails, stderr is fed back into context; the agent fixes bugs autonomously and verifies working output in Live Preview.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Pricing Tiers */}
      <section id="pricing" className="py-24 px-6 border-t border-white/[0.06] bg-[#050609] relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-purple-400 mb-2">
              Transparent Pricing
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Start free. Upgrade as you scale.
            </h3>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              No hidden fees. Full access to the Web IDE, terminal, and AI pair programming out of the box.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Tier 1: Free Developer */}
            <div className="p-7 rounded-2xl bg-[#0a0c14] border border-white/10 flex flex-col justify-between">
              <div>
                <h4 className="text-base font-bold text-white">Developer</h4>
                <p className="text-xs text-ide-muted mt-1">For hobbyists and local hackers</p>
                <div className="my-5">
                  <span className="text-3xl font-extrabold text-white font-mono">$0</span>
                  <span className="text-xs text-ide-muted ml-1">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300 mb-6">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400" />
                    <span>Unlimited Local Workspaces</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400" />
                    <span>Host Emulated & Docker Sandboxes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400" />
                    <span>Monaco Editor + Xterm Terminal</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400" />
                    <span>Community AI Rate Limits</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={onLaunchDashboard}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all"
              >
                Start Coding Free
              </button>
            </div>

            {/* Tier 2: Pro (Featured) */}
            <div className="p-7 rounded-2xl bg-[#0f121e] border border-purple-500/50 shadow-2xl shadow-purple-950/40 relative flex flex-col justify-between ring-1 ring-purple-500/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                Most Popular
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Pro Creator</h4>
                <p className="text-xs text-purple-300 mt-1">For autonomous fullstack developers</p>
                <div className="my-5">
                  <span className="text-3xl font-extrabold text-white font-mono">$20</span>
                  <span className="text-xs text-ide-muted ml-1">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-200 mb-6">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-purple-400" />
                    <span>Unlimited Autonomous Loop Steps</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-purple-400" />
                    <span>Gemini 1.5 Pro & OpenAI GPT-4o</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-purple-400" />
                    <span>Dedicated High-Memory Sandboxes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-purple-400" />
                    <span>Custom Subdomain Live Preview URLs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-purple-400" />
                    <span>ZIP & GitHub Direct Sync</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={onLaunchDashboard}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-sm transition-all active:scale-95"
              >
                Upgrade to Pro
              </button>
            </div>

            {/* Tier 3: Enterprise */}
            <div className="p-7 rounded-2xl bg-[#0a0c14] border border-white/10 flex flex-col justify-between">
              <div>
                <h4 className="text-base font-bold text-white">Enterprise</h4>
                <p className="text-xs text-ide-muted mt-1">For engineering teams & organizations</p>
                <div className="my-5">
                  <span className="text-3xl font-extrabold text-white font-mono">Custom</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300 mb-6">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-cyan-400" />
                    <span>Dedicated Kubernetes Clusters</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-cyan-400" />
                    <span>Private VPC On-Premise Hosting</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-cyan-400" />
                    <span>SAML / Okta Single Sign-On</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-cyan-400" />
                    <span>99.99% Guaranteed SLA</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={onLaunchDashboard}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Interactive FAQ Section */}
      <section id="faq" className="py-24 px-6 border-t border-white/[0.06] bg-[#07080d]/60 relative">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-purple-400 mb-2">
              Frequently Asked Questions
            </h2>
            <h3 className="text-3xl font-extrabold text-white tracking-tight">
              Got Questions? We've Got Answers.
            </h3>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'Do I need Docker installed on my computer to run Kodra?',
                a: 'No! Kodra features a Dual-Engine architecture. If Docker Desktop is available, Kodra automatically spins up isolated Linux containers. If Docker is offline or unavailable, Kodra seamlessly runs in Host Emulated mode with strict canonical path traversal defenses.'
              },
              {
                q: 'How does the Autonomous Self-Healing Agent loop work?',
                a: 'When you assign a task to Kodra, the agent invokes workspace tools (reading files, writing code, running commands). If a build error or test failure occurs, the terminal output is fed back into the model context. The agent repairs the errors iteratively until the project compiles cleanly.'
              },
              {
                q: 'What LLM AI providers are supported?',
                a: 'Kodra supports Google Gemini (Gemini 1.5 Pro & Flash), OpenAI (GPT-4o), and local Ollama instances (e.g. Llama 3) via a plug-and-play BaseProvider architecture.'
              },
              {
                q: 'Can I export my code or download as a ZIP archive?',
                a: 'Yes! From the unified Project Dashboard, you can download any workspace as a clean streaming ZIP archive (with node_modules and .git automatically omitted) or clone projects with a single click.'
              },
              {
                q: 'How is user data isolation and multi-tenant security enforced?',
                a: 'Kodra enforces authentication tokens across all REST endpoints and WebSockets. Projects are strictly bound to user UIDs in MongoDB and isolated in separate physical directory workspaces.'
              }
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/[0.08] bg-[#0a0c14] overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-xs font-semibold text-white hover:text-purple-300 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={14}
                    className={`text-ide-muted transition-transform duration-200 ${
                      openFaq === idx ? 'rotate-180 text-purple-400' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-3 animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Final Call to Action Banner */}
      <section className="py-20 px-6 border-t border-white/[0.08] bg-gradient-to-b from-[#070912] to-[#040508] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Ready to Experience Autonomous Cloud Coding?
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed">
            Launch your first workspace in seconds with React, Node.js, or Vanilla JS. No configuration required.
          </p>
          <button
            onClick={onLaunchDashboard}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white text-sm font-semibold shadow-glow-purple transition-all active:scale-95"
          >
            <span>Launch Studio Now</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="py-8 px-6 border-t border-white/[0.06] bg-[#050608] text-xs text-ide-muted">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-purple-600 flex items-center justify-center text-white">
              <Code2 size={12} />
            </div>
            <span className="font-semibold text-white">KODRA</span>
            <span className="text-[11px]">© 2026 Kodra Autonomous Cloud IDE. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational</span>
            </span>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors">
              Back to Top ↑
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
