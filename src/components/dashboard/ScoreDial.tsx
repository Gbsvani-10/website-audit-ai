import React from 'react';
import type { AuditScores } from '../../types/index.js';
import { ShieldCheck, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

interface ScoreDialProps {
  scores: AuditScores;
  domain: string;
  scanDate: string;
  onViewIssues: () => void;
}

export const ScoreDial: React.FC<ScoreDialProps> = ({
  scores,
  domain,
  scanDate,
  onViewIssues,
}) => {
  const overall = scores.overallQuality;
  const circumference = 2 * Math.PI * 68; // radius 68
  const strokeOffset = circumference - (overall / 100) * circumference;

  const getScoreRating = (val: number) => {
    if (val >= 90) return { label: 'Excellent', color: 'text-emerald-400', stroke: '#10b981', bg: 'bg-emerald-500/10' };
    if (val >= 75) return { label: 'Good', color: 'text-sky-400', stroke: '#38bdf8', bg: 'bg-sky-500/10' };
    if (val >= 50) return { label: 'Needs Remediation', color: 'text-amber-400', stroke: '#fbbf24', bg: 'bg-amber-500/10' };
    return { label: 'Critical Action Required', color: 'text-rose-400', stroke: '#f43f5e', bg: 'bg-rose-500/10' };
  };

  const rating = getScoreRating(overall);

  return (
    <div
      id="main-score-card"
      className="relative p-6 bg-gradient-to-br from-slate-900 to-slate-900/90 border border-slate-800 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-6"
    >
      {/* Left: Overall Quality Dial */}
      <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
        <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
          <svg className="w-40 h-40 -rotate-90 transform" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r="68"
              className="stroke-slate-800"
              strokeWidth="12"
              fill="transparent"
            />
            <circle
              cx="80"
              cy="80"
              r="68"
              stroke={rating.stroke}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold text-slate-100 tracking-tight leading-none">
              {overall}
            </span>
            <span className="text-xs text-slate-400 font-semibold mt-1">/ 100</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${rating.color}`}>
              {rating.label}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Target Domain
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mt-0.5 tracking-tight">{domain}</h2>
          <p className="text-xs text-slate-400 mt-1">
            Audited on {new Date(scanDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
            {new Date(scanDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              AccessAudit Score: <strong className="text-slate-100">{scores.accessibility}/100</strong>
            </span>
            <button
              type="button"
              onClick={onViewIssues}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline inline-flex items-center gap-1"
            >
              Explore {scores.breakdown.critical + scores.breakdown.serious + scores.breakdown.moderate + scores.breakdown.minor} issues →
            </button>
          </div>
        </div>
      </div>

      {/* Right: Issue Severity Distribution */}
      <div className="w-full md:w-auto bg-slate-950/70 border border-slate-800 p-4 rounded-xl shrink-0">
        <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3 text-center sm:text-left">
          Detected Violations by Severity
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
            <span className="block text-xl font-bold text-rose-400">{scores.breakdown.critical}</span>
            <span className="text-[11px] font-semibold text-rose-300/80">Critical</span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
            <span className="block text-xl font-bold text-amber-400">{scores.breakdown.serious}</span>
            <span className="text-[11px] font-semibold text-amber-300/80">Serious</span>
          </div>
          <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-center">
            <span className="block text-xl font-bold text-sky-400">{scores.breakdown.moderate}</span>
            <span className="text-[11px] font-semibold text-sky-300/80">Moderate</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-center">
            <span className="block text-xl font-bold text-slate-300">{scores.breakdown.minor}</span>
            <span className="text-[11px] font-semibold text-slate-400">Minor</span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            Passed checks: <strong className="text-slate-200">{scores.breakdown.passedChecks}</strong>
          </span>
          <span className="text-[11px] italic text-slate-500">
            *Manual testing also required
          </span>
        </div>
      </div>
    </div>
  );
};
