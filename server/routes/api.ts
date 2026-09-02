import { Router, Request, Response } from 'express';
import { crawlAndAuditWebsite } from '../scanner/crawler.js';
import { dbStore } from '../db/store.js';
import { explainAccessibilityIssue, generateRemediationFix, queryAccessibilityAssistant } from '../services/aiService.js';
import type { ScanDepth } from '../../src/types/index.js';

export const apiRouter = Router();

// In-progress scans map for live progress polling
const activeScans = new Map<
  string,
  {
    id: string;
    targetUrl: string;
    status: string;
    progressPercent: number;
    stepMessage: string;
    logs: any[];
    pagesDone: number;
    totalPages: number;
    error?: string;
  }
>();

/**
 * POST /api/scans
 * Starts a new scan on the given URL.
 */
apiRouter.post('/scans', async (req: Request, res: Response) => {
  try {
    const { url, depth = 'quick' } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'A valid target URL is required.' });
    }

    const scanDepth = (depth as ScanDepth) || 'quick';
    const tempId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Set initial active state
    activeScans.set(tempId, {
      id: tempId,
      targetUrl: url,
      status: 'initializing',
      progressPercent: 5,
      stepMessage: 'Initializing scan engine & SSRF guard...',
      logs: [{ timestamp: new Date().toISOString(), message: `Queued scan for ${url}`, type: 'info' }],
      pagesDone: 0,
      totalPages: scanDepth === 'quick' ? 1 : scanDepth === 'standard' ? 10 : 30,
    });

    // Start asynchronous crawler
    (async () => {
      try {
        const fullReport = await crawlAndAuditWebsite(url, {
          depth: scanDepth,
          onProgress: (p) => {
            const current = activeScans.get(tempId);
            if (current) {
              current.progressPercent = p.percent;
              current.stepMessage = p.stepMessage;
              current.logs.push(p.log);
              current.pagesDone = p.pagesDone;
              current.totalPages = p.totalPages;
              current.status = p.percent >= 100 ? 'completed' : 'analyzing';
            }
          },
        });

        // Store into DB
        fullReport.id = tempId;
        dbStore.saveScan(fullReport);

        const current = activeScans.get(tempId);
        if (current) {
          current.status = 'completed';
          current.progressPercent = 100;
          current.stepMessage = 'Audit completed successfully';
        }
      } catch (scanErr: any) {
        console.error('Scan execution error:', scanErr);
        const current = activeScans.get(tempId);
        if (current) {
          current.status = 'failed';
          current.error = scanErr.message || 'Audit execution failed.';
          current.logs.push({
            timestamp: new Date().toISOString(),
            message: `Scan failed: ${scanErr.message || 'Internal error'}`,
            type: 'error',
          });
        }
      }
    })();

    return res.status(202).json({
      scanId: tempId,
      status: 'queued',
      message: 'Scan initiated successfully.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to start scan.' });
  }
});

/**
 * GET /api/scans
 * Returns all past scans.
 */
apiRouter.get('/scans', (req: Request, res: Response) => {
  const scans = dbStore.getAllScans();
  return res.json({ scans });
});

/**
 * GET /api/scans/:scan_id
 * Retrieves scan report or live progress.
 */
apiRouter.get('/scans/:scan_id', (req: Request, res: Response) => {
  const { scan_id } = req.params;

  // Check finished store first
  const stored = dbStore.getScan(scan_id);
  if (stored) {
    return res.json({ scan: stored, isComplete: true });
  }

  // Check active scans
  const active = activeScans.get(scan_id);
  if (active) {
    return res.json({
      scan: {
        id: active.id,
        targetUrl: active.targetUrl,
        status: active.status,
        progressPercent: active.progressPercent,
        currentStepMessage: active.stepMessage,
        logs: active.logs,
        pagesDone: active.pagesDone,
        totalPages: active.totalPages,
        errorMessage: active.error,
      },
      isComplete: active.status === 'completed',
    });
  }

  return res.status(404).json({ error: `Scan "${scan_id}" not found.` });
});

/**
 * GET /api/scans/:scan_id/summary
 * Returns top-level metrics and scores for dashboard.
 */
