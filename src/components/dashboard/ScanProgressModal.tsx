import React, { useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Terminal, X, RefreshCw, Lightbulb, ShieldAlert } from 'lucide-react';
import type { ScanLogEntry, ApiErrorDetail } from '../../types/index.js';

interface ScanProgressModalProps {
  isOpen: boolean;
  targetUrl: string;
  progressPercent: number;
  stepMessage: string;
  logs: ScanLogEntry[];
  isComplete: boolean;
  errorMessage?: string;
  errorDetail?: ApiErrorDetail;
  onCancel?: () => void;
  onRetry?: () => void;
  onViewResults: () => void;
}

export const ScanProgressModal: React.FC<ScanProgressModalProps> = ({
  isOpen,
  targetUrl,
  progressPercent,
  stepMessage,
  logs,
  isComplete,
  errorMessage,
  errorDetail,
  onCancel,
  onRetry,
  onViewResults,
}) => {
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!isOpen) return null;

  const hasError = !!(errorMessage || errorDetail);
  const displayError = errorDetail?.userFriendlyMessage || errorMessage || 'An unexpected error occurred during the audit.';
  const errorCode = errorDetail?.code;
  const suggestion = errorDetail?.suggestion;

  const steps = [
    { label: 'SSRF Security Validation', threshold: 15 },
    { label: 'DOM Extraction & Crawling', threshold: 50 },
    { label: 'Deterministic axe-core Audit', threshold: 75 },
    { label: 'SEO, Perf & Security Scoring', threshold: 90 },
    { label: 'Report Finalization', threshold: 100 },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                hasError
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  : isComplete
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-teal-500/15 border-teal-500/30 text-teal-400'
              }`}
            >
              {hasError ? (
                <AlertTriangle className="w-5 h-5 text-rose-400" aria-hidden="true" />
              ) : isComplete ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2 id="progress-title" className="text-base font-bold text-slate-100 flex items-center gap-2">
                {hasError
                  ? 'Audit Interrupted'
                  : isComplete
                  ? 'Audit Completed'
                  : 'Auditing Website...'}
                {errorCode && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {errorCode}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-md">{targetUrl}</p>
            </div>
          </div>

          {onCancel && !isComplete && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close dialog"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-200">{stepMessage}</span>
              <span className={`font-bold ${hasError ? 'text-rose-400' : 'text-emerald-400'}`}>
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ease-out ${
                  hasError
                    ? 'bg-rose-500'
                    : 'bg-gradient-to-r from-teal-500 to-emerald-400'
                }`}
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              />
            </div>
          </div>

          {/* Stepper pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px]">
            {steps.map((s, idx) => {
              const isPassed = progressPercent >= s.threshold;
              const isCurrent =
                progressPercent < s.threshold &&
                (idx === 0 || progressPercent >= steps[idx - 1].threshold);

              let pillClass = 'bg-slate-950/40 border-slate-800 text-slate-500';
              if (hasError && isCurrent) {
                pillClass = 'bg-rose-500/15 border-rose-500/30 text-rose-300 font-bold';
              } else if (isPassed) {
                pillClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium';
              } else if (isCurrent) {
                pillClass = 'bg-sky-500/10 border-sky-500/30 text-sky-300 font-bold animate-pulse';
              }

              return (
                <div key={s.label} className={`p-1.5 rounded-lg border text-center transition-all ${pillClass}`}>
                  <span className="block truncate text-[10px] sm:text-[11px]">{s.label}</span>
                </div>
              );
            })}
          </div>

          {/* Structured Error Panel */}
          {hasError && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 space-y-2.5">
              <div className="flex items-start gap-2.5 text-rose-200 text-xs">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <div className="font-semibold text-rose-300">{displayError}</div>
                  {errorDetail?.details && (
                    <div className="font-mono text-[11px] text-rose-400/80 break-words line-clamp-2">
                      {errorDetail.details}
                    </div>
                  )}
                </div>
              </div>

              {suggestion && (
                <div className="pt-2 border-t border-rose-500/20 flex items-start gap-2 text-xs text-amber-200/90">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <span className="font-semibold text-amber-300">Suggestion: </span>
                    {suggestion}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Scanner Terminal Stream */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                Live Engine Execution Logs
              </span>
              <span>{logs.length} events</span>
            </div>

            <div className="h-36 rounded-xl bg-slate-950 border border-slate-800 p-3 overflow-y-auto font-mono text-xs space-y-1.5 text-slate-300">
              {logs.map((log, index) => {
                const typeColors = {
                  info: 'text-slate-400',
                  success: 'text-emerald-400 font-semibold',
                  warning: 'text-amber-400',
                  error: 'text-rose-400 font-bold',
                }[log.type || 'info'];

                return (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-[10px] text-slate-600 shrink-0 select-none">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                    </span>
                    <span className={`break-all ${typeColors}`}>{log.message}</span>
                  </div>
                );
              })}
              <div ref={terminalBottomRef} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-950/40">
          <div>
            {hasError && (
              <span className="text-xs text-slate-400">
                Audit stopped safely. No partial data was corrupted.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {isComplete && !hasError ? (
              <button
                type="button"
                onClick={onViewResults}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                View Full Audit Report →
              </button>
            ) : hasError ? (
              <>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-semibold transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    Retry Scan
                  </button>
                )}
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  Dismiss
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-400 italic">
                Inspecting DOM elements & WCAG compliance...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
