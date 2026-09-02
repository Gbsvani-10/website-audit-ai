import React from 'react';
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Globe,
} from 'lucide-react';
import type { FullScanReport } from '../../types/index.js';
import { SeverityBadge } from '../common/SeverityBadge.js';

interface PdfReportModalProps {
  scan: FullScanReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  scan,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !scan) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-4xl max-h-[94vh] rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Topbar (hidden during print) */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 print:hidden">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <div>
              <h2 id="report-modal-title" className="text-sm font-bold text-slate-100">
                Executive & Technical Audit Report
              </h2>
              <p className="text-xs text-slate-400">Printable WCAG Conformance & Security Summary</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Printable Document Paper View */}
        <div className="p-8 overflow-y-auto flex-1 bg-slate-950/90 print:bg-white print:text-black space-y-8 text-xs">
          {/* Document Header */}
          <div className="border-b border-slate-800 print:border-slate-300 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-6 h-6 text-emerald-400 print:text-emerald-700" aria-hidden="true" />
                <span className="text-xl font-extrabold tracking-tight text-slate-100 print:text-slate-900">
                  AccessAudit<span className="text-emerald-400 print:text-emerald-700">AI</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 print:text-slate-600">
                Automated WCAG 2.1 Conformance & Quality Assessment
              </p>
            </div>

            <div className="text-left sm:text-right space-y-0.5 text-xs text-slate-400 print:text-slate-700">
              <p>
                <strong>Audit ID:</strong> <span className="font-mono">{scan.id}</span>
              </p>
              <p>
                <strong>Date:</strong> {new Date(scan.createdAt).toLocaleDateString()}
              </p>
              <p>
                <strong>Target:</strong> {scan.targetUrl}
              </p>
            </div>
          </div>

          {/* Scores Overview Matrix */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 print:text-slate-900 mb-3">
              1. Executive Quality Scorecard
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-900 print:bg-slate-100 border border-slate-800 print:border-slate-300 text-center">
                <span className="text-3xl font-extrabold text-emerald-400 print:text-emerald-800">
                  {scan.scores.overallQuality}
                </span>
                <span className="text-[11px] font-bold block text-slate-400 print:text-slate-700 mt-1">
                  Overall Quality (/100)
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 print:bg-slate-100 border border-slate-800 print:border-slate-300 text-center">
                <span className="text-3xl font-extrabold text-sky-400 print:text-sky-800">
                  {scan.scores.accessibility}
                </span>
                <span className="text-[11px] font-bold block text-slate-400 print:text-slate-700 mt-1">
                  AccessAudit Score
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 print:bg-slate-100 border border-slate-800 print:border-slate-300 text-center">
                <span className="text-3xl font-extrabold text-amber-400 print:text-amber-800">
                  {scan.scores.performance}
                </span>
                <span className="text-[11px] font-bold block text-slate-400 print:text-slate-700 mt-1">
                  Performance Index
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 print:bg-slate-100 border border-slate-800 print:border-slate-300 text-center">
                <span className="text-3xl font-extrabold text-purple-400 print:text-purple-800">
                  {scan.scores.seo}
                </span>
                <span className="text-[11px] font-bold block text-slate-400 print:text-slate-700 mt-1">
                  SEO & Meta Health
                </span>
              </div>
            </div>
          </div>

          {/* Violations Summary */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 print:text-slate-900 mb-3">
              2. WCAG Violations Inventory ({scan.issues.length} Rules Flagged)
            </h3>
            <div className="divide-y divide-slate-800 print:divide-slate-300 rounded-xl border border-slate-800 print:border-slate-300 overflow-hidden">
              {scan.issues.map((issue, idx) => (
                <div key={issue.id || idx} className="p-3.5 bg-slate-900/60 print:bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={issue.severity} size="sm" />
                      <span className="font-mono text-xs text-slate-400 print:text-slate-700 font-bold">
                        {issue.ruleId}
                      </span>
                      <span className="font-bold text-slate-200 print:text-slate-900">{issue.title}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 print:text-slate-600 font-mono">
                      {issue.wcagRef}
                    </span>
                  </div>

                  <p className="text-slate-400 print:text-slate-700 text-xs">{issue.description}</p>

                  <div className="text-[11px] text-slate-500 print:text-slate-600 font-medium">
                    Remediation: <span className="text-slate-300 print:text-slate-800">{issue.suggestedFix}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legal and Limitations Notice */}
          <div className="p-4 rounded-xl bg-slate-900 print:bg-slate-100 border border-slate-800 print:border-slate-300 text-xs text-slate-400 print:text-slate-700 space-y-1">
            <span className="font-bold text-slate-200 print:text-slate-900 block">
              Audit Scope & Conformance Disclaimer
            </span>
            <p className="text-[11px] leading-relaxed">
              Automated testing with axe-core rules identifies between 30% to 50% of WCAG success criteria automatically. Complete WCAG 2.1 AA and ADA Title III conformance requires complementary manual screen reader evaluation (NVDA/JAWS/VoiceOver) and manual keyboard trap verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
