import type { AuditErrorCode, ApiErrorDetail, ApiResponse } from '../types/index.js';

export class AuditClientError extends Error {
  public readonly code: AuditErrorCode;
  public readonly userFriendlyMessage: string;
  public readonly suggestion?: string;
  public readonly statusCode: number;
  public readonly details?: string;
  public readonly stage?: string;
  public readonly targetUrl?: string;
  public readonly timestamp: string;

  constructor(options: {
    code?: AuditErrorCode;
    message: string;
    userFriendlyMessage?: string;
    suggestion?: string;
    statusCode?: number;
    details?: string;
    stage?: string;
    targetUrl?: string;
  }) {
    super(options.message);
    this.name = 'AuditClientError';
    this.code = options.code || inferErrorCode(options.message, options.statusCode);
    this.statusCode = options.statusCode || 500;
    this.userFriendlyMessage =
      options.userFriendlyMessage ||
      getDefaultUserMessage(this.code, options.message, options.targetUrl);
    this.suggestion =
      options.suggestion || getDefaultSuggestion(this.code);
    this.details = options.details;
    this.stage = options.stage;
    this.targetUrl = options.targetUrl;
    this.timestamp = new Date().toISOString();

    Object.setPrototypeOf(this, AuditClientError.prototype);
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

/**
 * Safely parses any HTTP response whether it is JSON, plain-text, HTML, or empty.
 */
export async function safeParseResponse<T = any>(
  response: Response,
  targetUrl?: string
): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type') || '';
  let rawBody = '';

  try {
    rawBody = await response.text();
  } catch (readErr: any) {
    const error = new AuditClientError({
      code: 'SERVER_ERROR',
      statusCode: response.status,
      message: `Failed to read response body: ${readErr.message}`,
      userFriendlyMessage: 'Could not read server response.',
      targetUrl,
    }).toErrorDetail();
    return { success: false, error };
  }

  const trimmed = rawBody.trim();

  // Case A: Response is JSON (or looks like a JSON object/array)
  if (
    contentType.includes('application/json') ||
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const parsed = JSON.parse(trimmed);

      // Backend returned standardized { success: false, error: ... }
      if (parsed && typeof parsed === 'object') {
        if (parsed.success === false && parsed.error) {
          const errDetail: ApiErrorDetail = {
            code: parsed.error.code || inferErrorCode(parsed.error.message, parsed.error.statusCode || response.status),
            message: parsed.error.message || 'Server error',
            userFriendlyMessage:
              parsed.error.userFriendlyMessage ||
              getDefaultUserMessage(parsed.error.code, parsed.error.message, targetUrl),
            suggestion: parsed.error.suggestion || getDefaultSuggestion(parsed.error.code),
            details: parsed.error.details,
            stage: parsed.error.stage,
            targetUrl: parsed.error.targetUrl || targetUrl,
            statusCode: parsed.error.statusCode || response.status,
            timestamp: parsed.error.timestamp || new Date().toISOString(),
          };
          return { success: false, error: errDetail };
        }

        // Backend returned legacy { error: string }
        if (parsed.error && typeof parsed.error === 'string') {
          const err = new AuditClientError({
            message: parsed.error,
            statusCode: response.status,
            targetUrl,
          });
          return { success: false, error: err.toErrorDetail() };
        }

        // If HTTP status is error (4xx/5xx) but payload didn't have error field
        if (!response.ok) {
          const err = new AuditClientError({
            message: parsed.message || `HTTP error ${response.status}: ${response.statusText}`,
            statusCode: response.status,
            targetUrl,
          });
          return { success: false, error: err.toErrorDetail() };
        }

        // Success JSON payload
        return {
          success: true,
          data: (parsed.data !== undefined ? parsed.data : parsed) as T,
          message: parsed.message,
        };
      }
    } catch {
      // If JSON parse failed, fall through to text/HTML handler
    }
  }

  // Case B: Response is HTML (e.g. 502/504 Bad Gateway / Cloudflare / Nginx error page)
  if (contentType.includes('text/html') || trimmed.startsWith('<')) {
    const extractedTitle = extractTitleFromHtml(trimmed);
    const cleanText = stripHtml(trimmed);
    const displayMsg = extractedTitle || cleanText.slice(0, 160) || `Server returned HTML error (${response.status})`;

    const inferredCode = response.status === 504
      ? 'TARGET_TIMEOUT'
      : response.status === 502 || response.status === 503
      ? 'TARGET_UNREACHABLE'
      : response.status === 403 || response.status === 401
      ? 'ACCESS_DENIED'
      : response.status === 400
      ? 'INVALID_URL'
      : 'SERVER_ERROR';

    const err = new AuditClientError({
      code: inferredCode,
      statusCode: response.status,
      message: displayMsg,
      userFriendlyMessage: getDefaultUserMessage(inferredCode, displayMsg, targetUrl),
      suggestion: getDefaultSuggestion(inferredCode),
      details: cleanText.slice(0, 500),
      targetUrl,
    });

    return { success: false, error: err.toErrorDetail() };
  }

