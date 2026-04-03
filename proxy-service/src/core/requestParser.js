function buildParsedRequest(targetUrl) {
  const pathname = targetUrl.pathname || '/';
  const lastSegment = pathname.split('/').filter(Boolean).pop() || '';
  const extension = lastSegment.includes('.') ? `.${lastSegment.split('.').pop()}` : null;

  return {
    url: targetUrl.toString(),
    protocol: targetUrl.protocol,
    domain: targetUrl.hostname,
    pathname,
    extension,
    search: targetUrl.search,
    port: targetUrl.port || null
  };
}

function parseRequestUrl(inputUrl) {
  if (!inputUrl) {
    throw new Error('Missing required query parameter: url');
  }

  let targetUrl;

  try {
    targetUrl = new URL(inputUrl);
  } catch (error) {
    throw new Error('Invalid target URL');
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    throw new Error('Only http and https protocols are supported');
  }

  return buildParsedRequest(targetUrl);
}

function parseConnectTarget(authority) {
  if (!authority) {
    throw new Error('Missing CONNECT authority');
  }

  const normalizedAuthority = authority.includes('://') ? authority : `https://${authority}`;
  let connectUrl;

  try {
    connectUrl = new URL(normalizedAuthority);
  } catch (error) {
    throw new Error('Invalid CONNECT authority');
  }

  if (!connectUrl.hostname) {
    throw new Error('Invalid CONNECT authority');
  }

  return {
    ...buildParsedRequest(connectUrl),
    url: `https://${connectUrl.host}/`,
    protocol: 'https:',
    pathname: '/',
    search: '',
    extension: null,
    port: connectUrl.port || '443'
  };
}

module.exports = {
  parseRequestUrl,
  parseConnectTarget
};
