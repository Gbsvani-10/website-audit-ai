import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Check,
  Copy,
  ExternalLink,
  Code,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  CheckSquare,
} from 'lucide-react';
import type { AccessibilityIssue, RemediationSuggestion } from '../../types/index.js';
import { SeverityBadge } from '../common/SeverityBadge.js';
import { CodeBlock } from '../common/CodeBlock.js';

interface IssueDetailModalProps {
  issue: AccessibilityIssue | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (issueId: string, newStatus: 'open' | 'fixed' | 'ignored') => void;
  onAskAIAssistant?: (question: string, issue: AccessibilityIssue) => void;
}

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({
  issue,
  isOpen,
  onClose,
  onStatusChange,
  onAskAIAssistant,
}) => {
  const [activeTab, setActiveTab] = useState<'remediation' | 'elements' | 'guidance'>('remediation');
  const [framework, setFramework] = useState<'html' | 'react' | 'tailwind'>('html');
  const [loadingAi, setLoadingAi] = useState(false);
  const [remediation, setRemediation] = useState<RemediationSuggestion | null>(null);
  const [explanation, setExplanation] = useState<any>(null);

  // Sync state when issue opens
  React.useEffect(() => {
    if (issue) {
      setRemediation(issue.aiRemediation || null);
      setExplanation(issue.aiExplanation || null);
      if (!issue.aiRemediation) {
        generateAiFix('html');
      }
    }
  }, [issue]);

  if (!isOpen || !issue) return null;

  const generateAiFix = async (selectedFramework: 'html' | 'react' | 'tailwind') => {
    setFramework(selectedFramework);
    setLoadingAi(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}/ai-fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framework: selectedFramework, issueData: issue }),
      });
      const data = await res.json();
      if (data.remediation) {
        setRemediation(data.remediation);
      }
    } catch (err) {
      console.error('Failed to load AI fix:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const generateAiExplanation = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}/ai-explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueData: issue }),
      });
      const data = await res.json();
      if (data.explanation) {
        setExplanation(data.explanation);
      }
    } catch (err) {
      console.error('Failed to load AI explanation:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="issue-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-3xl max-h-[92vh] rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between bg-slate-950/40">
          <div className="space-y-1.5 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={issue.severity} size="sm" />
              <span className="font-mono text-xs text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {issue.ruleId}
              </span>
              <span className="text-xs text-slate-400">{issue.wcagRef}</span>
            </div>
            <h2 id="issue-modal-title" className="text-lg font-bold text-slate-100 leading-snug">
              {issue.title}
            </h2>
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

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 flex items-center gap-6 bg-slate-900 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('remediation')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'remediation'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>AI Remediation & Code Fix</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('elements')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'elements'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Affected Elements ({issue.affectedElements.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guidance')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'guidance'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>WCAG Understanding</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {activeTab === 'remediation' && (
            <div className="space-y-5">
              {/* Framework Switcher & AI Trigger */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1.5">
                    Target Format:
                  </span>
                  {(['html', 'react', 'tailwind'] as const).map((fw) => (
                    <button
                      key={fw}
                      type="button"
                      onClick={() => generateAiFix(fw)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                        framework === fw
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {fw === 'html' ? 'Plain HTML' : fw === 'react' ? 'React JSX' : 'Tailwind'}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => generateAiFix(framework)}
                  disabled={loadingAi}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
                  <span>{loadingAi ? 'Synthesizing...' : 'Regenerate with Gemini'}</span>
                </button>
              </div>

              {/* Before & After Comparison */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                  Exact Remediation Fix
                </h4>

                {remediation ? (
                  <div className="space-y-3">
                    {/* Before snippet */}
                    <div>
                      <span className="text-[11px] font-mono text-rose-400 block mb-1">
                        ❌ Non-Conformant (Original Snippet):
                      </span>
                      <CodeBlock
                        code={remediation.beforeHtml}
                        language={remediation.language || framework}
                        badge="Before (Violation)"
                        badgeColor="rose"
                      />
                    </div>

                    {/* After snippet */}
                    <div>
                      <span className="text-[11px] font-mono text-emerald-400 block mb-1">
                        ✅ Accessible & WCAG Compliant (Remediated):
                      </span>
                      <CodeBlock
                        code={remediation.afterHtml}
                        language={remediation.language || framework}
                        badge="After (Compliant)"
                        badgeColor="emerald"
                      />
                    </div>

                    {/* Explanation */}
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-1">
                      <span className="font-bold block text-xs">Remediation Rationale:</span>
                      <p className="text-xs leading-relaxed text-emerald-200/90">
                        {remediation.explanation}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    Loading AI remediation suggestions...
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'elements' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                This rule failed on <strong>{issue.affectedElements.length}</strong> DOM element{issue.affectedElements.length > 1 ? 's' : ''} on the website:
              </p>

              {issue.affectedElements.map((elem, idx) => (
                <div
                  key={elem.id || idx}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-300">
                      Element #{idx + 1}
                    </span>
                    {elem.pageUrl && (
                      <span className="text-[11px] text-slate-500 truncate max-w-xs">
                        {elem.pageUrl}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] uppercase font-bold text-slate-500 block mb-0.5">
                      CSS Selector Path:
                    </span>
                    <code className="block p-2 rounded bg-slate-900 text-sky-300 font-mono text-xs break-all border border-slate-800">
                      {elem.targetSelector}
                    </code>
                  </div>

                  <div>
                    <span className="text-[11px] uppercase font-bold text-slate-500 block mb-0.5">
                      Raw HTML Element:
                    </span>
                    <CodeBlock code={elem.htmlSnippet} language="html" />
                  </div>

                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                    <strong>Audit Failure Reason:</strong> {elem.failureSummary}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'guidance' && (
            <div className="space-y-4">
              {explanation ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="font-bold text-slate-200 text-xs block">What It Means</span>
                    <p className="text-slate-300 text-xs leading-relaxed">{explanation.whatItMeans}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="font-bold text-slate-200 text-xs block">Why It Matters</span>
                    <p className="text-slate-300 text-xs leading-relaxed">{explanation.whyItMatters}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="font-bold text-slate-200 text-xs block">Affected Assistive Tech & Users</span>
                    <p className="text-slate-300 text-xs leading-relaxed">{explanation.affectedUsers}</p>
                  </div>

                  {explanation.remediationSteps && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="font-bold text-slate-200 text-xs block">Remediation Steps</span>
                      <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
                        {explanation.remediationSteps.map((step: string, sIdx: number) => (
                          <li key={sIdx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <button
                    type="button"
                    onClick={generateAiExplanation}
                    disabled={loadingAi}
                    className="px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-semibold"
                  >
                    Generate Detailed WCAG Impact Analysis
                  </button>
                </div>
              )}

              {issue.helpUrl && (
                <a
                  href={issue.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  <span>Read full Deque axe-core rule documentation</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Status selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Status:</span>
            {(['open', 'fixed', 'ignored'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => onStatusChange?.(issue.id, st)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                  issue.status === st
                    ? st === 'fixed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : st === 'ignored'
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {onAskAIAssistant && (
              <button
                type="button"
                onClick={() => onAskAIAssistant(`How do I remediate this ${issue.ruleId} issue in my project?`, issue)}
                className="px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 font-semibold flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
                <span>Ask Assistant</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
