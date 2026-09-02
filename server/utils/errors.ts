import type { AuditErrorCode, ApiErrorDetail } from '../../src/types/index.js';

export interface AuditExceptionOptions {
  code: AuditErrorCode;
  message: string;
  userFriendlyMessage: string;
  suggestion?: string;
  details?: string;
  statusCode?: number;
  stage?: string;
  targetUrl?: string;
  cause?: unknown;
}

export class AuditException extends Error {
  public readonly code: AuditErrorCode;
  public readonly statusCode: number;
  public readonly userFriendlyMessage: string;
  public readonly suggestion?: string;
  public readonly details?: string;
  public readonly stage?: string;
  public readonly targetUrl?: string;
  public readonly timestamp: string;

  constructor(options: AuditExceptionOptions) {
    super(options.message);
    this.name = 'AuditException';
    this.code = options.code;
    this.statusCode = options.statusCode ?? getHttpStatusForCode(options.code);
    this.userFriendlyMessage = options.userFriendlyMessage;
    this.suggestion = options.suggestion;
    this.details = options.details;
    this.stage = options.stage;
    this.targetUrl = options.targetUrl;
    this.timestamp = new Date().toISOString();

    if (options.cause && typeof options.cause === 'object') {
      (this as any).cause = options.cause;
    }

    Object.setPrototypeOf(this, AuditException.prototype);
  }

  public toErrorDetail(): ApiErrorDetail {
    return {
      code: this.code,
      message: this.message,
      userFriendlyMessage: this.userFriendlyMessage,
      suggestion: this.suggestion,
      details: this.details,
      stage: this.stage,
      targetUrl: this.targetUrl,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
    };
  }
}

export function getHttpStatusForCode(code: AuditErrorCode): number {
  switch (code) {
    case 'INVALID_URL':
      return 400;
    case 'SSRF_BLOCKED':
      return 403;
    case 'DNS_ERROR':
    case 'TARGET_UNREACHABLE':
    case 'TARGET_HTTP_ERROR':
    case 'TARGET_REDIRECT_ERROR':
      return 502;
    case 'TARGET_TIMEOUT':
      return 504;
    case 'ACCESS_DENIED':
      return 403;
    case 'SCAN_NOT_FOUND':
      return 404;
    case 'BROWSER_ERROR':
    case 'CRAWLER_ERROR':
    case 'QUEUE_ERROR':
    case 'DATABASE_ERROR':
    case 'AUDIT_ERROR':
    case 'SERVER_ERROR':
    default:
      return 500;
  }
}

export function createInvalidUrlError(
  message: string,
  details?: string,
  targetUrl?: string
): AuditException {
  return new AuditException({
    code: 'INVALID_URL',
    statusCode: 400,
    message,
    userFriendlyMessage: `The provided URL "${targetUrl || ''}" is malformed or uses an unsupported protocol.`,
    suggestion: 'Please enter a valid, fully-qualified web address starting with https:// or http:// (e.g., https://example.com).',
    details,
    stage: 'SSRF Security Validation',
    targetUrl,
  });
}

export function createSsrfBlockedError(
  message: string,
  details?: string,
  targetUrl?: string
): AuditException {
  return new AuditException({
    code: 'SSRF_BLOCKED',
    statusCode: 403,
    message,
    userFriendlyMessage: 'The requested address is blocked by the Server-Side Request Forgery (SSRF) security guard.',
    suggestion: 'Scanning private IP addresses, loopback (localhost), and cloud metadata endpoints is prohibited.',
    details,
    stage: 'SSRF Security Validation',
    targetUrl,
  });
}

export function createDnsError(
  message: string,
  details?: string,
  targetUrl?: string
): AuditException {
  return new AuditException({
    code: 'DNS_ERROR',
    statusCode: 502,
    message,
    userFriendlyMessage: `Domain Name System (DNS) resolution failed for "${targetUrl || 'the host'}". The domain does not exist or DNS is unreachable.`,
    suggestion: 'Verify that the domain name is spelled correctly and configured with active public DNS nameservers.',
    details,
    stage: 'SSRF Security Validation',
    targetUrl,
  });
}

