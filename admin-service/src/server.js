require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const createPgSession = require('connect-pg-simple');
const { ensureAccessLogSchema } = require('./db/schema');
const { pool } = require('./db/client');
const dashboardRoutes = require('./routes/dashboardRoutes');
const apiRoutes = require('./routes/apiRoutes');
const dashboardController = require('./controllers/dashboardController');
const { attachAuthContext } = require('./middlewares/auth');
const authService = require('./services/authService');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const port = Number(process.env.PORT || 4000);
const PgSession = createPgSession(session);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  store: new PgSession({
    pool,
    tableName: 'user_sessions',
    createTableIfMissing: false
  }),
  name: 'wf_admin_sid',
  secret: process.env.ADMIN_SESSION_SECRET || 'change-me-admin-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8
  }
}));
app.use(attachAuthContext);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', dashboardController.health);
app.use('/', dashboardRoutes);
app.use('/api', apiRoutes);
app.use(errorHandler);

async function bootstrap() {
  await ensureAccessLogSchema();
  await authService.ensureDefaultUsers();

  app.listen(port, () => {
    console.log(`admin-service listening on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start admin-service:', error);
  process.exit(1);
});
