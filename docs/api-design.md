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

Later phases will add proxy request handling, CRUD endpoints, and more detailed filtering APIs.
