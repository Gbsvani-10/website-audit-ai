import { describe, it, expect } from 'vitest';
import { safeParseResponse, AuditClientError } from './apiClient.js';

describe('apiClient - safeParseResponse', () => {
  it('handles standard JSON success responses', async () => {
    const mockResponse = new Response(JSON.stringify({ success: true, scans: [{ id: 'scan_1' }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await safeParseResponse<{ scans: any[] }>(mockResponse);
    expect(result.success).toBe(true);
    expect(result.data?.scans).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  it('handles standard JSON structured error responses', async () => {
    const mockResponse = new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'SSRF_BLOCKED',
          message: 'Target host resolves to a private IP range (127.0.0.1)',
          userFriendlyMessage: 'The requested address is blocked for security.',
          suggestion: 'Ensure the target website is publicly accessible.',
          statusCode: 400,
        },
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const result = await safeParseResponse(mockResponse);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('SSRF_BLOCKED');
    expect(result.error?.userFriendlyMessage).toBe('The requested address is blocked for security.');
    expect(result.error?.suggestion).toBe('Ensure the target website is publicly accessible.');
  });

  it('handles plain text error "The page cannot be loaded" without crashing JSON parser', async () => {
    // This specifically tests the exact error reported by user:
    // Unexpected token 'T', "The page c"... is not valid JSON
    const plainText = 'The page cannot be loaded. Connection closed by peer.';
    const mockResponse = new Response(plainText, {
      status: 502,
      headers: { 'Content-Type': 'text/plain' },
    });

    const result = await safeParseResponse(mockResponse, 'https://broken-target.com');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('TARGET_UNREACHABLE');
    expect(result.error?.userFriendlyMessage).toContain('Could not connect to the target website');
  });

  it('handles HTML 504 Gateway Timeout error pages without crashing', async () => {
    const htmlBody = `<!DOCTYPE html><html><head><title>504 Gateway Time-out</title></head><body><h1>504 Gateway Time-out</h1>The server didn't respond in time.</body></html>`;
    const mockResponse = new Response(htmlBody, {
      status: 504,
      headers: { 'Content-Type': 'text/html' },
    });

    const result = await safeParseResponse(mockResponse, 'https://slow-site.com');
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('TARGET_TIMEOUT');
    expect(result.error?.userFriendlyMessage).toContain('took too long to respond');
  });

  it('handles HTML 403 Forbidden Cloudflare challenge pages without crashing', async () => {
    const htmlBody = `<html><head><title>Just a moment...</title></head><body>Enable JavaScript and cookies to continue. (Cloudflare Ray ID: 123)</body></html>`;
    const mockResponse = new Response(htmlBody, {
      status: 403,
      headers: { 'Content-Type': 'text/html' },
    });

    const result = await safeParseResponse(mockResponse, 'https://protected-site.com');
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('ACCESS_DENIED');
    expect(result.error?.userFriendlyMessage).toContain('Access to the target website');
  });

  it('handles legacy plain error objects { error: "Something failed" }', async () => {
    const mockResponse = new Response(JSON.stringify({ error: 'Invalid URL scheme' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await safeParseResponse(mockResponse);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_URL');
  });
});
