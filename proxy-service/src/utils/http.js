function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
}

module.exports = {
  getClientIp
};
