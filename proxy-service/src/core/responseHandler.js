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

function handleResponse(res, response) {
  applyResponseHeaders(res, response.headers);
  res.setHeader('x-proxy-target', response.finalUrl);
  res.status(response.status).send(response.body);
}

module.exports = {
  handleResponse
};
