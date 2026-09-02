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
    case 'TARGET_UNREACHABLE':
      return 502;
    case 'TARGET_TIMEOUT':
      return 504;
    case 'ACCESS_DENIED':
      return 403;
    case 'BROWSER_ERROR':
    case 'CRAWLER_ERROR':
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
    suggestion: 'Please enter a valid, fully-qualified web address (e.g., https://example.com).',
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

export function createTargetUnreachableError(
  message: string,
  details?: string,
  targetUrl?: string
): AuditException {
  return new AuditException({
    code: 'TARGET_UNREACHABLE',
    statusCode: 502,
    message,
    userFriendlyMessage: `Could not connect to "${targetUrl || 'the target website'}". The host is unreachable or DNS lookup failed.`,
    suggestion: 'Verify that the target website is publicly online, accessible via HTTPS, and not blocking automated crawlers.',
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

  // DNS / Connection / Unreachable
  if (
    errCode === 'ENOTFOUND' ||
    errCode === 'ECONNREFUSED' ||
    errCode === 'EHOSTUNREACH' ||
    errCode === 'ENETUNREACH' ||
    rawMsg.includes('ENOTFOUND') ||
    rawMsg.includes('ECONNREFUSED') ||
    rawMsg.includes('fetch failed') ||
    rawMsg.includes('Could not resolve domain') ||
    rawMsg.includes('Could not load') ||
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
