# Web Proxy Firewall System

Multi-service demo project for a web proxy firewall system using Node.js, Express, PostgreSQL, and Docker Compose.

## Services

- `proxy-service`: HTTP proxy + filtering service with `CONNECT` tunnel support
- `admin-service`: admin web + API skeleton
- `postgres`: stores rules, keywords, logs, and dashboard data

## Quick Start

1. Review root `.env` if you need custom ports or database credentials.
2. Start the stack:

```bash
docker compose up --build
```

3. Open:

- Proxy health: `http://localhost:3000/health`
- Proxy endpoint: configure browser/client proxy to `http://localhost:3000`
- Admin login: `http://localhost:4000/login`
- Admin dashboard: `http://localhost:4000/dashboard`
- Admin API health: `http://localhost:4000/health`

## Default Accounts

- Admin: `admin@local.test` / `admin123456`
- Viewer: `viewer@local.test` / `viewer123456`

Update the root `.env` values if you want different default credentials or session secret.

## Project Layout

- `docs/`: architecture, API, and database notes
- `proxy-service/`: proxy service source and Dockerfile
- `admin-service/`: admin service source and Dockerfile
- `database/migrations/`: versioned SQL migrations shared by both services

## Current Proxy Features

- Forward HTTP requests in proxy mode
- Support HTTPS `CONNECT` tunneling
- Enforce whitelist, blacklist, URL pattern, extension, and keyword rules
- Block downloads by extension from both request URLs and upstream response headers
- Preview filter decisions with `GET /filter/preview?url=<target>`
- Persist access logs to PostgreSQL

## Logging And Database

- Access logs now store filter stage, upstream status, response metadata, payload size, and latency
- Shared migrations are applied by the services at startup and tracked in `schema_migrations`
- Admin dashboard reads aggregated DB summaries such as blocked domains, rule-stage counts, and recent blocked events
- `/logs` supports DB-backed filtering by decision, method, domain, query text, and limit

## Admin Security

- Admin dashboard now requires login
- Session data is stored in PostgreSQL
- `viewer` can access dashboard, logs, and filter lab
- `admin` can also inspect rule, keyword, and extension pages

## Integration Test

Run the end-to-end integration suite after the stack is up:

```bash
docker exec web-proxy-firewall-admin npm run test:integration
```

The suite verifies auth, role restrictions, allow/block proxy flows, `CONNECT`, proxy error handling, rule hit tracking, and legacy-log backfill.

## Next Phases

- Implement admin CRUD and dashboard charts
- Add browser extension / OS-level proxy setup notes
- Improve HTTPS filtering beyond tunnel-level domain checks
