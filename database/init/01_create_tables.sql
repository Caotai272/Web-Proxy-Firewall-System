CREATE TABLE IF NOT EXISTS rules (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    target VARCHAR(255) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('allow', 'block')),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS keywords (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocked_extensions (
    id SERIAL PRIMARY KEY,
    extension VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_logs (
    id BIGSERIAL PRIMARY KEY,
    request_method VARCHAR(10) NOT NULL,
    url TEXT NOT NULL,
    domain VARCHAR(255),
    client_ip INET,
    decision VARCHAR(20) NOT NULL,
    matched_rule VARCHAR(255),
    status_code INTEGER,
    blocked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rules_type ON rules (type);
CREATE INDEX IF NOT EXISTS idx_rules_target ON rules (target);
CREATE INDEX IF NOT EXISTS idx_access_logs_domain ON access_logs (domain);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs (created_at DESC);
