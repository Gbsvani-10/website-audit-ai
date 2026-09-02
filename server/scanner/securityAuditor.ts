import type { SecurityObservation } from '../../src/types/index.js';

export function runSecurityAudit(
  headers: Record<string, string | string[] | undefined>,
  isHttps: boolean
): { securityObservations: SecurityObservation[]; securityScore: number } {
  const observations: SecurityObservation[] = [];
  let score = 100;

  const normalizedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      normalizedHeaders[key.toLowerCase()] = Array.isArray(value) ? value.join('; ') : value;
    }
  }

  // 1. HTTPS transport
  if (isHttps) {
    observations.push({
      id: 'sec_https',
      headerName: 'HTTPS Protocol',
      present: true,
      value: 'Enabled (TLS/SSL)',
      status: 'pass',
      description: 'Communication is encrypted using TLS.',
      recommendation: 'Ensure automated TLS renewal and forward secrecy.',
    });
  } else {
    observations.push({
      id: 'sec_https_fail',
      headerName: 'HTTPS Protocol',
      present: false,
      value: 'HTTP Unencrypted',
      status: 'fail',
      description: 'Plaintext HTTP allows eavesdropping and man-in-the-middle attacks.',
      recommendation: 'Enforce HTTPS everywhere with 301 redirects.',
    });
    score -= 35;
  }

  // 2. Strict-Transport-Security (HSTS)
  const hsts = normalizedHeaders['strict-transport-security'];
  if (hsts) {
    observations.push({
      id: 'sec_hsts_ok',
      headerName: 'Strict-Transport-Security (HSTS)',
      present: true,
      value: hsts,
      status: 'pass',
      description: 'HSTS instructs browsers to strictly communicate over HTTPS only.',
      recommendation: 'Include `includeSubDomains; preload` for maximum protection.',
    });
  } else {
    observations.push({
      id: 'sec_hsts_missing',
      headerName: 'Strict-Transport-Security (HSTS)',
      present: false,
      status: 'warn',
      description: 'Missing HSTS header allows initial connection downgrade vulnerabilities.',
      recommendation: 'Add `Strict-Transport-Security: max-age=31536000; includeSubDomains`.',
    });
    score -= 15;
  }

  // 3. Content-Security-Policy (CSP)
  const csp = normalizedHeaders['content-security-policy'];
  if (csp) {
    observations.push({
      id: 'sec_csp_ok',
      headerName: 'Content-Security-Policy (CSP)',
      present: true,
      value: csp.length > 60 ? `${csp.slice(0, 57)}...` : csp,
      status: 'pass',
      description: 'CSP restricts unauthorized script execution and mitigates Cross-Site Scripting (XSS).',
      recommendation: 'Review CSP directives to avoid `unsafe-inline` or wildcard origins.',
    });
  } else {
    observations.push({
      id: 'sec_csp_missing',
      headerName: 'Content-Security-Policy (CSP)',
      present: false,
      status: 'warn',
      description: 'No Content-Security-Policy header detected. Elevates risk of Cross-Site Scripting (XSS).',
      recommendation: 'Implement a strict CSP restricting `default-src \'self\'` and script origins.',
    });
    score -= 20;
  }

  // 4. X-Content-Type-Options
  const xcto = normalizedHeaders['x-content-type-options'];
  if (xcto && xcto.toLowerCase().includes('nosniff')) {
    observations.push({
      id: 'sec_nosniff_ok',
      headerName: 'X-Content-Type-Options',
      present: true,
      value: 'nosniff',
      status: 'pass',
      description: 'MIME-sniffing prevention is enabled.',
      recommendation: 'Maintain `nosniff` on all HTML and API responses.',
    });
  } else {
    observations.push({
      id: 'sec_nosniff_missing',
      headerName: 'X-Content-Type-Options',
      present: false,
      status: 'warn',
      description: 'Missing `nosniff` directive may allow browsers to interpret non-script files as scripts.',
      recommendation: 'Set `X-Content-Type-Options: nosniff`.',
    });
    score -= 10;
  }

  // 5. Referrer-Policy
  const refPol = normalizedHeaders['referrer-policy'];
  if (refPol) {
    observations.push({
      id: 'sec_ref_ok',
      headerName: 'Referrer-Policy',
      present: true,
      value: refPol,
      status: 'pass',
      description: 'Referrer header leakage is controlled.',
      recommendation: 'Use `strict-origin-when-cross-origin` or `no-referrer`.',
    });
  } else {
    observations.push({
      id: 'sec_ref_missing',
      headerName: 'Referrer-Policy',
      present: false,
      status: 'warn',
      description: 'No Referrer-Policy specified. Full URLs may leak in the Referer header to 3rd party links.',
      recommendation: 'Set `Referrer-Policy: strict-origin-when-cross-origin`.',
    });
    score -= 10;
  }

  // 6. Permissions-Policy / Feature-Policy
  const permPol = normalizedHeaders['permissions-policy'] || normalizedHeaders['feature-policy'];
  if (permPol) {
    observations.push({
      id: 'sec_perm_ok',
      headerName: 'Permissions-Policy',
      present: true,
      value: permPol.length > 50 ? `${permPol.slice(0, 47)}...` : permPol,
      status: 'pass',
      description: 'Browser device features (camera, microphone, geolocation) are explicitly governed.',
      recommendation: 'Keep device feature permissions restricted to authorized origins.',
    });
  } else {
    observations.push({
      id: 'sec_perm_missing',
      headerName: 'Permissions-Policy',
      present: false,
      status: 'warn',
      description: 'Permissions-Policy is missing. Uncontrolled access to browser APIs may occur in embeds.',
      recommendation: 'Add `Permissions-Policy: camera=(), microphone=(), geolocation=()`.',
    });
    score -= 10;
  }

  return { securityObservations: observations, securityScore: Math.max(15, Math.min(100, score)) };
}
