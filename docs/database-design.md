# Database Design

## Tables

- `rules`: domain, URL, and whitelist/blacklist rules
- `keywords`: banned keywords to scan in URLs or HTML responses
- `blocked_extensions`: file extensions that should be denied
- `access_logs`: request log for auditing and dashboard statistics

## Rule Order

1. Whitelist
2. Blacklist domain
3. URL pattern
4. File extension
5. Keyword

The current setup seeds a small demo dataset so the stack has usable data immediately after startup.
