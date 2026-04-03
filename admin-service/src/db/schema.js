const path = require('path');
const { runMigrations } = require(path.resolve(__dirname, '../../../database/migrate'));
const { normalizeAccessLogs } = require(path.resolve(__dirname, '../../../database/accessLogMaintenance'));
const { pool } = require('./client');

async function ensureAccessLogSchema() {
  await runMigrations({
    pool,
    migrationsDir: path.resolve(__dirname, '../../../database/migrations')
  });
  await normalizeAccessLogs((statement) => pool.query(statement));
}

module.exports = {
  ensureAccessLogSchema
};
