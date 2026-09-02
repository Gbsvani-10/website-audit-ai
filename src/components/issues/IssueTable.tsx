import React, { useState, useMemo } from 'react';
import type { AccessibilityIssue, IssueSeverity } from '../../types/index.js';
import { SeverityBadge } from '../common/SeverityBadge.js';
import {
  Search,
  Filter,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';

interface IssueTableProps {
  issues: AccessibilityIssue[];
  onSelectIssue: (issue: AccessibilityIssue) => void;
  onOpenAIFix: (issue: AccessibilityIssue) => void;
  onStatusChange?: (issueId: string, status: 'open' | 'fixed' | 'ignored') => void;
}

export const IssueTable: React.FC<IssueTableProps> = ({
  issues,
  onSelectIssue,
  onOpenAIFix,
  onStatusChange,
}) => {
  const [search, setSearch] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedWcag, setSelectedWcag] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesText =
          issue.title.toLowerCase().includes(q) ||
          issue.ruleId.toLowerCase().includes(q) ||
          issue.description.toLowerCase().includes(q) ||
          issue.wcagRef.toLowerCase().includes(q);
        if (!matchesText) return false;
      }

      // Severity filter
      if (selectedSeverity !== 'all' && issue.severity !== selectedSeverity) {
        return false;
      }

      // WCAG level filter
      if (selectedWcag !== 'all' && issue.wcagLevel !== selectedWcag) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && issue.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [issues, search, selectedSeverity, selectedWcag, selectedStatus]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by rule ID, WCAG clause, or keyword..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Severity */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            aria-label="Filter by Severity"
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="serious">Serious</option>
            <option value="moderate">Moderate</option>
            <option value="minor">Minor</option>
          </select>

          {/* WCAG Level */}
          <select
            value={selectedWcag}
            onChange={(e) => setSelectedWcag(e.target.value)}
            aria-label="Filter by WCAG Level"
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All WCAG Levels</option>
            <option value="A">Level A</option>
            <option value="AA">Level AA</option>
            <option value="AAA">Level AAA</option>
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter by Status"
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="fixed">Fixed</option>
            <option value="ignored">Ignored</option>
          </select>

          {(search || selectedSeverity !== 'all' || selectedWcag !== 'all' || selectedStatus !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedSeverity('all');
                setSelectedWcag('all');
                setSelectedStatus('all');
              }}
              className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Issues Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              <tr>
                <th scope="col" className="px-4 py-3">Severity</th>
                <th scope="col" className="px-4 py-3">Violation & Rule</th>
                <th scope="col" className="px-4 py-3">WCAG Reference</th>
                <th scope="col" className="px-4 py-3 text-center">Occurrences</th>
                <th scope="col" className="px-4 py-3 text-center">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Remediation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No accessibility issues match the active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => (
                  <tr
                    key={issue.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectIssue(issue)}
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <SeverityBadge severity={issue.severity} size="sm" />
                    </td>

                    <td className="px-4 py-3.5 max-w-sm">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[11px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          {issue.ruleId}
                        </span>
                        <span className="font-semibold text-slate-100 group-hover:text-emerald-300 transition-colors">
                          {issue.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{issue.description}</p>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-950 text-[11px] font-medium text-slate-300 border border-slate-800">
                        {issue.wcagRef}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <span className="font-mono font-bold text-slate-200">
                        {issue.occurrencesCount}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                          issue.status === 'fixed'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : issue.status === 'ignored'
                            ? 'bg-slate-700/50 text-slate-400'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {issue.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenAIFix(issue)}
                          className="px-2.5 py-1 rounded-md bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-400" aria-hidden="true" />
                          <span>AI Fix</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectIssue(issue)}
                          aria-label={`View details for ${issue.title}`}
                          className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing <strong>{filteredIssues.length}</strong> of <strong>{issues.length}</strong> issue rules
          </span>
          <span className="text-[11px] italic">
            Click any row to inspect affected DOM selectors and generate code fixes.
          </span>
        </div>
      </div>
    </div>
  );
};
