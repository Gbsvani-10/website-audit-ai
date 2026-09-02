import React from 'react';
import type { AccessibilityIssue } from '../../types/index.js';
import { SeverityBadge } from '../common/SeverityBadge.js';
import { Sparkles, ArrowRight, ExternalLink } from 'lucide-react';

interface TopIssuesListProps {
  issues: AccessibilityIssue[];
  onSelectIssue: (issue: AccessibilityIssue) => void;
  onOpenAIFix: (issue: AccessibilityIssue) => void;
  onViewAllIssues: () => void;
}

export const TopIssuesList: React.FC<TopIssuesListProps> = ({
  issues,
  onSelectIssue,
  onOpenAIFix,
  onViewAllIssues,
}) => {
  // Sort by critical first, then serious
  const sorted = [...issues].sort((a, b) => {
    const weight = { critical: 4, serious: 3, moderate: 2, minor: 1 };
    return (weight[b.severity] || 0) - (weight[a.severity] || 0);
  });

  const top5 = sorted.slice(0, 5);

  return (
    <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>High-Impact Remediation Priorities</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
              Top {top5.length}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Fixing these highest-severity issues yields the largest compliance improvement.
          </p>
        </div>

        <button
          type="button"
          onClick={onViewAllIssues}
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
        >
          <span>View all ({issues.length})</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {top5.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/50 rounded-lg border border-slate-800">
          🎉 No critical or serious accessibility violations detected!
        </div>
      ) : (
        <div className="space-y-2.5">
          {top5.map((issue, index) => (
            <div
              key={issue.id}
              className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={issue.severity} size="sm" />
                    <span className="text-xs font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {issue.ruleId}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">{issue.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                    {issue.description}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
                    <span>{issue.occurrencesCount} occurrence{issue.occurrencesCount > 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span className="text-slate-400">{issue.wcagRef}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenAIFix(issue)}
                  className="px-2.5 py-1 rounded-md bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" aria-hidden="true" />
                  <span>AI Fix</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectIssue(issue)}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
                >
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
