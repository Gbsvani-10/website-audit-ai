import { Router, Request, Response, NextFunction } from 'express';
import { crawlAndAuditWebsite } from '../scanner/crawler.js';
import { dbStore } from '../db/store.js';
import { explainAccessibilityIssue, generateRemediationFix, queryAccessibilityAssistant } from '../services/aiService.js';
import {
  AuditException,
  createInvalidUrlError,
  createScanNotFoundError,
  formatErrorResponse,
  normalizeToAuditException,
  logServerException,
} from '../utils/errors.js';
import type { ScanDepth, FullScanReport, ApiErrorDetail, AuditErrorCode, ScanLogEntry } from '../../src/types/index.js';

export const apiRouter = Router();

// In-progress scans map for live progress polling
interface ActiveScanRecord {
  id: string;
  targetUrl: string;
  status: string;
  progressPercent: number;
  stepMessage: string;
  stage: string;
  logs: any[];
  pagesDone: number;
  totalPages: number;
  error?: string;
  errorCode?: AuditErrorCode;
  errorDetail?: ApiErrorDetail;
}

const activeScans = new Map<string, ActiveScanRecord>();

// Middleware: ensure JSON content-type header on all API responses
apiRouter.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

/**
 * POST /api/scans
 * Starts a new scan on the given URL.
 */
