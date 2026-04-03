# Architecture

The system uses a three-service architecture:

- `proxy-service`: receives browser traffic, evaluates filtering rules, and later forwards requests.
- `admin-service`: exposes management pages and APIs for rules, logs, and dashboards.
- `postgres`: stores configuration and access history.

## Request Flow

1. Browser sends a request to `proxy-service`.
2. `proxy-service` checks whitelist, blacklist, URL pattern, extension, and keyword rules.
3. If blocked, the proxy returns a block page.
4. If allowed, the proxy forwards the request to the target server.
5. Access logs are written to PostgreSQL.
6. `admin-service` reads the same database to manage rules and display statistics.
