const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');

function buildDefaultUsers() {
  return [
    {
      email: String(process.env.ADMIN_DEFAULT_EMAIL || 'admin@local.test').trim().toLowerCase(),
      password: String(process.env.ADMIN_DEFAULT_PASSWORD || 'admin123456'),
      role: 'admin',
      displayName: 'System Admin'
    },
    {
      email: String(process.env.VIEWER_DEFAULT_EMAIL || 'viewer@local.test').trim().toLowerCase(),
      password: String(process.env.VIEWER_DEFAULT_PASSWORD || 'viewer123456'),
      role: 'viewer',
      displayName: 'Read Only Viewer'
    }
  ];
}

async function ensureDefaultUsers() {
  for (const entry of buildDefaultUsers()) {
    if (!entry.email || !entry.password) {
      continue;
    }

    const existingUser = await userRepository.findUserByEmail(entry.email);
    if (existingUser) {
      continue;
    }

    const passwordHash = await bcrypt.hash(entry.password, 10);
    await userRepository.createUser({
      email: entry.email,
      passwordHash,
      role: entry.role,
      displayName: entry.displayName
    });
  }
}

async function authenticate(email, password) {
  const user = await userRepository.findUserByEmail(email);
  if (!user || !user.is_active) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return null;
  }

  await userRepository.updateLastLogin(user.id);
  return user;
}

module.exports = {
  ensureDefaultUsers,
  authenticate
};