export function createTargetUnreachableError(
  message: string,
  details?: string,
  targetUrl?: string
): AuditException {
  return new AuditException({
    code: 'TARGET_UNREACHABLE',
    statusCode: 502,
    message,
    userFriendlyMessage: `Could not connect to "${targetUrl || 'the target website'}". The host is unreachable, offline, or refusing connections.`,
    suggestion: 'Verify that the target website is online in a public browser and accessible via standard HTTPS/HTTP ports.',
    details,
    stage: 'DOM Extraction & Crawling',
    targetUrl,
  });
}

export function createTargetTimeoutError(
  message: string,
  details?: string,
  targetUrl?: string
): AuditException {
  return new AuditException({
    code: 'TARGET_TIMEOUT',
    statusCode: 504,
    message,
    userFriendlyMessage: `The target server at "${targetUrl || 'the website'}" took too long to respond (request timed out).`,
    suggestion: 'The website may be experiencing high latency or rate-limiting. Try testing in Quick Scan mode or re-scanning later.',
    details,
    stage: 'DOM Extraction & Crawling',
    targetUrl,
  });
}

export function createTargetHttpError(
  httpStatus: number,
  message: string,
  details?: string,
  targetUrl?: string
): AuditException {
  const is404 = httpStatus === 404;
  return new AuditException({
    code: 'TARGET_HTTP_ERROR',
    statusCode: 502,
    message,
    userFriendlyMessage: is404
      ? `The target website returned HTTP 404 (Not Found) and could not be audited.`
      : `The target website returned HTTP ${httpStatus} error and could not complete audit.`,
    suggestion: is404
      ? 'Verify that the specific URL path exists on the website and is publicly reachable.'
      : 'Check that the target website web server is operating without 5xx/4xx errors.',
    details,
    stage: 'DOM Extraction & Crawling',
    targetUrl,
  });
}

export function createTargetRedirectError(
  message: string,
  details?: string,
  targetUrl?: string
): AuditException {
  return new AuditException({
    code: 'TARGET_REDIRECT_ERROR',
    statusCode: 502,
    message,
    userFriendlyMessage: `Target URL redirection error: either exceeded redirect limit or redirected to an unsafe/blocked address.`,
    suggestion: 'Provide the direct final destination URL rather than an intermediary redirect link.',
    details,
    stage: 'DOM Extraction & Crawling',
    targetUrl,
  });
}

export function createAccessDeniedError(
  message: string,
  details?: string,
  targetUrl?: string
): AuditException {
  return new AuditException({
    code: 'ACCESS_DENIED',
    statusCode: 403,
    message,
    userFriendlyMessage: `Access denied by the target server at "${targetUrl || 'the website'}" (HTTP 401/403 or Cloudflare/WAF block).`,
    suggestion: 'The website requires authentication or uses a firewall/bot challenge blocking the automated accessibility auditor.',
    details,
    stage: 'DOM Extraction & Crawling',
    targetUrl,
  });
}

export function createScanNotFoundError(
  scanId: string
): AuditException {
  return new AuditException({
    code: 'SCAN_NOT_FOUND',
    statusCode: 404,
    message: `Scan record "${scanId}" was not found.`,
    userFriendlyMessage: `The requested audit scan record "${scanId}" could not be found. It may have expired or been cleared.`,
    suggestion: 'Start a new website scan from the dashboard.',
    stage: 'Report Finalization',
  });
}

export function createQueueError(
  message: string,
  details?: string,
  targetUrl?: string
): AuditException {
  return new AuditException({
    code: 'QUEUE_ERROR',
    statusCode: 500,
    message,
    userFriendlyMessage: 'The background audit worker queue encountered an internal error.',
    suggestion: 'Please retry initiating the scan.',
    details,
    stage: 'Queue Dispatch',
    targetUrl,
  });
}