  // Case C: Response is Plain-Text (e.g. "The page cannot be loaded", "Bad Request", etc.)
  if (trimmed.length > 0) {
    const inferredCode = inferErrorCode(trimmed, response.status);
    const err = new AuditClientError({
      code: inferredCode,
      statusCode: response.status,
      message: trimmed,
      userFriendlyMessage: getDefaultUserMessage(inferredCode, trimmed, targetUrl),
      suggestion: getDefaultSuggestion(inferredCode),
      targetUrl,
    });
    return {
      success: response.ok,
      data: response.ok ? ((trimmed as unknown) as T) : undefined,
      error: response.ok ? undefined : err.toErrorDetail(),
    };
  }

  // Case D: Empty body
  if (!response.ok) {
    const err = new AuditClientError({
      statusCode: response.status,
      message: `HTTP ${response.status}: ${response.statusText || 'Unknown Error'}`,
      targetUrl,
    });
    return { success: false, error: err.toErrorDetail() };
  }

  return { success: true, data: ({} as T) };
}

/**
 * Robust fetch wrapper for API endpoints.
 */
export async function safeFetch<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  targetUrl?: string
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(input, init);
    return await safeParseResponse<T>(response, targetUrl);
  } catch (networkErr: any) {
    const isTimeout =
      networkErr.name === 'AbortError' ||
      String(networkErr.message || '').toLowerCase().includes('timeout');

    const code: AuditErrorCode = isTimeout ? 'TARGET_TIMEOUT' : 'TARGET_UNREACHABLE';
    const err = new AuditClientError({
      code,
      statusCode: isTimeout ? 504 : 503,
      message: networkErr.message || 'Network connection failed.',
      userFriendlyMessage: isTimeout
        ? 'The request took too long to complete and timed out.'
        : 'Could not connect to the AccessAudit server or target host.',
      suggestion: isTimeout
        ? 'Try re-running in Quick Scan mode or verify network connectivity.'
        : 'Verify internet connection and ensure the backend server is running.',
      details: networkErr.stack,
      targetUrl,
    });

    return { success: false, error: err.toErrorDetail() };
  }
}

/**
 * Convenience helper that throws an AuditClientError on failure.
 */
export async function fetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  targetUrl?: string
): Promise<T> {
  const result = await safeFetch<T>(input, init, targetUrl);
  if (!result.success || !result.data) {
    const errDetail = result.error || {
      code: 'SERVER_ERROR',
      message: 'Unknown API error',
      userFriendlyMessage: 'Request failed.',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };
    throw new AuditClientError({
      code: errDetail.code,
      message: errDetail.message,
      userFriendlyMessage: errDetail.userFriendlyMessage,
      suggestion: errDetail.suggestion,
      statusCode: errDetail.statusCode,
      details: errDetail.details,
      stage: errDetail.stage,
      targetUrl: errDetail.targetUrl,
    });
  }
  return result.data;
}

export const apiClient = {
  safeFetch,
  fetchJson,
  safeParseResponse,

  async get<T = any>(url: string, targetUrl?: string): Promise<ApiResponse<T>> {
    return safeFetch<T>(url, { method: 'GET' }, targetUrl);
  },

  async post<T = any>(url: string, body?: any, targetUrl?: string): Promise<ApiResponse<T>> {
    return safeFetch<T>(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      targetUrl
    );
  },

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    return safeFetch<T>(url, { method: 'DELETE' });
  },
};

// ----------------------------------------------------
// Helper parsing functions
// ----------------------------------------------------

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitleFromHtml(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (match && match[1]) {
    return match[1].replace(/\s+/g, ' ').trim();
  }
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match && h1Match[1]) {
    return stripHtml(h1Match[1]);
  }
  return null;
}

