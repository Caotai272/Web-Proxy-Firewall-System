function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
    return forwardedFor
      .split(',')
      .map((value) => value.trim())
      .find(Boolean) || req.socket.remoteAddress || null;
  }

  return req.socket.remoteAddress || null;
}

module.exports = {
  getClientIp
};
