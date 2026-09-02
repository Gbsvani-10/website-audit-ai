import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Plus,
  Moon,
  Sun,
  Sparkles,
  ExternalLink,
  Globe,
  Bell,
  HelpCircle,
} from 'lucide-react';
import type { WebsiteProfile } from '../../types/index.js';

interface NavbarProps {
  currentWebsite?: WebsiteProfile;
  websites: WebsiteProfile[];
  onSelectWebsite: (siteId: string) => void;
  onOpenNewScanModal: () => void;
  onOpenAIAssistant: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isDemoMode?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentWebsite,
  websites,
  onSelectWebsite,
  onOpenNewScanModal,
  onOpenAIAssistant,
  theme,
  onToggleTheme,
  isDemoMode,
}) => {
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);

  return (
    <header
      id="app-navbar"
      className="sticky top-0 z-30 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-6 flex items-center justify-between"
    >
      {/* Brand & Website Selector */}
      <div className="flex items-center gap-4 lg:gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-500/20">
            <ShieldCheck className="w-5 h-5 text-slate-950 stroke-[2.5]" aria-hidden="true" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-100 flex items-center gap-1.5">
              AccessAudit<span className="text-emerald-400">AI</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium block -mt-1">
              WCAG 2.1 & Security Intelligence
            </span>
          </div>
        </div>

        {/* Active Website Picker */}
        {websites.length > 0 && (
          <div className="relative hidden sm:block">
            <button
              type="button"
              id="website-selector-btn"
              onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 text-xs font-medium text-slate-200 transition-all"
              aria-haspopup="listbox"
              aria-expanded={siteDropdownOpen}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span className="max-w-[140px] truncate">{currentWebsite?.domain || 'Select Website'}</span>
              <span className="text-slate-400 text-[10px]">▼</span>
            </button>

            {siteDropdownOpen && (
              <div
                role="listbox"
                className="absolute left-0 mt-1.5 w-56 rounded-xl bg-slate-900 border border-slate-700 shadow-xl py-1 z-40 text-xs animate-in fade-in"
              >
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                  Monitored Domains
                </div>
                {websites.map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    role="option"
                    aria-selected={site.id === currentWebsite?.id}
                    onClick={() => {
                      onSelectWebsite(site.id);
                      setSiteDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between transition-colors ${
                      site.id === currentWebsite?.id ? 'text-emerald-400 bg-emerald-500/10 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <span className="truncate">{site.domain}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {site.latestScore}/100
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isDemoMode && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
            Demo Data
          </span>
        )}
      </div>

      {/* Action items */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Ask AI Assistant */}
        <button
          type="button"
          id="nav-ai-assistant-btn"
          onClick={onOpenAIAssistant}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
          <span className="hidden md:inline">Ask AI Assistant</span>
          <span className="md:hidden">AI</span>
        </button>

        {/* Start New Audit */}
        <button
          type="button"
          id="nav-new-scan-btn"
          onClick={onOpenNewScanModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-sm shadow-emerald-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
          <span>New Audit</span>
        </button>

        {/* Theme switch */}
        <button
          type="button"
          id="theme-toggle-btn"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 text-slate-300 hover:text-slate-100 transition-all"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-300" aria-hidden="true" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-300" aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
};