apiRouter.get('/scans/:scan_id/summary', (req: Request, res: Response) => {
  const { scan_id } = req.params;
  const scan = dbStore.getScan(scan_id);
  if (!scan) {
    return res.status(404).json({ error: `Scan "${scan_id}" not found.` });
  }

  return res.json({
    id: scan.id,
    domain: scan.domain,
    targetUrl: scan.targetUrl,
    scores: scan.scores,
    pagesCount: scan.pages.length,
    issuesCount: scan.issues.length,
    createdAt: scan.createdAt,
    durationMs: scan.durationMs,
    limitationsNotice: scan.limitationsNotice,
  });
});

/**
 * GET /api/scans/:scan_id/issues
 * Returns filtered and searched accessibility issues.
 */
apiRouter.get('/scans/:scan_id/issues', (req: Request, res: Response) => {
  const { scan_id } = req.params;
  const { severity, category, wcag, search, status } = req.query;

  const scan = dbStore.getScan(scan_id);
  if (!scan) {
    return res.status(404).json({ error: `Scan "${scan_id}" not found.` });
  }

  let issues = [...scan.issues];

  if (severity && typeof severity === 'string' && severity !== 'all') {
    issues = issues.filter((i) => i.severity.toLowerCase() === severity.toLowerCase());
  }

  if (category && typeof category === 'string' && category !== 'all') {
    issues = issues.filter((i) => i.category.toLowerCase() === category.toLowerCase());
  }

  if (wcag && typeof wcag === 'string' && wcag !== 'all') {
    issues = issues.filter((i) => i.wcagLevel.toLowerCase() === wcag.toLowerCase());
  }

  if (status && typeof status === 'string' && status !== 'all') {
    issues = issues.filter((i) => i.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    issues = issues.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.ruleId.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.wcagRef.toLowerCase().includes(q)
    );
  }

  return res.json({ issues, totalCount: issues.length });
});

/**
 * GET /api/issues/:issue_id
 * Returns a specific issue by ID from any scan.
 */
apiRouter.get('/issues/:issue_id', (req: Request, res: Response) => {
  const { issue_id } = req.params;
  const scans = dbStore.getAllScans();

  for (const s of scans) {
    const found = s.issues.find((i) => i.id === issue_id);
    if (found) {
      return res.json({ issue: found, scanId: s.id, domain: s.domain });
    }
  }

  return res.status(404).json({ error: `Issue "${issue_id}" not found.` });
});

/**
 * POST /api/issues/:issue_id/ai-explain
 * Uses Gemini AI to explain what the issue means, why it matters, and remediation steps.
 */
apiRouter.post('/issues/:issue_id/ai-explain', async (req: Request, res: Response) => {
  try {
    const { issue_id } = req.params;
    const { issueData } = req.body;

    let targetIssue = issueData;
    if (!targetIssue) {
      const scans = dbStore.getAllScans();
      for (const s of scans) {
        const found = s.issues.find((i) => i.id === issue_id);
        if (found) {
          targetIssue = found;
          break;
        }
      }
    }

    if (!targetIssue) {
      return res.status(404).json({ error: 'Issue data not found for AI explanation.' });
    }

    const explanation = await explainAccessibilityIssue(targetIssue);
    return res.json({ explanation });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'AI Explanation failed.' });
  }
});

/**
 * POST /api/issues/:issue_id/ai-fix
 * Generates copy-pasteable Before & After remediation in HTML, React, or Tailwind.
 */
apiRouter.post('/issues/:issue_id/ai-fix', async (req: Request, res: Response) => {
  try {
    const { issue_id } = req.params;
    const { framework = 'html', customSnippet, issueData } = req.body;

    let targetIssue = issueData;
    if (!targetIssue) {
      const scans = dbStore.getAllScans();
      for (const s of scans) {
        const found = s.issues.find((i) => i.id === issue_id);
        if (found) {
          targetIssue = found;
          break;
        }
      }
    }

    if (!targetIssue) {
      return res.status(404).json({ error: 'Issue data not found for AI fix generation.' });
    }

    const remediation = await generateRemediationFix(targetIssue, framework, customSnippet);
    return res.json({ remediation });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'AI Fix generation failed.' });
  }
});

/**
 * POST /api/ai/assistant
 * Interactive AI Assistant for accessibility Q&A.
 */
apiRouter.post('/ai/assistant', async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Question message is required.' });
    }

    const reply = await queryAccessibilityAssistant(message, context);
    return res.json({ reply });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'AI Assistant failed.' });
  }
});

