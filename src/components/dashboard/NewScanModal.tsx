import React, { useState } from 'react';
import { X, Play, ShieldAlert, Globe, Zap, Search, Layers, Sparkles } from 'lucide-react';
import type { ScanDepth } from '../../types/index.js';

interface NewScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartScan: (url: string, depth: ScanDepth) => void;
  isScanning: boolean;
}

export const NewScanModal: React.FC<NewScanModalProps> = ({
  isOpen,
  onClose,
  onStartScan,
  isScanning,
}) => {
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState<ScanDepth>('standard');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please provide a website URL.');
      return;
    }

    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      if (!parsed.hostname.includes('.')) {
        setError('Please enter a valid fully qualified domain name.');
        return;
      }
      onStartScan(parsed.toString(), depth);
    } catch {
      setError('Invalid URL syntax. Please enter e.g. "https://example.com"');
    }
  };

  const loadSampleUrl = (sample: string) => {
    setUrl(sample);
    setError(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-bold text-slate-100">
                Launch AccessAudit AI Scan
              </h2>
              <p className="text-xs text-slate-400">Automated accessibility & quality inspection</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Target URL */}
          <div>
            <label htmlFor="scan-url-input" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Target Website URL
            </label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
              <input
                id="scan-url-input"
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="https://example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-rose-400 mt-1.5 font-medium">{error}</p>}

            {/* Quick Demo URLs */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
              <span className="text-[11px]">Sample domains:</span>
              <button
                type="button"
                onClick={() => loadSampleUrl('https://acme-saas.com')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px]"
              >
                acme-saas.com
              </button>
              <button
                type="button"
                onClick={() => loadSampleUrl('https://w3.org/WAI')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px]"
              >
                w3.org/WAI
              </button>
              <button
                type="button"
                onClick={() => loadSampleUrl('https://en.wikipedia.org/wiki/Web_accessibility')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px]"
              >
                wikipedia.org
              </button>
            </div>
          </div>

          {/* Scan Depth Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Scan Crawl Depth
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'quick', label: 'Quick Scan', desc: '1 Root Page (~3s)' },
                { id: 'standard', label: 'Standard', desc: 'Up to 10 Pages (~15s)' },
                { id: 'deep', label: 'Deep Audit', desc: 'Up to 30 Pages (~45s)' },
              ].map((option) => {
                const isSelected = depth === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDepth(option.id as ScanDepth)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span className="block text-xs font-bold">{option.label}</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">{option.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audit Checks Covered */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs text-slate-300">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Included Audit Engines:
            </span>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> WCAG 2.1 AA (axe-core)
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Technical SEO Signals
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Core Web Vitals (TTFB)
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Security Headers & HSTS
              </span>
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300">
            <ShieldAlert className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" aria-hidden="true" />
            <p className="text-[11px] leading-relaxed">
              SSRF Protected: Private IPs, localhost, AWS metadata, and internal subnets are automatically blocked.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isScanning}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span>{isScanning ? 'Launching...' : 'Start Audit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
