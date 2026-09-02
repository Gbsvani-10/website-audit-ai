import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Bell, Globe, ShieldCheck, CheckCircle2 } from 'lucide-react';
import type { ScheduledMonitoring } from '../../types/index.js';
import { apiClient } from '../../utils/apiClient.js';

interface MonitoringViewProps {
  onStartAudit: (url: string) => void;
}

export const MonitoringView: React.FC<MonitoringViewProps> = ({ onStartAudit }) => {
  const [monitors, setMonitors] = useState<ScheduledMonitoring[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [url, setUrl] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [email, setEmail] = useState('');
  const [threshold, setThreshold] = useState(80);

  const fetchMonitors = async () => {
    try {
      const res = await apiClient.get<{ monitors: ScheduledMonitoring[] }>('/api/monitoring');
      if (res.success && res.data?.monitors) {
        setMonitors(res.data.monitors);
      }
    } catch (err) {
      console.error('Failed to fetch monitors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitors();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      const res = await apiClient.post('/api/monitoring', {
        targetUrl: url,
        frequency,
        notifyEmail: email || 'auditor@accessaudit.ai',
        alertThresholdScore: threshold,
      });
      if (res.success) {
        setUrl('');
        setShowAddModal(false);
        fetchMonitors();
      }
    } catch (err) {
      console.error('Failed to create monitor:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/api/monitoring/${id}`);
      fetchMonitors();
    } catch (err) {
      console.error('Failed to delete monitor:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <span>Continuous Accessibility & Quality Monitoring</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automate weekly or daily audits to catch regressions before they impact users.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
          <span>Add Monitored Site</span>
        </button>
      </div>

      {/* Monitor Cards */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading monitoring tasks...</div>
      ) : monitors.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-400">
          <Clock className="w-10 h-10 mx-auto text-slate-600 mb-3" aria-hidden="true" />
          <h3 className="text-base font-bold text-slate-200">No Scheduled Monitors Active</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Add a target domain to receive automated regression email alerts when score drops below your threshold.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {monitors.map((mon) => (
            <div
              key={mon.id}
              className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all text-xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    <span className="font-bold text-slate-100 text-sm">{mon.domain}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                    {mon.frequency}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">{mon.targetUrl}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1 text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Alert Threshold:</span>
                  <span className="font-bold text-amber-400">Below {mon.alertThresholdScore}/100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Alert Recipient:</span>
                  <span className="font-mono text-slate-300">{mon.notifyEmail}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Next Scheduled Run:</span>
                  <span className="text-slate-300">
                    {new Date(mon.nextRun).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => onStartAudit(mon.targetUrl)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
                >
                  Trigger Run Now
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(mon.id)}
                  aria-label="Delete monitoring task"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-100">Schedule Automated Audit</h3>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Target Website URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://mysite.com"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Crawl Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="daily">Daily Crawl</option>
                  <option value="weekly">Weekly Crawl</option>
                  <option value="monthly">Monthly Crawl</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Alert Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dev-team@company.com"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-lg text-slate-400 hover:text-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
