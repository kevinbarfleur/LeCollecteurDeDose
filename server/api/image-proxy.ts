/**
 * Validates a URL to prevent SSRF attacks by blocking:
 * - Non-HTTP(S) protocols
 * - Private/internal IP addresses
 * - Cloud metadata services
 * - Localhost and loopback addresses
 */
function isUrlSafe(urlString: string): { safe: boolean; error?: string } {
  let url: URL;

  try {
    url = new URL(urlString);
  } catch {
    return { safe: false, error: 'Invalid URL format' };
  }

  // Only allow HTTP and HTTPS protocols
  if (!['http:', 'https:'].includes(url.protocol)) {
    return { safe: false, error: 'Only HTTP and HTTPS protocols are allowed' };
  }

  const hostname = url.hostname.toLowerCase();

  // Block localhost and loopback addresses
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return { safe: false, error: 'Localhost addresses are not allowed' };
  }

  // Block cloud metadata services (AWS, GCP, Azure, etc.)
  const blockedHosts = [
    '169.254.169.254',      // AWS/GCP metadata
    'metadata.google.internal',
    'metadata.gke.internal',
    '100.100.100.200',      // Alibaba Cloud metadata
  ];

  if (blockedHosts.includes(hostname)) {
    return { safe: false, error: 'Cloud metadata services are not allowed' };
  }

  // Block private IP ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b, c, d] = ipv4Match.map(Number);

    // 10.0.0.0/8 (Private)
    if (a === 10) {
      return { safe: false, error: 'Private IP addresses are not allowed' };
    }

    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) {
      return { safe: false, error: 'Private IP addresses are not allowed' };
    }

    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) {
      return { safe: false, error: 'Private IP addresses are not allowed' };
    }

    // 169.254.0.0/16 (Link-local)
    if (a === 169 && b === 254) {
      return { safe: false, error: 'Link-local addresses are not allowed' };
    }

    // 0.0.0.0/8
    if (a === 0) {
      return { safe: false, error: 'Invalid IP address' };
    }
  }

  return { safe: true };
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const imageUrl = query.url as string;

  if (!imageUrl) {
    throw createError({ statusCode: 400, message: 'Missing URL' });
  }

  // Validate URL to prevent SSRF attacks
  const validation = isUrlSafe(imageUrl);
  if (!validation.safe) {
    throw createError({ statusCode: 400, message: validation.error || 'Invalid URL' });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
      },
    });

    if (!response.ok) {
      throw createError({ statusCode: response.status, message: response.statusText });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    setResponseHeaders(event, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    });

    return new Uint8Array(buffer);
  } catch (error: any) {
    throw createError({ statusCode: 500, message: error.message || 'Proxy error' });
  }
});

