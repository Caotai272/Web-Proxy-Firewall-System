# API Design

## Admin Service

- `GET /health`: service health and database connectivity
- `GET /dashboard`: render dashboard page
- `GET /filter-lab`: manual browser test page for the filtering pipeline
- `GET /api/dashboard/stats`: summary metrics
- `GET /api/logs/summary`: aggregated logging metrics from PostgreSQL
- `GET /api/rules`: list rules
- `GET /api/logs`: list access logs

## Proxy Service

- `GET /health`: service health and database connectivity
- `GET /block-preview`: preview the block page template
- `ALL /proxy?url=<target>`: direct helper endpoint for testing proxy forwarding
- `GET /filter/preview?url=<target>`: returns request-stage and response-stage filter decisions as JSON
- `HTTP proxy mode`: accepts absolute-form HTTP requests from browser or client proxy settings
- `CONNECT <host>:443`: accepts HTTPS tunnel requests and applies domain-based filtering before opening the tunnel
