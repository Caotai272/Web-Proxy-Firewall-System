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

  const pathname = targetUrl.pathname || '/';
  const lastSegment = pathname.split('/').filter(Boolean).pop() || '';
  const extension = lastSegment.includes('.') ? `.${lastSegment.split('.').pop()}` : null;

  return {
    url: targetUrl.toString(),
    protocol: targetUrl.protocol,
    domain: targetUrl.hostname,
    pathname,
    extension,
    search: targetUrl.search
  };
}

module.exports = {
  parseRequestUrl
};
