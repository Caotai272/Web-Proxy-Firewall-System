function applyResponseHeaders(res, headers) {
  const blockedHeaders = new Set([
    'content-length',
    'transfer-encoding',
    'connection',
    'content-encoding'
  ]);

  Object.entries(headers).forEach(([key, value]) => {
    if (blockedHeaders.has(key.toLowerCase())) {
      return;
    }

    res.setHeader(key, value);
  });
}

function sendResponseBody(res, statusCode, body) {
  if (typeof res.status === 'function') {
    res.status(statusCode).send(body);
    return;
  }

  res.statusCode = statusCode;
  res.end(body);
}

function handleResponse(res, response) {
  applyResponseHeaders(res, response.headers);
  res.setHeader('x-proxy-target', response.finalUrl);
  sendResponseBody(res, response.status, response.body);
}

module.exports = {
  handleResponse
};
