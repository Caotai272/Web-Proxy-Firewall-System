# Database Design

## Tables

- `rules`: domain, URL, and whitelist/blacklist rules
- `keywords`: banned keywords to scan in URLs or HTML responses
- `blocked_extensions`: file extensions that should be denied
- `access_logs`: request log for auditing and dashboard statistics

## Access Log Fields

- `decision`, `rule_stage`, `matched_rule`: final proxy decision and which filtering stage produced it
- `status_code`, `upstream_status`: proxy response status and upstream status when available
- `final_url`, `content_type`, `detected_extension`: response metadata used for filtering and admin analysis
- `response_size_bytes`, `latency_ms`: basic performance and payload metrics for dashboard summaries

Because Docker volumes are persistent, schema changes for existing environments are applied at service startup through `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` compatibility checks.

## Rule Order

1. Whitelist
2. Blacklist domain
3. URL pattern
4. File extension
5. Keyword

The current setup seeds a small demo dataset so the stack has usable data immediately after startup.
