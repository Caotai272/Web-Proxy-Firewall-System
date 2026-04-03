function buildForwardHeaders(headers) {
  const nextHeaders = new Headers();
  const blockedHeaders = new Set([
    'host',
    'connection',
    'content-length',
    'accept-encoding'
  ]);

  Object.entries(headers).forEach(([key, value]) => {
    if (blockedHeaders.has(key.toLowerCase())) {
      return;
    }

    if (Array.isArray(value)) {
      nextHeaders.set(key, value.join(', '));
      return;
    }

    if (typeof value === 'string' && value.length > 0) {
      nextHeaders.set(key, value);
    }
  });

  return nextHeaders;
}

async function forwardRequest({ method, targetUrl, headers, body }) {
  const response = await fetch(targetUrl, {
    method,
    headers: buildForwardHeaders(headers),
    body,
    redirect: 'follow',
    signal: AbortSignal.timeout(15000)
  });

  return {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    body: Buffer.from(await response.arrayBuffer()),
    finalUrl: response.url
  };
}

module.exports = {
  forwardRequest
};
