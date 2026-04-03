# API Design

## Admin Service

- `GET /health`: service health and database connectivity
- `GET /dashboard`: render dashboard page
- `GET /api/dashboard/stats`: summary metrics
- `GET /api/rules`: list rules
- `GET /api/logs`: list access logs

## Proxy Service

- `GET /health`: service health and database connectivity
- `GET /block-preview`: preview the block page template
- `ALL /proxy?url=<target>`: direct helper endpoint for testing proxy forwarding
- `HTTP proxy mode`: accepts absolute-form HTTP requests from browser or client proxy settings
- `CONNECT <host>:443`: accepts HTTPS tunnel requests and applies domain-based filtering before opening the tunnel
