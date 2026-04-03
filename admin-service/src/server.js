require('dotenv').config();

const express = require('express');
const path = require('path');
const { ensureAccessLogSchema } = require('./db/schema');
const dashboardRoutes = require('./routes/dashboardRoutes');
const apiRoutes = require('./routes/apiRoutes');
const dashboardController = require('./controllers/dashboardController');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const port = Number(process.env.PORT || 4000);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', dashboardController.health);
app.use('/', dashboardRoutes);
app.use('/api', apiRoutes);
app.use(errorHandler);

async function bootstrap() {
  await ensureAccessLogSchema();

  app.listen(port, () => {
    console.log(`admin-service listening on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start admin-service:', error);
  process.exit(1);
});
