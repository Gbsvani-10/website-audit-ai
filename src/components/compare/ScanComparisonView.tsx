import React, { useState } from 'react';
import type { FullScanReport, AccessibilityIssue } from '../../types/index.js';
import { SeverityBadge } from '../common/SeverityBadge.js';
import {
  GitCompare,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ScanComparisonViewProps {
  scans: FullScanReport[];
  onOpenIssue: (issue: AccessibilityIssue) => void;
}

export const ScanComparisonView: React.FC<ScanComparisonViewProps> = ({
  scans,
  onOpenIssue,
}) => {
  const completedScans = scans.filter((s) => s.status === 'completed' && s.scores);
  const [scanAId, setScanAId] = useState<string>(completedScans[1]?.id || completedScans[0]?.id || '');
  const [scanBId, setScanBId] = useState<string>(completedScans[0]?.id || '');

  const scanA = completedScans.find((s) => s.id === scanAId) || completedScans[1] || completedScans[0];
  const scanB = completedScans.find((s) => s.id === scanBId) || completedScans[0];

  if (!scanA || !scanB || completedScans.length < 2) {
    return (
      <div className="p-8 text-center rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-400">
        <GitCompare className="w-10 h-10 mx-auto text-slate-600 mb-3" aria-hidden="true" />
        <h3 className="text-base font-bold text-slate-200">Insufficient Scans to Compare</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          You need at least two completed scans of a website to perform a side-by-side diff.
        </p>
      </div>
    );
  }

  const scoreDelta = (scanB.scores?.overallQuality || 0) - (scanA.scores?.overallQuality || 0);
  const a11yDelta = (scanB.scores?.accessibility || 0) - (scanA.scores?.accessibility || 0);

  // Compute issue diffs
  const rulesA = new Map((scanA.issues || []).map((i) => [i.ruleId, i]));
  const rulesB = new Map((scanB.issues || []).map((i) => [i.ruleId, i]));

  const fixedIssues = (scanA.issues || []).filter((i) => !rulesB.has(i.ruleId));
  const newIssues = (scanB.issues || []).filter((i) => !rulesA.has(i.ruleId));
  const recurringIssues = (scanB.issues || []).filter((i) => rulesA.has(i.ruleId));

  return (
    <div className="space-y-6">
      {/* Selector Header */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <span>Side-by-Side Audit Comparison</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare regression vs remediation progress across audit cycles.
          </p>
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Baseline (Old):</span>
            <select
              value={scanAId}
              onChange={(e) => setScanAId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.domain} — {new Date(s.createdAt).toLocaleDateString()} (Score: {s.scores.overallQuality})
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-500 hidden sm:block" aria-hidden="true" />

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Current (New):</span>
            <select
              value={scanBId}
              onChange={(e) => setScanBId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.domain} — {new Date(s.createdAt).toLocaleDateString()} (Score: {s.scores.overallQuality})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Delta Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Overall Quality Delta */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Quality Score Delta
          </span>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-3xl font-extrabold text-slate-100">{scanB.scores.overallQuality}</span>
            <span
              className={`text-sm font-bold flex items-center gap-1 ${
                scoreDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {scoreDelta >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} pts
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Baseline was {scanA.scores.overallQuality}/100
          </span>
        </div>

        {/* Accessibility Delta */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            AccessAudit (WCAG) Delta
          </span>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-3xl font-extrabold text-slate-100">{scanB.scores.accessibility}</span>
            <span
              className={`text-sm font-bold flex items-center gap-1 ${
                a11yDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {a11yDelta >= 0 ? `+${a11yDelta}` : a11yDelta} pts
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Baseline was {scanA.scores.accessibility}/100
          </span>
        </div>

        {/* Fixed Violations Count */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Remediated Rules
          </span>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-3xl font-extrabold text-emerald-400">{fixedIssues.length}</span>
            <span className="text-xs text-slate-400 font-medium">resolved violations</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {newIssues.length} newly introduced issues
          </span>
        </div>
      </div>

      {/* Diffs Breakdown Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fixed Issues (Green) */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Resolved Violations ({fixedIssues.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400">Fixed since baseline</span>
          </div>

          {fixedIssues.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-lg">
              No issues marked resolved between these two scans.
            </p>
          ) : (
            <div className="space-y-2">
              {fixedIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between text-xs"
                >
                  <div className="pr-3">
                    <span className="font-mono text-[11px] text-emerald-400 font-semibold block">
                      {issue.ruleId}
                    </span>
                    <span className="text-slate-200 font-medium">{issue.title}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                    RESOLVED
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Violations (Red) */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" aria-hidden="true" />
              <span>New Violations Detected ({newIssues.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400">Regressions in latest scan</span>
          </div>

          {newIssues.length === 0 ? (
            <p className="p-6 text-center text-xs text-emerald-400 bg-slate-950/40 rounded-lg">
              🎉 Zero regression! No new accessibility violations were introduced.
            </p>
          ) : (
            <div className="space-y-2">
              {newIssues.map((issue) => (
                <div
                  key={issue.id}
                  onClick={() => onOpenIssue(issue)}
                  className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 hover:border-rose-500/40 cursor-pointer transition-colors flex items-center justify-between text-xs"
                >
                  <div className="pr-3">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={issue.severity} size="sm" />
                      <span className="font-mono text-[11px] text-slate-300 font-semibold">
                        {issue.ruleId}
                      </span>
                    </div>
                    <span className="text-slate-200 font-medium block mt-1">{issue.title}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                    NEW
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
