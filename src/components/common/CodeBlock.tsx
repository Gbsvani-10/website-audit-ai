import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  id?: string;
  code: string;
  language?: string;
  title?: string;
  badge?: string;
  badgeColor?: 'emerald' | 'rose' | 'amber' | 'slate';
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  id,
  code,
  language = 'html',
  title,
  badge,
  badgeColor = 'emerald',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const badgeStyles = {
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    rose: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    slate: 'bg-slate-700/50 text-slate-300 border-slate-600/30',
  }[badgeColor];

  return (
    <div id={id} className="relative rounded-lg border border-slate-800 bg-slate-950 overflow-hidden text-xs">
      {(title || badge) && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 text-slate-400">
          <div className="flex items-center gap-2">
            {badge && (
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${badgeStyles}`}>
                {badge}
              </span>
            )}
            {title && <span className="font-mono text-slate-300 font-medium">{title}</span>}
          </div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">{language}</span>
        </div>
      )}

      <div className="relative p-3.5 overflow-x-auto font-mono leading-relaxed text-slate-200">
        <pre className="selection:bg-emerald-500/30 selection:text-emerald-200">
          <code>{code}</code>
        </pre>

        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Code copied to clipboard' : 'Copy code to clipboard'}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center gap-1 shadow-sm"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span className="text-[10px] text-emerald-400 font-medium pr-0.5">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="text-[10px] font-medium pr-0.5">Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
