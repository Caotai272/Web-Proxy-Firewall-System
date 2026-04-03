ALTER TABLE rules
    ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 100;

ALTER TABLE rules
    ADD COLUMN IF NOT EXISTS scope_type VARCHAR(30) NOT NULL DEFAULT 'global';

ALTER TABLE rules
    ADD COLUMN IF NOT EXISTS scope_value VARCHAR(255);

ALTER TABLE rules
    ADD COLUMN IF NOT EXISTS hit_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE rules
    ADD COLUMN IF NOT EXISTS last_matched_at TIMESTAMPTZ;

UPDATE rules
SET priority = CASE
        WHEN action = 'allow' THEN 10
        WHEN type = 'domain' THEN 100
        ELSE 200
    END
WHERE priority = 100;

CREATE INDEX IF NOT EXISTS idx_rules_active_priority ON rules (is_active, priority, id);
CREATE INDEX IF NOT EXISTS idx_rules_scope ON rules (scope_type, scope_value);

CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'viewer')),
    display_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users (role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users (is_active);

CREATE TABLE IF NOT EXISTS user_sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_expire ON user_sessions (expire);
