function errorHandler(err, req, res, next) {
  console.error(err);

  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ message: err.message });
  }

  return res.status(500).render('error', { error: err });
}

module.exports = errorHandler;
