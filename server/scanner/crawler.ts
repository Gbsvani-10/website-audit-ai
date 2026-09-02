import { URL } from 'url';
import { validateSafeUrl } from './ssrf.js';
import { runAccessibilityEngine } from './axeRules.js';
import { runSeoAudit } from './seoAuditor.js';
import { runPerformanceAudit } from './perfAuditor.js';
import { runSecurityAudit } from './securityAuditor.js';
import { calculateAccessibilityScore, calculateOverallWebsiteQuality } from './scoring.js';
import {
  createInvalidUrlError,
  createSsrfBlockedError,
  createTargetUnreachableError,
  createTargetTimeoutError,
  createAccessDeniedError,
  createAuditError,
  createBrowserError,
  normalizeToAuditException,
  logServerException,
} from '../utils/errors.js';
import type { FullScanReport, PageAuditResult, ScanDepth, ScanLogEntry, AccessibilityIssue } from '../../src/types/index.js';

interface CrawlOptions {
  depth: ScanDepth;
  onProgress?: (progress: {
    percent: number;
    stepMessage: string;
    log: ScanLogEntry;
    pagesDone: number;
    totalPages: number;
    stage?: string;
  }) => void;
}

const MAX_PAGES_BY_DEPTH: Record<ScanDepth, number> = {
  quick: 1,
  standard: 10,
  deep: 30,
};

const REQUEST_TIMEOUT_MS = 12000;

