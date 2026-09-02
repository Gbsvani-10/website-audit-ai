import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Zap,
  Sparkles,
  Gauge,
  Search,
  Lock,
  Layers,
  FileText,
  AlertTriangle,
  RotateCcw,
  Plus,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import type {
  FullScanReport,
  WebsiteProfile,
  AccessibilityIssue,
  ScanDepth,
  ScoreWeightsConfig,
  ApiErrorDetail,
} from './types/index.js';
import { apiClient } from './utils/apiClient.js';

import { SkipToContent } from './components/layout/SkipToContent.js';
import { Navbar } from './components/layout/Navbar.js';
import { Sidebar, type TabKey } from './components/layout/Sidebar.js';
import { ScoreCard } from './components/common/ScoreCard.js';
import { StatCard } from './components/common/StatCard.js';
import { ScoreDial } from './components/dashboard/ScoreDial.js';
import { TopIssuesList } from './components/dashboard/TopIssuesList.js';
import { ChartsSection } from './components/dashboard/ChartsSection.js';
import { NewScanModal } from './components/dashboard/NewScanModal.js';
import { ScanProgressModal } from './components/dashboard/ScanProgressModal.js';
import { IssueTable } from './components/issues/IssueTable.js';
import { IssueDetailModal } from './components/issues/IssueDetailModal.js';
import { AIAssistantDrawer } from './components/assistant/AIAssistantDrawer.js';
import { ScanComparisonView } from './components/compare/ScanComparisonView.js';
import { PdfReportModal } from './components/reports/PdfReportModal.js';
import { MonitoringView } from './components/monitoring/MonitoringView.js';
import { WebsitesView } from './components/websites/WebsitesView.js';
import { SettingsView } from './components/settings/SettingsView.js';
import { LandingPage } from './components/landing/LandingPage.js';

