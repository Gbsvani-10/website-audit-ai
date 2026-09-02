import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Sparkles,
  Zap,
  Globe,
  CheckCircle2,
  Lock,
  ArrowRight,
  Play,
  Gauge,
  Sliders,
} from 'lucide-react';
import type { ScanDepth } from '../../types/index.js';

interface LandingPageProps {
  onStartScan: (url: string, depth: ScanDepth) => void;
  onExploreDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartScan,
  onExploreDemo,
}) => {
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState<ScanDepth>('standard');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please enter a target URL to audit.');
      return;
    }
    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      onStartScan(parsed.toString(), depth);
    } catch {
      setError('Invalid URL. Example: https://example.com');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-8 sm:py-12 space-y-12">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-sm">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          <span>WCAG 2.1 Conformance & Security Intelligence</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight">
          Deterministic accessibility auditing powered by <span className="text-emerald-400">AI remediation</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
          Scan any website for WCAG violations, technical SEO health, core performance timings, and web security headers. Generate verified code fixes in HTML, React, and Tailwind.
        </p>
      </div>

      {/* Main Scanner Input Box */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden="true" />
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter website URL (e.g. https://acme-saas.com)"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all shrink-0"
            >
              <Play className="w-4 h-4 fill-current" aria-hidden="true" />
              <span>Audit Website</span>
            </button>
          </div>

          {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

          {/* Depth Options & Demo Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 text-xs">
            {/* Depth Radio Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Crawl Depth:</span>
              {(['quick', 'standard', 'deep'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDepth(d)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                    depth === d
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {d === 'quick' ? 'Quick (1p)' : d === 'standard' ? 'Standard (10p)' : 'Deep (30p)'}
                </button>
              ))}
            </div>

            {/* Instant Demo Launcher */}
            <button
              type="button"
              onClick={onExploreDemo}
              className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 flex items-center gap-1.5 self-start sm:self-auto hover:underline"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
              <span>Explore Pre-Loaded Demo Audit (acme-saas.com) →</span>
            </button>
          </div>
        </form>
      </div>

      {/* 4 Core Pillars Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <h3 className="font-bold text-sm text-slate-100">WCAG 2.1 Conformance</h3>
          <p className="text-slate-400 leading-relaxed">
            Deterministic axe-core automated detection for alt tags, button names, color contrast, and heading order.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 w-fit">
            <Gauge className="w-5 h-5" aria-hidden="true" />
          </div>
          <h3 className="font-bold text-sm text-slate-100">Performance & TTFB</h3>
          <p className="text-slate-400 leading-relaxed">
            Measures server response latency, HTML document weight, DOM element count, and render-blocking scripts.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit">
            <Search className="w-5 h-5" aria-hidden="true" />
          </div>
          <h3 className="font-bold text-sm text-slate-100">Technical SEO Health</h3>
          <p className="text-slate-400 leading-relaxed">
            Inspects title tags, meta descriptions, Open Graph preview tags, H1 hierarchies, and canonical URLs.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 w-fit">
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>
          <h3 className="font-bold text-sm text-slate-100">Web Security Headers</h3>
          <p className="text-slate-400 leading-relaxed">
            Audits TLS encryption, HSTS enforcement, Content Security Policy (CSP), and X-Content-Type-Options.
          </p>
        </div>
      </div>
    </div>
  );
};
