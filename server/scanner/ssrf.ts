import { URL } from 'url';
import dns from 'dns/promises';

// List of prohibited private/internal IP ranges and hostnames
const PROHIBITED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'instance-data',
  'metadata.google.internal',
  'metadata.google.com',
  '169.254.169.254',
]);

/**
 * Validates a target URL to ensure safety against Server-Side Request Forgery (SSRF).
 * Returns { valid: boolean, error?: string, normalizedUrl?: string }
 */
export async function validateSafeUrl(rawUrl: string): Promise<{ valid: boolean; error?: string; normalizedUrl?: string }> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL must be provided as a non-empty string.' };
  }

  let formatted = rawUrl.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = `https://${formatted}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(formatted);
  } catch {
    return { valid: false, error: 'Invalid URL format. Please provide a valid web address (e.g. https://example.com).' };
  }

  // Only allow http and https protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: `Protocol "${parsed.protocol}" is not allowed. Only HTTP and HTTPS are permitted.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Prohibit known local hostnames & metadata services
  if (PROHIBITED_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { valid: false, error: 'Access to internal, local, or cloud-metadata hostnames is strictly prohibited for security.' };
  }

  // Check IPv4 private and link-local ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = hostname.match(ipv4Regex);
  if (ipMatch) {
    const octets = ipMatch.slice(1).map(Number);
    if (octets.some((o) => o < 0 || o > 255)) {
      return { valid: false, error: 'Invalid IPv4 address.' };
    }

    const [o1, o2] = octets;
    // 127.0.0.0/8 (Loopback)
    // 10.0.0.0/8 (Private)
    // 172.16.0.0/12 (Private)
    // 192.168.0.0/16 (Private)
    // 169.254.0.0/16 (Link-local & cloud metadata)
    // 0.0.0.0/8
    if (
      o1 === 127 ||
      o1 === 10 ||
      o1 === 0 ||
      (o1 === 172 && o2 >= 16 && o2 <= 31) ||
      (o1 === 192 && o2 === 168) ||
      (o1 === 169 && o2 === 254)
    ) {
      return { valid: false, error: 'Access to private or link-local IP addresses is strictly blocked.' };
    }
  }

  // Optional: Try DNS lookup to check if hostname resolves to private IP
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      const ip = addr.address;
      if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) {
        return { valid: false, error: `Hostname resolves to prohibited IP address (${ip}). Request blocked for SSRF protection.` };
      }
      if (ip.startsWith('172.')) {
        const parts = ip.split('.').map(Number);
        if (parts[1] >= 16 && parts[1] <= 31) {
          return { valid: false, error: `Hostname resolves to private IP address (${ip}). Request blocked.` };
        }
      }
    }
  } catch (dnsErr: any) {
    // If DNS resolution fails, allow if it's a mock or will be handled by fetch error
    if (dnsErr.code === 'ENOTFOUND') {
      return { valid: false, error: `Could not resolve domain "${hostname}". Please verify the domain name.` };
    }
  }

  return { valid: true, normalizedUrl: parsed.toString() };
}