function inferErrorCode(msg = '', status = 0): AuditErrorCode {
  const m = msg.toLowerCase();

  if (m.includes('scan record') && (m.includes('not found') || status === 404)) {
    return 'SCAN_NOT_FOUND';
  }
  if (m.includes('ssrf') || m.includes('private') || m.includes('loopback') || m.includes('prohibited') || m.includes('link-local')) {
    return 'SSRF_BLOCKED';
  }
  if (m.includes('dns') || m.includes('enotfound') || m.includes('getaddrinfo')) {
    return 'DNS_ERROR';
  }
  if (m.includes('redirect') || m.includes('too many redirects')) {
    return 'TARGET_REDIRECT_ERROR';
  }
  if (m.includes('target returned http') || m.includes('404') || m.includes('500') || m.includes('502') || m.includes('503')) {
    return 'TARGET_HTTP_ERROR';
  }
  if (m.includes('invalid url') || m.includes('protocol') || m.includes('malformed') || status === 400) {
    return 'INVALID_URL';
  }
  if (m.includes('timeout') || m.includes('timed out') || m.includes('aborterror') || status === 504) {
    return 'TARGET_TIMEOUT';
  }
  if (m.includes('denied') || m.includes('unauthorized') || m.includes('forbidden') || m.includes('cloudflare') || m.includes('bot') || status === 401 || status === 403) {
    return 'ACCESS_DENIED';
  }
  if (m.includes('unreachable') || m.includes('econnrefused') || m.includes('cannot be loaded') || m.includes('did not respond')) {
    return 'TARGET_UNREACHABLE';
  }
  if (m.includes('axe') || m.includes('rule') || m.includes('scoring') || m.includes('wcag')) {
    return 'AUDIT_ERROR';
  }
  if (m.includes('playwright') || m.includes('browser') || m.includes('dom')) {
    return 'BROWSER_ERROR';
  }
  if (m.includes('crawler') || m.includes('crawl')) {
    return 'CRAWLER_ERROR';
  }
  return 'SERVER_ERROR';
}

function getDefaultUserMessage(code?: AuditErrorCode, fallback = '', targetUrl?: string): string {
  const target = targetUrl ? ` for "${targetUrl}"` : '';
  switch (code) {
    case 'INVALID_URL':
      return `The target URL provided is invalid or uses an unsupported protocol.`;
    case 'SSRF_BLOCKED':
      return `The requested address is blocked for security (private IPs, localhost, or cloud metadata endpoints).`;
    case 'DNS_ERROR':
      return `Domain Name Resolution (DNS) failed for "${targetUrl || 'the target host'}". Verify that the domain name is registered and active.`;
    case 'TARGET_HTTP_ERROR':
      return `The target website${target} returned an HTTP error response (such as 404 Not Found or 500 Internal Error).`;
    case 'TARGET_REDIRECT_ERROR':
      return `The target website${target} entered an infinite redirect loop or exceeded maximum allowed hops.`;
    case 'TARGET_UNREACHABLE':
      return `Could not connect to the target website${target}. The host is offline, unreachable, or refused connections.`;
    case 'TARGET_TIMEOUT':
      return `The target website${target} took too long to respond (connection timed out).`;
    case 'ACCESS_DENIED':
      return `Access to the target website${target} was denied (HTTP 401/403 or bot firewall block).`;
    case 'SCAN_NOT_FOUND':
      return `The requested audit scan record could not be found.`;
    case 'QUEUE_ERROR':
      return `The scan queue encountered an internal error while starting background audit workers.`;
    case 'DATABASE_ERROR':
      return `Database storage operation failed while saving or retrieving scan data.`;
    case 'BROWSER_ERROR':
      return `Browser DOM extraction encountered an unexpected error.`;
    case 'CRAWLER_ERROR':
      return `Website crawler was unable to traverse the requested pages.`;
    case 'AUDIT_ERROR':
      return `Accessibility rule evaluation or scoring pipeline failed.`;
    case 'SERVER_ERROR':
    default:
      return fallback || `An internal error occurred during audit processing.`;
  }
}

function getDefaultSuggestion(code?: AuditErrorCode): string {
  switch (code) {
    case 'INVALID_URL':
      return 'Please enter a valid, fully-qualified URL starting with https:// or http:// (e.g., https://example.com).';
    case 'SSRF_BLOCKED':
      return 'Ensure the target website is publicly accessible on the internet and not on a private local network.';
    case 'DNS_ERROR':
      return 'Check spelling of the domain name and confirm that DNS records (A/AAAA) are propagated.';
    case 'TARGET_HTTP_ERROR':
      return 'Check if the target webpage exists in your browser and verify the URL path is correct.';
    case 'TARGET_REDIRECT_ERROR':
      return 'Verify if the site has misconfigured 301/302 redirect rules or try accessing the final destination URL directly.';
    case 'TARGET_UNREACHABLE':
      return 'Verify that the website is online in your browser, uses a valid domain name, and is not blocking automated bots.';
    case 'TARGET_TIMEOUT':
      return 'The target server may be slow or overloaded. Try running a Quick Scan on a single page or test again in a few moments.';
    case 'ACCESS_DENIED':
      return 'The website requires user authentication or employs bot protection (e.g. Cloudflare Turnstile/WAF).';
    case 'SCAN_NOT_FOUND':
      return 'Start a new website scan from the audit input above.';
    case 'QUEUE_ERROR':
    case 'DATABASE_ERROR':
    case 'BROWSER_ERROR':
    case 'CRAWLER_ERROR':
    case 'AUDIT_ERROR':
      return 'Try auditing the single homepage URL first with Quick Scan.';
    case 'SERVER_ERROR':
    default:
      return 'Please retry your scan or contact support if the problem continues.';
  }
}
