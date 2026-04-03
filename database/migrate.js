const fs = require('fs');
const path = require('path');

const MIGRATION_LOCK_ID = 804202604;

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function readMigrationFiles(migrationsDir) {
  return fs.readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));
}

async function runMigrations({ pool, migrationsDir, logger = console }) {
  const client = await pool.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    await ensureMigrationTable(client);

    const appliedResult = await client.query('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(appliedResult.rows.map((row) => row.version));
    const migrationFiles = readMigrationFiles(migrationsDir);

    for (const fileName of migrationFiles) {
      if (appliedVersions.has(fileName)) {
        continue;
      }

      const migrationSql = fs.readFileSync(path.join(migrationsDir, fileName), 'utf8');

      logger.log(`Applying migration ${fileName}`);
      await client.query('BEGIN');

      try {
        await client.query(migrationSql);
        await client.query(
          'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
          [fileName, fileName]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw Object.assign(error, {
          message: `Migration ${fileName} failed: ${error.message}`
        });
      }
    }
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
    } finally {
      client.release();
    }
  }
}

module.exports = {
  runMigrations
};