export function App() {
  // Navigation & Theme
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Core Data
  const [scans, setScans] = useState<FullScanReport[]>([]);
  const [websites, setWebsites] = useState<WebsiteProfile[]>([]);
  const [currentScan, setCurrentScan] = useState<FullScanReport | null>(null);
  const [weights, setWeights] = useState<ScoreWeightsConfig>({
    accessibility: 0.4,
    performance: 0.25,
    seo: 0.2,
    security: 0.15,
  });

  // Modal States
  const [newScanModalOpen, setNewScanModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [assistantDrawerOpen, setAssistantDrawerOpen] = useState(false);

  // Active Interactive Selection
  const [selectedIssue, setSelectedIssue] = useState<AccessibilityIssue | null>(null);

  // Active Scan Progress Tracker
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState({
    percent: 0,
    message: 'Initializing...',
    logs: [] as any[],
    isComplete: false,
    error: undefined as string | undefined,
    errorDetail: undefined as ApiErrorDetail | undefined,
    targetUrl: '',
    depth: 'quick' as ScanDepth,
  });

  // Load initial scans and websites from backend
  const refreshData = useCallback(async () => {
    try {
      const [scansRes, sitesRes] = await Promise.all([
        apiClient.get<{ scans: FullScanReport[] }>('/api/scans'),
        apiClient.get<{ websites: WebsiteProfile[] }>('/api/websites'),
      ]);

      if (scansRes.success && scansRes.data?.scans) {
        setScans(scansRes.data.scans);
        if (!currentScan && scansRes.data.scans.length > 0) {
          const completedScans = scansRes.data.scans.filter((s) => s.status === 'completed');
          if (completedScans.length > 0) {
            setCurrentScan(completedScans[0]);
          } else {
            setCurrentScan(scansRes.data.scans[0]);
          }
        }
      }

      if (sitesRes.success && sitesRes.data?.websites) {
        setWebsites(sitesRes.data.websites);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }, [currentScan]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Active scan polling loop
  useEffect(() => {
    if (!activeScanId || scanProgress.isComplete || scanProgress.error) return;

    const interval = setInterval(async () => {
      try {
        const response = await apiClient.get<{ scan: any; isComplete: boolean; isFailed?: boolean }>(
          `/api/scans/${activeScanId}`,
          scanProgress.targetUrl
        );

        if (!response.success && response.error) {
          clearInterval(interval);
          setScanProgress((prev) => ({
            ...prev,
            error: response.error?.userFriendlyMessage || 'Audit interrupted.',
            errorDetail: response.error,
            isComplete: false,
          }));
          return;
        }

        const data = response.data;
        if (data && data.scan) {
          const s = data.scan;
          const isFailed = data.isFailed || s.status === 'failed';
          const isFinished = data.isComplete || s.status === 'completed' || isFailed;

          if (isFailed) {
            clearInterval(interval);
            setScanProgress({
              percent: s.progressPercent || 100,
              message: s.currentStepMessage || 'Audit encountered an error.',
              logs: s.logs || [],
              isComplete: false,
              error: s.errorMessage || s.errorDetail?.userFriendlyMessage || 'Audit scan failed.',
              errorDetail: s.errorDetail,
              targetUrl: s.targetUrl || scanProgress.targetUrl,
              depth: scanProgress.depth,
            });
            refreshData();
            return;
          }

          setScanProgress({
            percent: s.progressPercent || 10,
            message: s.currentStepMessage || 'Inspecting DOM & WCAG rules...',
            logs: s.logs || [],
            isComplete: isFinished,
            error: undefined,
            errorDetail: undefined,
            targetUrl: s.targetUrl || scanProgress.targetUrl,
            depth: scanProgress.depth,
          });

          if (isFinished) {
            clearInterval(interval);
            // Fetch full completed scan report
            const fullRes = await apiClient.get<{ scan: FullScanReport }>(
              `/api/scans/${activeScanId}`,
              scanProgress.targetUrl
            );
            if (fullRes.success && fullRes.data?.scan) {
              setCurrentScan(fullRes.data.scan);
              setActiveTab('overview');
              if (fullRes.data.scan.scores?.overallQuality >= 80) {
                confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
              }
            }
            refreshData();
          }
        }
      } catch (pollErr: any) {
        console.warn('Scan polling non-fatal warning:', pollErr);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [activeScanId, scanProgress.isComplete, scanProgress.error, scanProgress.targetUrl, scanProgress.depth, refreshData]);

  // Handle starting a new audit
  const handleStartScan = async (targetUrl: string, depth: ScanDepth) => {
    setNewScanModalOpen(false);
    setProgressModalOpen(true);
    setScanProgress({
      percent: 5,
      message: 'SSRF Security Validation: Initializing scan engine & security guard...',
      logs: [{ timestamp: new Date().toISOString(), message: `Queueing ${targetUrl}`, type: 'info' }],
      isComplete: false,
      error: undefined,
      errorDetail: undefined,
      targetUrl,
      depth,
    });

    try {
      const result = await apiClient.post<{ scanId: string; success?: boolean; message?: string }>(
        '/api/scans',
        { url: targetUrl, depth },
        targetUrl
      );

      if (result.success && result.data?.scanId) {
        setActiveScanId(result.data.scanId);
      } else {
        setScanProgress((p) => ({
          ...p,
          error: result.error?.userFriendlyMessage || 'Failed to initialize scan.',
          errorDetail: result.error,
        }));
      }
    } catch (err: any) {
      setScanProgress((p) => ({
        ...p,
        error: err.userFriendlyMessage || err.message || 'Network connection failed.',
        errorDetail: err.toErrorDetail ? err.toErrorDetail() : undefined,
      }));
    }
  };

  const handleRetryScan = () => {
    if (scanProgress.targetUrl) {
      handleStartScan(scanProgress.targetUrl, scanProgress.depth || 'quick');
    }
  };

  // Switch website
  const handleSelectWebsite = (siteId: string) => {
    const siteScans = scans.filter((s) => s.websiteId === siteId);
    if (siteScans.length > 0) {
      setCurrentScan(siteScans[0]);
    }
  };

  // Issue selection
  const handleOpenIssueDetail = (issue: AccessibilityIssue) => {
    setSelectedIssue(issue);
    setDetailModalOpen(true);
  };

  const handleOpenAIFix = (issue: AccessibilityIssue) => {
    setSelectedIssue(issue);
    setDetailModalOpen(true);
  };

  const handleIssueStatusChange = (issueId: string, newStatus: 'open' | 'fixed' | 'ignored') => {
    if (!currentScan) return;
    const updatedIssues = currentScan.issues.map((i) =>
      i.id === issueId ? { ...i, status: newStatus } : i
    );
    setCurrentScan({ ...currentScan, issues: updatedIssues });
    if (selectedIssue && selectedIssue.id === issueId) {
      setSelectedIssue({ ...selectedIssue, status: newStatus });
    }
  };

  const handleAskAssistant = (question: string, issue?: AccessibilityIssue) => {
    if (issue) setSelectedIssue(issue);
    setAssistantDrawerOpen(true);
  };

  const currentWebsite = websites.find((w) => w.id === currentScan?.websiteId);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-slate-950`}>
      <SkipToContent />

      {/* Top Navbar */}
      <Navbar
        currentWebsite={currentWebsite}
        websites={websites}
        onSelectWebsite={handleSelectWebsite}
        onOpenNewScanModal={() => setNewScanModalOpen(true)}
        onOpenAIAssistant={() => setAssistantDrawerOpen(true)}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        isDemoMode={currentScan?.isDemo}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          issuesCount={currentScan?.issues.length || 0}
        />

        {/* Dynamic Main View */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 focus:outline-none"
        >
          {/* If no scan is selected and not on custom tabs, show Landing Page */}
          {!currentScan && activeTab === 'overview' ? (
            <LandingPage
              onStartScan={handleStartScan}
              onExploreDemo={() => {
                if (scans.length > 0) setCurrentScan(scans[0]);
              }}
            />
          ) : (
            <>
              {/* TAB 1: OVERVIEW DASHBOARD */}
              {activeTab === 'overview' && currentScan && (
                <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in">
                  {/* Top Score Dial Card */}
                  <ScoreDial
                    scores={currentScan.scores}
                    domain={currentScan.domain}
                    scanDate={currentScan.createdAt}
                    onViewIssues={() => setActiveTab('issues')}
                  />

                  {/* 4 Pillar Scorecards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ScoreCard
                      id="score-card-a11y"
                      title="AccessAudit (WCAG)"
                      score={currentScan.scores.accessibility}
                      icon={ShieldCheck}
                      description="Automated axe-core conformance"
                      benchmark="Level AA"
                    />
                    <ScoreCard
                      id="score-card-perf"
                      title="Performance (TTFB)"
                      score={currentScan.scores.performance}
                      icon={Gauge}
                      description="Latency & document weight"
                      benchmark="Good"
                    />
                    <ScoreCard
                      id="score-card-seo"
                      title="Technical SEO"
                      score={currentScan.scores.seo}
                      icon={Search}
                      description="Meta tags, H1 & OpenGraph"
                      benchmark="Optimal"
                    />
                    <ScoreCard
                      id="score-card-sec"
                      title="Security Headers"
                      score={currentScan.scores.security}
                      icon={Lock}
                      description="TLS, HSTS, CSP & X-Content"
                      benchmark="Secure"
                    />
                  </div>

                  {/* Quick Stat Counter Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard
                      id="stat-total-issues"
                      label="Violations Flagged"
                      value={currentScan.issues.length}
                      subtext={`${currentScan.scores.breakdown.critical} critical severity`}
                      highlightColor="rose"
                    />
                    <StatCard
                      id="stat-pages-crawled"
                      label="Pages Crawled"
                      value={currentScan.pages.length || 1}
                      subtext={`${currentScan.scanDepth} depth`}
                      highlightColor="sky"
                    />
                    <StatCard
                      id="stat-passed-rules"
                      label="Passed Checks"
                      value={currentScan.scores.breakdown.passedChecks}
                      subtext="Verified compliant"
                      highlightColor="emerald"
                    />
                    <StatCard
                      id="stat-scan-speed"
                      label="Scan Duration"
                      value={`${((currentScan.durationMs || 3500) / 1000).toFixed(1)}s`}
                      subtext="Edge scanner"
                      highlightColor="purple"
                    />
                  </div>

                  {/* High-Impact Remediation Priorities & Charts */}
                  <TopIssuesList
                    issues={currentScan.issues}
                    onSelectIssue={handleOpenIssueDetail}
                    onOpenAIFix={handleOpenAIFix}
                    onViewAllIssues={() => setActiveTab('issues')}
                  />

                  {/* Visual Analytics & Breakdown */}
                  <ChartsSection scores={currentScan.scores} websiteProfile={currentWebsite} />
                </div>
              )}

              {/* TAB 2: WEBSITES DIRECTORY */}
              {activeTab === 'websites' && (
                <WebsitesView
                  websites={websites}
                  onSelectWebsite={(id) => {
                    handleSelectWebsite(id);
                    setActiveTab('overview');
                  }}
                  onStartAudit={(url) => handleStartScan(url, 'standard')}
                />
              )}

              {/* TAB 3: SCAN HISTORY */}
              {activeTab === 'scans' && (
                <div className="space-y-6 max-w-7xl mx-auto">
                  <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-100">Audit History & Records</h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Historical list of all automated crawls and compliance scores.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setNewScanModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Audit</span>
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                          <tr>
                            <th className="px-4 py-3">Domain</th>
                            <th className="px-4 py-3">Quality Score</th>
                            <th className="px-4 py-3">A11y (WCAG)</th>
                            <th className="px-4 py-3">Violations</th>
                            <th className="px-4 py-3">Depth</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {scans.map((s) => (
                            <tr
                              key={s.id}
                              onClick={() => {
                                setCurrentScan(s);
                                setActiveTab('overview');
                              }}
                              className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                            >
                              <td className="px-4 py-3 font-semibold text-slate-100">{s.domain}</td>
                              <td className="px-4 py-3">
                                <span className="font-bold text-emerald-400">{s.scores.overallQuality}/100</span>
                              </td>
                              <td className="px-4 py-3">{s.scores.accessibility}/100</td>
                              <td className="px-4 py-3">
                                <span className="text-rose-400 font-semibold">{s.issues.length}</span>
                              </td>
                              <td className="px-4 py-3 uppercase text-[10px] text-slate-400 font-mono">
                                {s.scanDepth}
                              </td>
                              <td className="px-4 py-3 text-slate-400">
                                {new Date(s.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ISSUE EXPLORER */}
              {activeTab === 'issues' && currentScan && (
                <div className="space-y-6 max-w-7xl mx-auto">
                  <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <span>WCAG Issue Explorer & Remediation Catalog</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          {currentScan.issues.length} Rules Flagged
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Filter by severity, search selectors, inspect HTML code snippets, and generate AI fixes.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReportModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Export Issues Report</span>
                    </button>
                  </div>

                  <IssueTable
                    issues={currentScan.issues}
                    onSelectIssue={handleOpenIssueDetail}
                    onOpenAIFix={handleOpenAIFix}
                    onStatusChange={handleIssueStatusChange}
                  />
                </div>
              )}

              {/* TAB 5: AI REMEDIATION ASSISTANT */}
              {activeTab === 'assistant' && (
                <div className="max-w-4xl mx-auto p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-100">
                        AI Accessibility Assistant & Engineering Advisor
                      </h2>
                      <p className="text-xs text-slate-400">
                        Ask any question about WCAG 2.1 AA/AAA conformance, React component accessibility, and remediation.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAssistantDrawerOpen(true)}
                    className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Launch Fullscreen Accessibility Chat Drawer</span>
                  </button>
                </div>
              )}

              {/* TAB 6: SCAN COMPARE */}
              {activeTab === 'compare' && (
                <div className="max-w-7xl mx-auto">
                  <ScanComparisonView scans={scans} onOpenIssue={handleOpenIssueDetail} />
                </div>
              )}

              {/* TAB 7: REPORTS */}
              {activeTab === 'reports' && currentScan && (
                <div className="max-w-4xl mx-auto p-8 text-center rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                  <FileText className="w-12 h-12 mx-auto text-emerald-400" />
                  <h2 className="text-xl font-bold text-slate-100">
                    Audit Report & PDF Export
                  </h2>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Generate an executive summary and full technical violation matrix for <strong>{currentScan.domain}</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(true)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25"
                  >
                    Open Printable PDF Report Modal →
                  </button>
                </div>
              )}

              {/* TAB 8: MONITORING */}
              {activeTab === 'monitoring' && (
                <div className="max-w-7xl mx-auto">
                  <MonitoringView onStartAudit={(url) => handleStartScan(url, 'standard')} />
                </div>
              )}

              {/* TAB 9: SETTINGS */}
              {activeTab === 'settings' && (
                <div className="max-w-7xl mx-auto">
                  <SettingsView weights={weights} onUpdateWeights={setWeights} />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals & Drawers */}
      <NewScanModal
        isOpen={newScanModalOpen}
        onClose={() => setNewScanModalOpen(false)}
        onStartScan={handleStartScan}
        isScanning={progressModalOpen}
      />

      <ScanProgressModal
        isOpen={progressModalOpen}
        targetUrl={scanProgress.targetUrl}
        progressPercent={scanProgress.percent}
        stepMessage={scanProgress.message}
        logs={scanProgress.logs}
        isComplete={scanProgress.isComplete}
        errorMessage={scanProgress.error}
        errorDetail={scanProgress.errorDetail}
        onRetry={handleRetryScan}
        onCancel={() => {
          setProgressModalOpen(false);
          setActiveScanId(null);
        }}
        onViewResults={() => {
          setProgressModalOpen(false);
          setActiveScanId(null);
          setActiveTab('overview');
        }}
      />

      <IssueDetailModal
        issue={selectedIssue}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onStatusChange={handleIssueStatusChange}
        onAskAIAssistant={handleAskAssistant}
      />

      <PdfReportModal
        scan={currentScan}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />

      <AIAssistantDrawer
        isOpen={assistantDrawerOpen}
        onClose={() => setAssistantDrawerOpen(false)}
        currentScan={currentScan}
        selectedIssue={selectedIssue}
      />
    </div>
  );
}

export default App;
