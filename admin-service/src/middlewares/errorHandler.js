function errorHandler(err, req, res, next) {
  const statusCode = Number(err.statusCode) || 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  if (req.path.startsWith('/api/')) {
    return res.status(statusCode).json({ message: err.message });
  }

  return res.status(statusCode).render('error', { error: err });
}

module.exports = errorHandler;
