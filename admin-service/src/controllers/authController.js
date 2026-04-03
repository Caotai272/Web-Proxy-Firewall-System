const authService = require('../services/authService');

function redirectWithSession(req, res, location, next) {
  if (!req.session) {
    res.redirect(location);
    return;
  }

  req.session.save((error) => {
    if (error) {
      next(error);
      return;
    }

    res.redirect(location);
  });
}

function renderLogin(req, res) {
  res.render('login', {
    authError: res.locals.authError || null,
    emailHint: process.env.ADMIN_DEFAULT_EMAIL || 'admin@local.test',
    viewerHint: process.env.VIEWER_DEFAULT_EMAIL || 'viewer@local.test'
  });
}

async function login(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      req.session.authError = 'Email and password are required.';
      redirectWithSession(req, res, '/login', next);
      return;
    }

    const user = await authService.authenticate(email, password);
    if (!user) {
      req.session.authError = 'Invalid credentials or inactive account.';
      redirectWithSession(req, res, '/login', next);
      return;
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name
    };

    const redirectTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    redirectWithSession(req, res, redirectTo, next);
  } catch (error) {
    next(error);
  }
}

function logout(req, res, next) {
  req.session.destroy((error) => {
    if (error) {
      next(error);
      return;
    }

    res.clearCookie('wf_admin_sid');
    res.redirect('/login');
  });
}

module.exports = {
  renderLogin,
  login,
  logout
};
