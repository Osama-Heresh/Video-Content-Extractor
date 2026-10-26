import dns from 'dns';
import { promisify } from 'util';
import http from 'http';
import https from 'https';

const lookupAsync = promisify(dns.lookup);

/**
 * Checks whether an IP address belongs to private, loopback, link-local, or cloud metadata networks.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4 checks
  if (ip === 'localhost' || ip === '::1' || ip === '0.0.0.0') {
    return true;
  }

  // IPv4 mapped IPv6 (::ffff:127.0.0.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    const [p0, p1] = parts;
    // 127.0.0.0/8 Loopback
    if (p0 === 127) return true;
    // 10.0.0.0/8 Private
    if (p0 === 10) return true;
    // 172.16.0.0/12 Private
    if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
    // 192.168.0.0/16 Private
    if (p0 === 192 && p1 === 168) return true;
    // 169.254.0.0/16 Link-local / Cloud Metadata (AWS/GCP/Azure: 169.254.169.254)
    if (p0 === 169 && p1 === 254) return true;
    // 0.0.0.0/8 Current network
    if (p0 === 0) return true;
    // 100.64.0.0/10 Carrier-grade NAT
    if (p0 === 100 && p1 >= 64 && p1 <= 127) return true;
    // 224.0.0.0/4 Multicast
    if (p0 >= 224) return true;
    return false;
  }

  // IPv6 private/reserved checks
  const lower = ip.toLowerCase();
  if (
    lower === '::' ||
    lower === '::1' ||
    lower.startsWith('fe80:') || // link-local
    lower.startsWith('fc') ||   // unique local
    lower.startsWith('fd')
  ) {
    return true;
  }

  return false;
}

/**
 * Validates a user-supplied URL for valid scheme, host, and absence of SSRF risks.
 */
export async function validateSafeUrl(urlString: string): Promise<{ safeUrl: URL; error?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { safeUrl: null as any, error: 'Invalid URL format. Please provide a valid HTTP or HTTPS URL.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      safeUrl: null as any,
      error: `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Disallow explicit localhost or numeric representations
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0'
  ) {
    return { safeUrl: null as any, error: 'Access to localhost and loopback addresses is prohibited.' };
  }

  // Disallow cloud metadata hostnames
  if (hostname.includes('metadata.google.internal') || hostname.includes('169.254.169.254')) {
    return { safeUrl: null as any, error: 'Access to cloud metadata services is strictly prohibited.' };
  }

  // Resolve hostname through DNS to verify destination IP
  try {
    const lookup = await lookupAsync(hostname, { all: true });
    for (const record of lookup) {
      if (isPrivateOrReservedIp(record.address)) {
        return {
          safeUrl: null as any,
          error: `URL resolves to a restricted private or internal IP (${record.address}). Access denied.`,
        };
      }
    }
  } catch (err: any) {
    return { safeUrl: null as any, error: `Could not resolve domain "${hostname}": ${err.message || 'DNS lookup failed'}` };
  }

  return { safeUrl: parsed };
}

/**
 * Safely fetches a remote URL with SSRF protection, timeout, redirect validation, and max size limits.
 */
export async function safeFetchHtml(
  urlString: string,
  options: { maxRedirects?: number; timeoutMs?: number; maxBytes?: number } = {}
): Promise<{ ok: boolean; status: number; text: string; finalUrl: string; contentType: string; error?: string }> {
  const { maxRedirects = 5, timeoutMs = 15000, maxBytes = 5 * 1024 * 1024 } = options;

  let currentUrl = urlString;
  let redirectsRemaining = maxRedirects;

  while (redirectsRemaining >= 0) {
    const validation = await validateSafeUrl(currentUrl);
    if (validation.error || !validation.safeUrl) {
      return {
        ok: false,
        status: 400,
        text: '',
        finalUrl: currentUrl,
        contentType: '',
        error: validation.error || 'Destination validation failed',
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 VideoExtractor/1.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'manual', // handle manually so we re-validate IP on every hop
      });

      clearTimeout(timer);

      // Handle redirect
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          return { ok: false, status: response.status, text: '', finalUrl: currentUrl, contentType: '', error: 'Redirect without Location header' };
        }
        const resolved = new URL(location, currentUrl).toString();
        currentUrl = resolved;
        redirectsRemaining--;
        continue;
      }

      const contentType = response.headers.get('content-type') || '';

      // Read with size cap
      const reader = response.body?.getReader();
      if (!reader) {
        const text = await response.text();
        return { ok: response.ok, status: response.status, text, finalUrl: currentUrl, contentType };
      }

      let receivedBytes = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          receivedBytes += value.length;
          if (receivedBytes > maxBytes) {
            reader.cancel();
            return {
              ok: false,
              status: 413,
              text: '',
              finalUrl: currentUrl,
              contentType,
              error: `Response size exceeded maximum permitted limit of ${Math.round(maxBytes / 1024 / 1024)}MB`,
            };
          }
          chunks.push(value);
        }
      }

      const totalBuffer = Buffer.concat(chunks);
      const text = totalBuffer.toString('utf-8');

      return {
        ok: response.ok,
        status: response.status,
        text,
        finalUrl: currentUrl,
        contentType,
      };
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        return { ok: false, status: 504, text: '', finalUrl: currentUrl, contentType: '', error: `Request timed out after ${timeoutMs / 1000}s` };
      }
      return { ok: false, status: 500, text: '', finalUrl: currentUrl, contentType: '', error: err.message || 'Network fetch failed' };
    }
  }

  return { ok: false, status: 310, text: '', finalUrl: currentUrl, contentType: '', error: 'Exceeded maximum redirect limit' };
}