export function createDatabaseError(
  message: string,
  details?: string
): AuditException {
  return new AuditException({
    code: 'DATABASE_ERROR',
    statusCode: 500,
    message,
    userFriendlyMessage: 'The audit storage engine encountered a database operation failure.',
    suggestion: 'Please refresh the dashboard or retry your operation.',
    details,
    stage: 'Persistence Store',
  });
}

export function createBrowserError(
  message: string,
  details?: string,
  targetUrl?: string
): AuditException {
  return new AuditException({
    code: 'BROWSER_ERROR',
    statusCode: 500,
    message,
    userFriendlyMessage: 'Headless browser rendering or DOM extraction encountered an unexpected error.',
    suggestion: 'Ensure the page content is standard HTML and does not require complex non-standard browser plugins.',
    details,
    stage: 'DOM Extraction & Crawling',
    targetUrl,
  });
}

export function createCrawlerError(
  message: string,
  details?: string,
  targetUrl?: string
): AuditException {
  return new AuditException({
    code: 'CRAWLER_ERROR',
    statusCode: 500,
    message,
    userFriendlyMessage: 'Website crawling traversal could not complete page extraction.',
    suggestion: 'Try running a Quick Scan on the single homepage URL first.',
    details,
    stage: 'DOM Extraction & Crawling',
    targetUrl,
  });
}

export function createAuditError(
  message: string,
  details?: string,
  targetUrl?: string
): AuditException {
  return new AuditException({
    code: 'AUDIT_ERROR',
    statusCode: 500,
    message,
    userFriendlyMessage: 'The deterministic axe-core rule evaluation or scoring pipeline failed.',
    suggestion: 'The HTML document structure may contain malformed tags that broke accessibility rule parsing.',
    details,
    stage: 'Deterministic axe-core Audit',
    targetUrl,
  });
}

export function createServerError(
  message: string,
  details?: string,
  targetUrl?: string
): AuditException {
  return new AuditException({
    code: 'SERVER_ERROR',
    statusCode: 500,
    message,
    userFriendlyMessage: 'An internal AccessAudit AI engine error occurred.',
    suggestion: 'Please retry your scan. If the problem persists, contact platform support.',
    details,
    stage: 'Report Finalization',
    targetUrl,
  });
}

/**
 * Normalizes any unknown runtime error or exception into a structured AuditException.
 */