apiRouter.post('/scans', async (req: Request, res: Response) => {
  try {
    const { url, depth = 'quick' } = req.body;
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      const err = createInvalidUrlError('A valid target URL is required.', undefined, url);
      return res.status(err.statusCode).json(formatErrorResponse(err, url));
    }

    const trimmedUrl = url.trim();
    const scanDepth = (depth as ScanDepth) || 'quick';
    const tempId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Initial URL parse for domain
    let domain = trimmedUrl;
    try {
      const parsed = new URL(trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`);
      domain = parsed.hostname;
    } catch {
      // ignore
    }
    const websiteId = `site_${domain.replace(/[^a-z0-9]/gi, '_')}`;

    const initialLog: ScanLogEntry = {
      timestamp: new Date().toISOString(),
      message: `Queued audit scan for ${trimmedUrl}`,
      type: 'info',
    };

    // 1. Immediately create persistent record in dbStore so scan_id is guaranteed to exist
    const initialReport: FullScanReport = {
      id: tempId,
      websiteId,
      targetUrl: trimmedUrl,
      domain,
      status: 'initializing',
      progressPercent: 5,
      currentStepMessage: 'SSRF Security Validation: Initializing scan engine & security guard...',
      scanDepth,
      createdAt: new Date().toISOString(),
      durationMs: 0,
      scores: {
        accessibility: 0,
        performance: 0,
        seo: 0,
        security: 0,
        overallQuality: 0,
        breakdown: {
          critical: 0,
          serious: 0,
          moderate: 0,
          minor: 0,
          passedChecks: 0,
          incompleteChecks: 0,
        },
      },
      pages: [],
      issues: [],
      seoSummary: [],
      perfSummary: [],
      securitySummary: [],
      logs: [initialLog],
    };

    dbStore.saveScan(initialReport);

    // 2. Set active in-memory record
    activeScans.set(tempId, {
      id: tempId,
      targetUrl: trimmedUrl,
      status: 'initializing',
      progressPercent: 5,
      stepMessage: 'SSRF Security Validation: Initializing scan engine & security guard...',
      stage: 'SSRF Security Validation',
      logs: [initialLog],
      pagesDone: 0,
      totalPages: scanDepth === 'quick' ? 1 : scanDepth === 'standard' ? 10 : 30,
    });

    // 3. Start asynchronous background scan
    (async () => {
      try {
        const fullReport = await crawlAndAuditWebsite(trimmedUrl, {
          depth: scanDepth,
          onProgress: (p) => {
            const current = activeScans.get(tempId);
            if (current) {
              current.progressPercent = p.percent;
              current.stepMessage = p.stepMessage;
              current.stage = p.stage || current.stage;
              current.logs.push(p.log);
              current.pagesDone = p.pagesDone;
              current.totalPages = p.totalPages;
              current.status = p.percent >= 100 ? 'completed' : 'analyzing';
            }

            // Keep persistent record updated with progress
            const dbRec = dbStore.getScan(tempId);
            if (dbRec) {
              dbRec.progressPercent = p.percent;
              dbRec.currentStepMessage = p.stepMessage;
              dbRec.logs.push(p.log);
              dbStore.saveScan(dbRec);
            }
          },
        });

        // Store completed report into DB
        fullReport.id = tempId;
        dbStore.saveScan(fullReport);

        const current = activeScans.get(tempId);
        if (current) {
          current.status = 'completed';
          current.progressPercent = 100;
          current.stepMessage = 'Audit completed successfully';
        }
      } catch (scanErr: any) {
        logServerException('Audit execution failed', scanErr, { scanId: tempId, targetUrl: trimmedUrl });
        const auditErr = normalizeToAuditException(scanErr, 'DOM Extraction & Crawling', trimmedUrl);

        const current = activeScans.get(tempId);
        if (current) {
          current.status = 'failed';
          current.error = auditErr.userFriendlyMessage;
          current.errorCode = auditErr.code;
          current.errorDetail = auditErr.toErrorDetail();
          current.stepMessage = `Scan failed: ${auditErr.userFriendlyMessage}`;
          current.logs.push({
            timestamp: new Date().toISOString(),
            message: `[${auditErr.code}] ${auditErr.userFriendlyMessage}`,
            type: 'error',
          });
        }

        // Save structured failed scan to persistent store
        try {
          const failedReport: FullScanReport = {
            id: tempId,
            websiteId,
            targetUrl: trimmedUrl,
            domain,
            status: 'failed',
            progressPercent: 100,
            currentStepMessage: `Scan failed: ${auditErr.userFriendlyMessage}`,
            scanDepth,
            createdAt: initialReport.createdAt,
            completedAt: new Date().toISOString(),
            durationMs: 0,
            scores: {
              accessibility: 0,
              performance: 0,
              seo: 0,
              security: 0,
              overallQuality: 0,
              breakdown: {
                critical: 0,
                serious: 0,
                moderate: 0,
                minor: 0,
                passedChecks: 0,
                incompleteChecks: 0,
              },
            },
            pages: [],
            issues: [],
            seoSummary: [],
            perfSummary: [],
            securitySummary: [],
            logs: current?.logs || [
              { timestamp: new Date().toISOString(), message: `[${auditErr.code}] ${auditErr.userFriendlyMessage}`, type: 'error' },
            ],
            errorMessage: auditErr.userFriendlyMessage,
            errorCode: auditErr.code,
            errorDetail: auditErr.toErrorDetail(),
          };
          dbStore.saveScan(failedReport);
        } catch {
          // ignore fallback
        }
      }
    })();

    // 4. Return standard structured response
    return res.status(202).json({
      success: true,
      scan_id: tempId,
      scanId: tempId,
      status: 'queued',
      url: trimmedUrl,
      message: 'Scan initiated successfully.',
    });
  } catch (err: any) {
    const auditErr = normalizeToAuditException(err, 'Initializing scan');
    return res.status(auditErr.statusCode).json(formatErrorResponse(auditErr));
  }
});

/**
 * GET /api/scans
 * Returns all past scans.
 */
apiRouter.get('/scans', (req: Request, res: Response) => {
  try {
    const scans = dbStore.getAllScans();
    return res.json({ success: true, scans });
  } catch (err: any) {
    const auditErr = normalizeToAuditException(err);
    return res.status(auditErr.statusCode).json(formatErrorResponse(auditErr));
  }
});

/**
 * GET /api/scans/:scan_id
 * Retrieves scan report or live progress.
 */
apiRouter.get('/scans/:scan_id', (req: Request, res: Response) => {
  const { scan_id } = req.params;

  try {
    // Check finished store first
    const stored = dbStore.getScan(scan_id);
    if (stored) {
      return res.json({
        success: true,
        scan_id: stored.id,
        scan: stored,
        isComplete: stored.status === 'completed' || stored.status === 'failed',
        isFailed: stored.status === 'failed',
        status: stored.status,
      });
    }

    // Check active scans
    const active = activeScans.get(scan_id);
    if (active) {
      const isFailed = active.status === 'failed';
      const isComplete = active.status === 'completed' || isFailed;

      return res.json({
        success: true,
        scan_id: active.id,
        scan: {
          id: active.id,
          targetUrl: active.targetUrl,
          status: active.status,
          progressPercent: active.progressPercent,
          currentStepMessage: active.stepMessage,
          stage: active.stage,
          logs: active.logs,
          pagesDone: active.pagesDone,
          totalPages: active.totalPages,
          errorMessage: active.error,
          errorCode: active.errorCode,
          errorDetail: active.errorDetail,
        },
        isComplete,
        isFailed,
        status: active.status,
      });
    }

    // Scan record truly not found
    return res.status(404).json(
      formatErrorResponse(
        new AuditException({
          code: 'SCAN_NOT_FOUND',
          statusCode: 404,
          message: `Scan record "${scan_id}" was not found.`,
          userFriendlyMessage: `Audit scan record "${scan_id}" was not found. It may have expired or been cleared.`,
          suggestion: 'Start a new website scan from the dashboard.',
        })
      )
    );
  } catch (err: any) {
    const auditErr = normalizeToAuditException(err);
    return res.status(auditErr.statusCode).json(formatErrorResponse(auditErr));
  }
});

/**
 * GET /api/scans/:scan_id/summary
 * Returns top-level metrics and scores for dashboard.
 */
apiRouter.get('/scans/:scan_id/summary', (req: Request, res: Response) => {
  const { scan_id } = req.params;
  try {
    const scan = dbStore.getScan(scan_id);
    if (!scan) {
      const err = createScanNotFoundError(scan_id);
      return res.status(err.statusCode).json(formatErrorResponse(err));
    }

    return res.json({
      success: true,
      id: scan.id,
      domain: scan.domain,
      targetUrl: scan.targetUrl,
      status: scan.status,
      scores: scan.scores,
      pagesCount: scan.pages?.length || 0,
      issuesCount: scan.issues?.length || 0,
      createdAt: scan.createdAt,
      durationMs: scan.durationMs,
      limitationsNotice: scan.limitationsNotice,
      errorDetail: scan.errorDetail,
    });
  } catch (err: any) {
    const auditErr = normalizeToAuditException(err);
    return res.status(auditErr.statusCode).json(formatErrorResponse(auditErr));
  }
});

/**
 * GET /api/scans/:scan_id/issues
 * Returns filtered and searched accessibility issues.
 */
apiRouter.get('/scans/:scan_id/issues', (req: Request, res: Response) => {
  const { scan_id } = req.params;
  const { severity, category, wcag, search, status } = req.query;

  try {
    const scan = dbStore.getScan(scan_id);
    if (!scan) {
      const err = createScanNotFoundError(scan_id);
      return res.status(err.statusCode).json(formatErrorResponse(err));
    }

    let issues = [...(scan.issues || [])];

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

    return res.json({ success: true, issues, totalCount: issues.length });
  } catch (err: any) {
    const auditErr = normalizeToAuditException(err);
    return res.status(auditErr.statusCode).json(formatErrorResponse(auditErr));
  }
});

/**
 * GET /api/issues/:issue_id
 * Returns a specific issue by ID from any scan.
 */
apiRouter.get('/issues/:issue_id', (req: Request, res: Response) => {
  const { issue_id } = req.params;
  try {
    const scans = dbStore.getAllScans();

    for (const s of scans) {
      const found = s.issues?.find((i) => i.id === issue_id);
      if (found) {
        return res.json({ success: true, issue: found, scanId: s.id, domain: s.domain });
      }
    }

    return res.status(404).json(
      formatErrorResponse(
        new AuditException({
          code: 'AUDIT_ERROR',
          statusCode: 404,
          message: `Issue "${issue_id}" not found.`,
          userFriendlyMessage: `Accessibility issue identifier "${issue_id}" was not found.`,
        })
      )
    );
  } catch (err: any) {
    const auditErr = normalizeToAuditException(err);
    return res.status(auditErr.statusCode).json(formatErrorResponse(auditErr));
  }
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
        const found = s.issues?.find((i) => i.id === issue_id);
        if (found) {
          targetIssue = found;
          break;
        }
      }
    }

    if (!targetIssue) {
      return res.status(404).json(
        formatErrorResponse(
          new AuditException({
            code: 'AUDIT_ERROR',
            statusCode: 404,
            message: 'Issue data not found for AI explanation.',
            userFriendlyMessage: 'The selected accessibility issue could not be found to generate an AI explanation.',
          })
        )
      );
    }

    const explanation = await explainAccessibilityIssue(targetIssue);
    return res.json({ success: true, explanation });
  } catch (err: any) {
    logServerException('AI Explanation failure', err);
    const auditErr = normalizeToAuditException(err, 'AI Explanation');
    return res.status(auditErr.statusCode).json(formatErrorResponse(auditErr));
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
        const found = s.issues?.find((i) => i.id === issue_id);
        if (found) {
          targetIssue = found;
          break;
        }
      }
    }

    if (!targetIssue) {
      return res.status(404).json(
        formatErrorResponse(
          new AuditException({
            code: 'AUDIT_ERROR',
            statusCode: 404,
            message: 'Issue data not found for AI fix generation.',
            userFriendlyMessage: 'The selected accessibility issue could not be found to generate an automated fix.',
          })
        )
      );
    }

    const remediation = await generateRemediationFix(targetIssue, framework, customSnippet);
    return res.json({ success: true, remediation });
  } catch (err: any) {
    logServerException('AI Fix generation failure', err);
    const auditErr = normalizeToAuditException(err, 'AI Remediation');
    return res.status(auditErr.statusCode).json(formatErrorResponse(auditErr));
  }
});

/**
 * POST /api/ai/assistant
 * Interactive AI Assistant for accessibility Q&A.
 */
apiRouter.post('/ai/assistant', async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json(
        formatErrorResponse(
          new AuditException({
            code: 'SERVER_ERROR',
            statusCode: 400,
            message: 'Question message is required.',
            userFriendlyMessage: 'Please type a question to ask the accessibility specialist.',
          })
        )
      );
    }

    const reply = await queryAccessibilityAssistant(message, context);
    return res.json({ success: true, reply });
  } catch (err: any) {
    logServerException('AI Assistant failure', err);
    const auditErr = normalizeToAuditException(err, 'AI Specialist Assistant');
    return res.status(auditErr.statusCode).json(formatErrorResponse(auditErr));
  }
});

/**
 * GET /api/websites
 * Lists all audited websites.
 */
apiRouter.get('/websites', (req: Request, res: Response) => {
  try {
    const websites = dbStore.getAllWebsites();
    return res.json({ success: true, websites });
  } catch (err: any) {
    const auditErr = normalizeToAuditException(err);
    return res.status(auditErr.statusCode).json(formatErrorResponse(auditErr));
  }
});

/**
 * GET /api/websites/:website_id
 * Returns website profile and historical trend data.
 */
apiRouter.get('/websites/:website_id', (req: Request, res: Response) => {
  const { website_id } = req.params;
  try {
    const site = dbStore.getWebsite(website_id);
    if (!site) {
      return res.status(404).json(
        formatErrorResponse(
          new AuditException({
            code: 'SERVER_ERROR',
            statusCode: 404,
            message: `Website "${website_id}" not found.`,
            userFriendlyMessage: `Website profile "${website_id}" was not found in the database.`,
          })
        )
      );
    }

    const scans = dbStore.getWebsiteScans(website_id);
    return res.json({ success: true, website: site, scans });
  } catch (err: any) {
    const auditErr = normalizeToAuditException(err);
    return res.status(auditErr.statusCode).json(formatErrorResponse(auditErr));
  }
});

/**
 * GET /api/scans/compare
 * Compares two scans side-by-side.
 */
apiRouter.get('/scans/compare', (req: Request, res: Response) => {
  const { scanA: idA, scanB: idB } = req.query;
  if (!idA || !idB || typeof idA !== 'string' || typeof idB !== 'string') {
    return res.status(400).json(
      formatErrorResponse(
        new AuditException({
          code: 'SERVER_ERROR',
          statusCode: 400,
          message: 'Both "scanA" and "scanB" query parameters are required.',
          userFriendlyMessage: 'Please select two valid scan reports to compare.',
        })
      )
    );
  }

  try {
    const scanA = dbStore.getScan(idA);
    const scanB = dbStore.getScan(idB);

    if (!scanA || !scanB) {
      return res.status(404).json(
        formatErrorResponse(
          new AuditException({
            code: 'SERVER_ERROR',
            statusCode: 404,
            message: 'One or both specified scans were not found for comparison.',
            userFriendlyMessage: 'One or both selected scan reports could not be found.',
          })
        )
      );
    }

    const scoreDelta = (scanB.scores?.overallQuality || 0) - (scanA.scores?.overallQuality || 0);
    const a11yDelta = (scanB.scores?.accessibility || 0) - (scanA.scores?.accessibility || 0);

    // Compare issues
    const rulesA = new Map((scanA.issues || []).map((i) => [i.ruleId, i]));
    const rulesB = new Map((scanB.issues || []).map((i) => [i.ruleId, i]));

    const fixedIssues = (scanA.issues || []).filter((i) => !rulesB.has(i.ruleId));
    const newIssues = (scanB.issues || []).filter((i) => !rulesA.has(i.ruleId));
    const unchangedIssues = (scanB.issues || []).filter((i) => rulesA.has(i.ruleId));

    const deltaBreakdown = {
      critical: (scanB.scores?.breakdown?.critical || 0) - (scanA.scores?.breakdown?.critical || 0),
      serious: (scanB.scores?.breakdown?.serious || 0) - (scanA.scores?.breakdown?.serious || 0),
      moderate: (scanB.scores?.breakdown?.moderate || 0) - (scanA.scores?.breakdown?.moderate || 0),
      minor: (scanB.scores?.breakdown?.minor || 0) - (scanA.scores?.breakdown?.minor || 0),
    };

    return res.json({
      success: true,
      scanA,
      scanB,
      scoreDelta,
      a11yDelta,
      deltaBreakdown,
      fixedIssues,
      newIssues,
      unchangedIssues,
    });
  } catch (err: any) {
    const auditErr = normalizeToAuditException(err);
    return res.status(auditErr.statusCode).json(formatErrorResponse(auditErr));
  }
});

/**
 * GET /api/monitoring
 * Lists scheduled monitoring tasks.
 */
apiRouter.get('/monitoring', (req: Request, res: Response) => {
  try {
    const monitors = dbStore.getAllScheduledMonitors();
    return res.json({ success: true, monitors });
  } catch (err: any) {
    const auditErr = normalizeToAuditException(err);
    return res.status(auditErr.statusCode).json(formatErrorResponse(auditErr));
  }
});

/**
 * POST /api/monitoring
 * Creates a new scheduled scan monitor.
 */
apiRouter.post('/monitoring', (req: Request, res: Response) => {
  const { targetUrl, frequency = 'weekly', depth = 'standard', notifyEmail, alertThresholdScore = 80 } = req.body;
  if (!targetUrl || typeof targetUrl !== 'string' || targetUrl.trim().length === 0) {
    return res.status(400).json(
      formatErrorResponse(
        createInvalidUrlError('Target URL is required for scheduled monitoring.', undefined, targetUrl)
      )
    );
  }

  try {
    const formatted = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
    const domain = new URL(formatted).hostname;
    const websiteId = `site_${domain.replace(/[^a-z0-9]/gi, '_')}`;
    const id = `monitor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newMonitor = {
      id,
      websiteId,
      domain,
      targetUrl: formatted,
      frequency,
      depth,
      nextRun: new Date(Date.now() + 7 * 86400000).toISOString(),
      notifyEmail: notifyEmail || 'auditor@accessaudit.ai',
      alertThresholdScore: Number(alertThresholdScore) || 80,
      active: true,
    };

    dbStore.saveScheduledMonitoring(newMonitor);
    return res.status(201).json({ success: true, monitor: newMonitor, message: 'Scheduled monitoring enabled.' });
  } catch (err: any) {
    return res.status(400).json(
      formatErrorResponse(
        createInvalidUrlError('Invalid target URL provided for scheduled monitoring.', err?.message, targetUrl)
      )
    );
  }
});

/**
 * DELETE /api/monitoring/:id
 * Removes a scheduled monitor.
 */
apiRouter.delete('/monitoring/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deleted = dbStore.deleteScheduledMonitoring(id);
    if (!deleted) {
      return res.status(404).json(
        formatErrorResponse(
          new AuditException({
            code: 'SERVER_ERROR',
            statusCode: 404,
            message: `Scheduled monitor "${id}" not found.`,
            userFriendlyMessage: `Scheduled monitor "${id}" was not found.`,
          })
        )
      );
    }
    return res.json({ success: true, message: 'Monitoring removed.' });
  } catch (err: any) {
    const auditErr = normalizeToAuditException(err);
    return res.status(auditErr.statusCode).json(formatErrorResponse(auditErr));
  }
});
