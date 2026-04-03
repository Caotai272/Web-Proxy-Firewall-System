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
- Admin dashboard: `http://localhost:4000/dashboard`
- Admin API health: `http://localhost:4000/health`

## Project Layout

- `docs/`: architecture, API, and database notes
- `proxy-service/`: proxy service source and Dockerfile
- `admin-service/`: admin service source and Dockerfile
- `database/init/`: PostgreSQL init and seed scripts

## Current Proxy Features

- Forward HTTP requests in proxy mode
- Support HTTPS `CONNECT` tunneling
- Enforce whitelist, blacklist, URL pattern, extension, and keyword rules
- Block downloads by extension from both request URLs and upstream response headers
- Preview filter decisions with `GET /filter/preview?url=<target>`
- Persist access logs to PostgreSQL

## Next Phases

- Implement admin CRUD and dashboard charts
- Add browser extension / OS-level proxy setup notes
- Improve HTTPS filtering beyond tunnel-level domain checks