export function normalizeToAuditException(
  err: any,
  fallbackStage = 'DOM Extraction & Crawling',
  targetUrl?: string
): AuditException {
  if (err instanceof AuditException) {
    return err;
  }

  const rawMsg = err?.message || String(err || 'Unknown error');
  const errCode = err?.code;
  const status = err?.status || err?.statusCode;

  // SSRF checks
  if (
    rawMsg.includes('SSRF') ||
    rawMsg.includes('private or link-local') ||
    rawMsg.includes('prohibited') ||
    rawMsg.includes('loopback') ||
    rawMsg.includes('metadata')
  ) {
    return createSsrfBlockedError(rawMsg, err?.stack, targetUrl);
  }

  // Invalid URL
  if (
    rawMsg.includes('Invalid URL') ||
    rawMsg.includes('Protocol') ||
    rawMsg.includes('valid target URL') ||
    rawMsg.includes('malformed')
  ) {
    return createInvalidUrlError(rawMsg, err?.stack, targetUrl);
  }

  // Timeout
  if (
    err?.name === 'AbortError' ||
    rawMsg.includes('aborted') ||
    rawMsg.includes('timeout') ||
    rawMsg.includes('timed out') ||
    errCode === 'ETIMEDOUT' ||
    errCode === 'ESOCKETTIMEDOUT'
  ) {
    return createTargetTimeoutError(rawMsg, err?.stack, targetUrl);
  }

  // DNS Error
  if (
    errCode === 'ENOTFOUND' ||
    rawMsg.includes('ENOTFOUND') ||
    rawMsg.includes('getaddrinfo') ||
    rawMsg.includes('Could not resolve domain') ||
    rawMsg.includes('DNS resolution failed')
  ) {
    return createDnsError(rawMsg, err?.stack, targetUrl);
  }

  // Target HTTP Status Errors (404, 500, 502, 503 from target site)
  if (
    status === 404 ||
    rawMsg.includes('HTTP 404') ||
    rawMsg.includes('404 (Not Found)') ||
    rawMsg.includes('The page could not be found') ||
    rawMsg.includes('Page not found')
  ) {
    return createTargetHttpError(404, rawMsg, err?.stack, targetUrl);
  }

  if (
    (status && status >= 400 && status !== 401 && status !== 403 && status !== 429) ||
    rawMsg.includes('HTTP 500') ||
    rawMsg.includes('HTTP 502') ||
    rawMsg.includes('HTTP 503')
  ) {
    return createTargetHttpError(status || 500, rawMsg, err?.stack, targetUrl);
  }

  // Target Redirect Error
  if (
    rawMsg.includes('redirect') ||
    rawMsg.includes('Redirect') ||
    rawMsg.includes('too many redirects')
  ) {
    return createTargetRedirectError(rawMsg, err?.stack, targetUrl);
  }

  // Target Connection / Unreachable
  if (
    errCode === 'ECONNREFUSED' ||
    errCode === 'EHOSTUNREACH' ||
    errCode === 'ENETUNREACH' ||
    errCode === 'ECONNRESET' ||
    rawMsg.includes('ECONNREFUSED') ||
    rawMsg.includes('EHOSTUNREACH') ||
    rawMsg.includes('fetch failed') ||
    rawMsg.includes('The page cannot be loaded')
  ) {
    return createTargetUnreachableError(rawMsg, err?.stack, targetUrl);
  }

  // Access Denied / WAF / Cloudflare
  if (
    status === 403 ||
    status === 401 ||
    status === 429 ||
    rawMsg.includes('Access denied') ||
    rawMsg.includes('403 Forbidden') ||
    rawMsg.includes('Cloudflare') ||
    rawMsg.includes('WAF')
  ) {
    return createAccessDeniedError(rawMsg, err?.stack, targetUrl);
  }

  // Scan Not Found
  if (rawMsg.includes('Scan record') && rawMsg.includes('not found')) {
    return createScanNotFoundError(targetUrl || 'unknown');
  }

  // Browser / axe-core
  if (fallbackStage.includes('axe') || rawMsg.includes('axe') || rawMsg.includes('rule')) {
    return createAuditError(rawMsg, err?.stack, targetUrl);
  }

  if (rawMsg.includes('Playwright') || rawMsg.includes('browser') || rawMsg.includes('DOM')) {
    return createBrowserError(rawMsg, err?.stack, targetUrl);
  }

  return new AuditException({
    code: 'SERVER_ERROR',
    statusCode: status || 500,
    message: rawMsg,
    userFriendlyMessage: rawMsg || 'An unexpected error occurred during audit execution.',
    suggestion: 'Please check the target URL and retry the scan.',
    details: err?.stack,
    stage: fallbackStage,
    targetUrl,
  });
}

/**
 * Produces a standardized JSON error response object.
 */
export function formatErrorResponse(
  err: any,
  targetUrl?: string,
  stage?: string
) {
  const auditErr = normalizeToAuditException(err, stage, targetUrl);
  return {
    success: false,
    error: auditErr.toErrorDetail(),
  };
}

/**
 * Server-side technical logging that hides internal sensitive secrets.
 */
export function logServerException(
  context: string,
  err: any,
  meta?: Record<string, any>
) {
  const auditErr = normalizeToAuditException(err, undefined, meta?.targetUrl);
  console.error(`[AccessAudit Core] [${auditErr.code}] ${context}:`, {
    code: auditErr.code,
    statusCode: auditErr.statusCode,
    message: auditErr.message,
    stage: auditErr.stage,
    targetUrl: auditErr.targetUrl,
    timestamp: auditErr.timestamp,
    ...meta,
    stack: err?.stack || '(no stack)',
  });
}