/**
 * GET /api/websites
 * Lists all audited websites.
 */
apiRouter.get('/websites', (req: Request, res: Response) => {
  const websites = dbStore.getAllWebsites();
  return res.json({ websites });
});

/**
 * GET /api/websites/:website_id
 * Returns website profile and historical trend data.
 */
apiRouter.get('/websites/:website_id', (req: Request, res: Response) => {
  const { website_id } = req.params;
  const site = dbStore.getWebsite(website_id);
  if (!site) {
    return res.status(404).json({ error: `Website "${website_id}" not found.` });
  }

  const scans = dbStore.getWebsiteScans(website_id);
  return res.json({ website: site, scans });
});

/**
 * GET /api/scans/compare
 * Compares two scans side-by-side.
 */
apiRouter.get('/scans/compare', (req: Request, res: Response) => {
  const { scanA: idA, scanB: idB } = req.query;
  if (!idA || !idB || typeof idA !== 'string' || typeof idB !== 'string') {
    return res.status(400).json({ error: 'Both "scanA" and "scanB" query parameters are required.' });
  }

  const scanA = dbStore.getScan(idA);
  const scanB = dbStore.getScan(idB);

  if (!scanA || !scanB) {
    return res.status(404).json({ error: 'One or both specified scans were not found for comparison.' });
  }

  const scoreDelta = scanB.scores.overallQuality - scanA.scores.overallQuality;
  const a11yDelta = scanB.scores.accessibility - scanA.scores.accessibility;

  // Compare issues
  const rulesA = new Map(scanA.issues.map((i) => [i.ruleId, i]));
  const rulesB = new Map(scanB.issues.map((i) => [i.ruleId, i]));

  const fixedIssues = scanA.issues.filter((i) => !rulesB.has(i.ruleId));
  const newIssues = scanB.issues.filter((i) => !rulesA.has(i.ruleId));
  const unchangedIssues = scanB.issues.filter((i) => rulesA.has(i.ruleId));

  const deltaBreakdown = {
    critical: scanB.scores.breakdown.critical - scanA.scores.breakdown.critical,
    serious: scanB.scores.breakdown.serious - scanA.scores.breakdown.serious,
    moderate: scanB.scores.breakdown.moderate - scanA.scores.breakdown.moderate,
    minor: scanB.scores.breakdown.minor - scanA.scores.breakdown.minor,
  };

  return res.json({
    scanA,
    scanB,
    scoreDelta,
    a11yDelta,
    deltaBreakdown,
    fixedIssues,
    newIssues,
    unchangedIssues,
  });
});

/**
 * GET /api/monitoring
 * Lists scheduled monitoring tasks.
 */
apiRouter.get('/monitoring', (req: Request, res: Response) => {
  const monitors = dbStore.getAllScheduledMonitors();
  return res.json({ monitors });
});

/**
 * POST /api/monitoring
 * Creates a new scheduled scan monitor.
 */
apiRouter.post('/monitoring', (req: Request, res: Response) => {
  const { targetUrl, frequency = 'weekly', depth = 'standard', notifyEmail, alertThresholdScore = 80 } = req.body;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Target URL is required for monitoring.' });
  }

  try {
    const domain = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`).hostname;
    const websiteId = `site_${domain.replace(/[^a-z0-9]/gi, '_')}`;
    const id = `monitor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newMonitor = {
      id,
      websiteId,
      domain,
      targetUrl,
      frequency,
      depth,
      nextRun: new Date(Date.now() + 7 * 86400000).toISOString(),
      notifyEmail: notifyEmail || 'auditor@accessaudit.ai',
      alertThresholdScore: Number(alertThresholdScore) || 80,
      active: true,
    };

    dbStore.saveScheduledMonitoring(newMonitor);
    return res.status(201).json({ monitor: newMonitor, message: 'Scheduled monitoring enabled.' });
  } catch {
    return res.status(400).json({ error: 'Invalid URL provided.' });
  }
});

/**
 * DELETE /api/monitoring/:id
 * Removes a scheduled monitor.
 */
apiRouter.delete('/monitoring/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = dbStore.deleteScheduledMonitoring(id);
  if (!deleted) {
    return res.status(404).json({ error: `Monitor "${id}" not found.` });
  }
  return res.json({ success: true, message: 'Monitoring removed.' });
});
