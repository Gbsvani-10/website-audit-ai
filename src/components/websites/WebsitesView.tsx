import React from 'react';
import { Globe, ArrowRight, ShieldCheck, Clock, ExternalLink } from 'lucide-react';
import type { WebsiteProfile } from '../../types/index.js';

interface WebsitesViewProps {
  websites: WebsiteProfile[];
  onSelectWebsite: (siteId: string) => void;
  onStartAudit: (url: string) => void;
}

export const WebsitesView: React.FC<WebsitesViewProps> = ({
  websites,
  onSelectWebsite,
  onStartAudit,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <span>Monitored Domains & Projects</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Overview of all audited websites with latest compliance scores.
          </p>
        </div>
      </div>

      {websites.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-400">
          <Globe className="w-10 h-10 mx-auto text-slate-600 mb-3" aria-hidden="true" />
          <h3 className="text-base font-bold text-slate-200">No Domains Audited Yet</h3>
          <p className="text-xs text-slate-400 mt-1">
            Launch your first website audit to start tracking compliance over time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {websites.map((site) => (
            <div
              key={site.id}
              className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 text-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">{site.domain}</h3>
                    <a
                      href={site.rootUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-400 hover:text-emerald-400 inline-flex items-center gap-1 mt-0.5"
                    >
                      <span className="truncate max-w-[180px]">{site.rootUrl}</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </div>

                  <div className="text-right">
                    <span className="text-xl font-extrabold text-emerald-400">
                      {site.latestScore}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-semibold">/100 Quality</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1 text-[11px] text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Total Scans Recorded:</span>
                  <span className="font-bold text-slate-200">{site.totalScansCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last Audited:</span>
                  <span className="text-slate-300">
                    {new Date(site.lastScannedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => onSelectWebsite(site.id)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>View Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => onStartAudit(site.rootUrl)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-semibold border border-emerald-500/30 transition-colors"
                >
                  Re-Audit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