export async function crawlAndAuditWebsite(
  targetUrl: string,
  options: CrawlOptions
): Promise<FullScanReport> {
  const startTime = Date.now();
  const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const logs: ScanLogEntry[] = [];

  function addLog(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const entry: ScanLogEntry = {
      timestamp: new Date().toISOString(),
      message,
      type,
    };
    logs.push(entry);
    return entry;
  }

  // ----------------------------------------------------
  // Stage 1: SSRF Security Validation (5% - 15%)
  // ----------------------------------------------------
  const ssrfStage = 'SSRF Security Validation';
  const ssrfEntry = addLog(`Validating target URL "${targetUrl}" with SSRF security guard...`, 'info');
  options.onProgress?.({
    percent: 10,
    stepMessage: 'SSRF Security Validation: Checking target host and IP safety...',
    log: ssrfEntry,
    pagesDone: 0,
    totalPages: 1,
    stage: ssrfStage,
  });

  const safeCheck = await validateSafeUrl(targetUrl);
  if (!safeCheck.valid || !safeCheck.normalizedUrl) {
    const errReason = safeCheck.error || 'Blocked by SSRF security policy';
    const errEntry = addLog(`SSRF Validation failed: ${errReason}`, 'error');
    options.onProgress?.({
      percent: 100,
      stepMessage: `Scan failed: ${errReason}`,
      log: errEntry,
      pagesDone: 0,
      totalPages: 1,
      stage: ssrfStage,
    });

    if (errReason.includes('Invalid URL') || errReason.includes('protocol') || errReason.includes('Protocol')) {
      throw createInvalidUrlError(errReason, undefined, targetUrl);
    }
    throw createSsrfBlockedError(errReason, undefined, targetUrl);
  }

  const validUrl = safeCheck.normalizedUrl;
  const parsedRoot = new URL(validUrl);
  const targetDomain = parsedRoot.hostname;
  const websiteId = `site_${targetDomain.replace(/[^a-z0-9]/gi, '_')}`;

  addLog(`SSRF Check passed. Domain: ${targetDomain} (Protocol: ${parsedRoot.protocol})`, 'success');

  // ----------------------------------------------------
  // Stage 2: DOM Extraction & Crawling (15% - 50%)
  // ----------------------------------------------------
  const crawlStage = 'DOM Extraction & Crawling';
  const maxPages = MAX_PAGES_BY_DEPTH[options.depth] || 1;
  const visited = new Set<string>();
  const queue: string[] = [validUrl];
  const pagesResults: PageAuditResult[] = [];
  const aggregatedIssuesMap = new Map<string, AccessibilityIssue>();

  let totalPassedChecks = 0;
  let totalHttpTime = 0;
  let totalHtmlSize = 0;
  let rootSecurityObs: any[] = [];
  let rootSecurityScore = 85;

  let scannedCount = 0;
  let lastFetchError: Error | null = null;

  while (queue.length > 0 && scannedCount < maxPages) {
    const currentUrl = queue.shift()!;
    const normalizedCurrent = normalizeUrl(currentUrl);
    if (visited.has(normalizedCurrent)) continue;
    visited.add(normalizedCurrent);

    scannedCount++;
    const crawlPercent = Math.min(50, Math.round((scannedCount / maxPages) * 30) + 15);
    const crawlLog = addLog(`[${scannedCount}/${maxPages}] Fetching and inspecting DOM: ${currentUrl}`, 'info');
    options.onProgress?.({
      percent: crawlPercent,
      stepMessage: `DOM Extraction & Crawling: Inspecting page ${scannedCount} of ${Math.min(maxPages, queue.length + scannedCount)}: ${currentUrl}`,
      log: crawlLog,
      pagesDone: scannedCount,
      totalPages: Math.min(maxPages, queue.length + scannedCount),
      stage: crawlStage,
    });

    try {
      const pageStart = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(currentUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AccessAuditAI/1.0; +https://accessaudit.ai/bot)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          throw createTargetTimeoutError(
            `Connection to ${currentUrl} timed out after ${REQUEST_TIMEOUT_MS}ms`,
            fetchErr.stack,
            currentUrl
          );
        }
        throw createTargetUnreachableError(
          `Network error connecting to ${currentUrl}: ${fetchErr.message}`,
          fetchErr.stack,
          currentUrl
        );
      } finally {
        clearTimeout(timeoutId);
      }

      if (response.status === 401 || response.status === 403 || response.status === 429) {
        if (scannedCount === 1) {
          throw createAccessDeniedError(
            `Target returned HTTP ${response.status} (${response.statusText || 'Forbidden/Protected'})`,
            undefined,
            currentUrl
          );
        } else {
          addLog(`Skipping ${currentUrl}: HTTP ${response.status} Access Denied`, 'warning');
          continue;
        }
      }

      const fetchDuration = Date.now() - pageStart;
      totalHttpTime += fetchDuration;

      const htmlText = await response.text();
      totalHtmlSize += htmlText.length;

      if (!htmlText || htmlText.trim().length === 0) {
        if (scannedCount === 1) {
          throw createBrowserError(`Empty response received from ${currentUrl}`, undefined, currentUrl);
        }
      }

      // Extract response headers for security check
      const headersObj: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        headersObj[key] = val;
      });

      // ----------------------------------------------------
      // Stage 3: Deterministic axe-core Audit (50% - 75%)
      // ----------------------------------------------------
      const a11yStage = 'Deterministic axe-core Audit';
      const a11yPercent = Math.min(75, 50 + Math.round((scannedCount / maxPages) * 20));
      options.onProgress?.({
        percent: a11yPercent,
        stepMessage: `Deterministic axe-core Audit: Evaluating WCAG 2.1 rules on ${currentUrl}`,
        log: addLog(`Evaluating accessibility rules for ${currentUrl}...`, 'info'),
        pagesDone: scannedCount,
        totalPages: Math.min(maxPages, queue.length + scannedCount),
        stage: a11yStage,
      });

      let a11y;
      try {
        a11y = runAccessibilityEngine(htmlText, currentUrl);
      } catch (axeErr: any) {
        throw createAuditError(`axe-core evaluation failed on ${currentUrl}: ${axeErr.message}`, axeErr.stack, currentUrl);
      }
      totalPassedChecks += a11y.passedCount;

      // ----------------------------------------------------
      // Stage 4: SEO, Performance & Security Scoring (75% - 90%)
      // ----------------------------------------------------
      const scoringStage = 'SEO, Performance & Security Scoring';
      const seo = runSeoAudit(htmlText, currentUrl);
      const perf = runPerformanceAudit(htmlText, fetchDuration, htmlText.length);
      const sec = runSecurityAudit(headersObj, currentUrl.startsWith('https://'));

      if (scannedCount === 1) {
        rootSecurityObs = sec.securityObservations;
        rootSecurityScore = sec.securityScore;
      }

      // Page scores calculation
      const a11yScoreObj = calculateAccessibilityScore(a11y.issues, a11y.passedCount);
      const pageOverall = calculateOverallWebsiteQuality(
        a11yScoreObj.score,
        perf.perfScore,
        seo.seoScore,
        sec.securityScore
      );

      const pageScores = {
        accessibility: a11yScoreObj.score,
        performance: perf.perfScore,
        seo: seo.seoScore,
        security: sec.securityScore,
        overallQuality: pageOverall,
        breakdown: a11yScoreObj.breakdown,
      };

      // Extract title
      const titleMatch = htmlText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1].trim() : targetDomain;

      const pageAudit: PageAuditResult = {
        id: `page_${scannedCount}_${Math.random().toString(36).substring(2, 7)}`,
        url: currentUrl,
        title: pageTitle,
        loadTimeMs: fetchDuration,
        httpStatus: response.status,
        scores: pageScores,
        issuesCount: a11y.issues.length,
        issues: a11y.issues,
        seoChecks: seo.seoChecks,
        perfMetrics: perf.perfMetrics,
        securityObservations: sec.securityObservations,
      };

      pagesResults.push(pageAudit);

      // Merge issues across pages
      for (const issue of a11y.issues) {
        if (!aggregatedIssuesMap.has(issue.ruleId)) {
          aggregatedIssuesMap.set(issue.ruleId, { ...issue, affectedElements: [...issue.affectedElements] });
        } else {
          const existing = aggregatedIssuesMap.get(issue.ruleId)!;
          existing.affectedElements.push(...issue.affectedElements);
          existing.occurrencesCount = existing.affectedElements.length;
        }
      }

      // Discover internal links if not reached depth limit
      if (scannedCount < maxPages) {
        const linkRegex = /href\s*=\s*["']([^"'#\s]+)["']/gi;
        let match;
        while ((match = linkRegex.exec(htmlText)) !== null) {
          const rawLink = match[1];
          try {
            const resolved = new URL(rawLink, currentUrl);
            if (
              resolved.hostname === targetDomain &&
              (resolved.protocol === 'http:' || resolved.protocol === 'https:')
            ) {
              const norm = normalizeUrl(resolved.toString());
              if (
                !visited.has(norm) &&
                !queue.includes(norm) &&
                !norm.match(/\.(png|jpg|jpeg|gif|svg|pdf|css|js|woff|woff2|ico)$/i)
              ) {
                queue.push(norm);
              }
            }
          } catch {
            // ignore malformed URLs in DOM
          }
        }
      }
    } catch (pageErr: any) {
      lastFetchError = pageErr;
      if (scannedCount === 1) {
        logServerException('Primary page crawl failure', pageErr, { targetUrl: currentUrl });
        throw normalizeToAuditException(pageErr, crawlStage, currentUrl);
      } else {
        addLog(`Subpage warning (${currentUrl}): ${pageErr.message || 'Page skipped'}`, 'warning');
      }
    }
  }

  // Handle case where target website failed to respond
  if (pagesResults.length === 0) {
    if (lastFetchError) {
      throw normalizeToAuditException(lastFetchError, crawlStage, targetUrl);
    }
    throw createTargetUnreachableError(
      `Could not load "${targetUrl}". Target server did not respond or blocked incoming automated crawler requests.`,
      undefined,
      targetUrl
    );
  }

  // ----------------------------------------------------
  // Stage 5: Report Finalization (90% - 100%)
  // ----------------------------------------------------
  const finalStage = 'Report Finalization';
  const finalizeLog = addLog('Synthesizing WCAG accessibility findings, SEO signals, and performance metrics...', 'info');
  options.onProgress?.({
    percent: 92,
    stepMessage: 'Report Finalization: Calculating overall quality scores and index',
    log: finalizeLog,
    pagesDone: scannedCount,
    totalPages: scannedCount,
    stage: finalStage,
  });

  const allIssues = Array.from(aggregatedIssuesMap.values());
  const a11yScoreObj = calculateAccessibilityScore(allIssues, totalPassedChecks);

  // Aggregate SEO, Perf, Sec scores across pages
  const avgSeo = Math.round(pagesResults.reduce((acc, p) => acc + p.scores.seo, 0) / pagesResults.length);
  const avgPerf = Math.round(pagesResults.reduce((acc, p) => acc + p.scores.performance, 0) / pagesResults.length);
  const overallQuality = calculateOverallWebsiteQuality(
    a11yScoreObj.score,
    avgPerf,
    avgSeo,
    rootSecurityScore
  );

  const finalScores = {
    accessibility: a11yScoreObj.score,
    performance: avgPerf,
    seo: avgSeo,
    security: rootSecurityScore,
    overallQuality: overallQuality,
    breakdown: a11yScoreObj.breakdown,
  };

  const finalLog = addLog(
    `Audit complete: Overall Quality ${overallQuality}/100, AccessAudit ${a11yScoreObj.score}/100 with ${allIssues.length} unique issue rules detected across ${pagesResults.length} page(s).`,
    'success'
  );
  options.onProgress?.({
    percent: 100,
    stepMessage: 'Report Finalization: Audit completed successfully',
    log: finalLog,
    pagesDone: scannedCount,
    totalPages: scannedCount,
    stage: finalStage,
  });

  return {
    id: scanId,
    websiteId,
    targetUrl: validUrl,
    domain: targetDomain,
    status: 'completed',
    progressPercent: 100,
    currentStepMessage: 'Audit complete',
    scanDepth: options.depth,
    createdAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    scores: finalScores,
    pages: pagesResults,
    issues: allIssues,
    seoSummary: pagesResults[0]?.seoChecks || [],
    perfSummary: pagesResults[0]?.perfMetrics || [],
    securitySummary: rootSecurityObs,
    logs,
    limitationsNotice:
      'Automated audit — manual testing and screen reader user verification may still be required for full WCAG compliance certification.',
  };
}

function normalizeUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    u.hash = '';
    let path = u.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    u.pathname = path;
    return u.toString();
  } catch {
    return urlStr;
  }
}
