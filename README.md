# Web Proxy Firewall System

Multi-service demo project for a web proxy firewall system using Node.js, Express, PostgreSQL, and Docker Compose.

## Services

- `proxy-service`: proxy/filter service skeleton
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
- Admin dashboard: `http://localhost:4000/dashboard`
- Admin API health: `http://localhost:4000/health`

## Project Layout

- `docs/`: architecture, API, and database notes
- `proxy-service/`: proxy service source and Dockerfile
- `admin-service/`: admin service source and Dockerfile
- `database/init/`: PostgreSQL init and seed scripts

## Next Phases

- Build proxy forwarding flow
- Add rule filtering pipeline
- Add access log persistence
- Implement admin CRUD and dashboard charts
