# Architecture

The system uses a three-service architecture:

- `proxy-service`: receives browser traffic, evaluates filtering rules, forwards HTTP requests, and handles HTTPS `CONNECT` tunnels.
- `admin-service`: exposes management pages and APIs for rules, logs, and dashboards.
- `postgres`: stores configuration and access history.

## Request Flow

1. Browser sends a request to `proxy-service`.
2. `proxy-service` checks whitelist, blacklist, URL pattern, extension, and keyword rules.
3. If the request is allowed, the proxy forwards it and can still block the upstream response based on HTML keywords or downloadable file extensions announced by the server.
4. If blocked, the proxy returns a block page.
5. Access logs are written to PostgreSQL.
6. `admin-service` reads the same database to manage rules and display statistics.
