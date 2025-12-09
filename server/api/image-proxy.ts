export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const imageUrl = query.url as string;

  if (!imageUrl) {
    throw createError({ statusCode: 400, message: 'Missing URL' });
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

