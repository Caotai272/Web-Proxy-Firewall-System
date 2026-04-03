function isApiRequest(req) {
  return req.path.startsWith('/api/') || req.originalUrl.startsWith('/api/');
}

function attachAuthContext(req, res, next) {
  res.locals.currentUser = req.session && req.session.user ? req.session.user : null;
  res.locals.authError = req.session && req.session.authError ? req.session.authError : null;
  res.locals.flashSuccess = req.session && req.session.flashSuccess ? req.session.flashSuccess : null;
  res.locals.flashError = req.session && req.session.flashError ? req.session.flashError : null;

  if (req.session) {
    delete req.session.authError;
    delete req.session.flashSuccess;
    delete req.session.flashError;
  }

  next();
}

function requireRoles(roles) {
  return (req, res, next) => {
    const user = req.session && req.session.user ? req.session.user : null;

    if (!user) {
      if (req.session && req.method === 'GET') {
        req.session.returnTo = req.originalUrl;
      }

      if (isApiRequest(req)) {
        res.status(401).json({ message: 'Authentication required.' });
        return;
      }

      res.redirect('/login');
      return;
    }

    if (!roles.includes(user.role)) {
      if (isApiRequest(req)) {
        res.status(403).json({ message: 'Forbidden.' });
        return;
      }

      res.status(403).render('error', {
        error: {
          message: 'You do not have permission to access this page.'
        }
      });
      return;
    }

    next();
  };
}

function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    res.redirect('/dashboard');
    return;
  }

  next();
}

module.exports = {
  attachAuthContext,
  requireViewer: requireRoles(['viewer', 'admin']),
  requireAdmin: requireRoles(['admin']),
  redirectIfAuthenticated
};
