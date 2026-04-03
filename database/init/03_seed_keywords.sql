INSERT INTO keywords (keyword, description)
VALUES
    ('gambling', 'Block gambling-related content'),
    ('adult', 'Block adult content'),
    ('torrent', 'Block torrent-related content')
ON CONFLICT (keyword) DO NOTHING;

INSERT INTO access_logs (request_method, url, domain, client_ip, decision, matched_rule, status_code, blocked_reason)
VALUES
    ('GET', 'http://facebook.com/', 'facebook.com', '127.0.0.1', 'block', 'domain:blacklist', 403, 'Blocked by seeded domain rule'),
    ('GET', 'http://example.com/', 'example.com', '127.0.0.1', 'allow', 'domain:whitelist', 200, NULL);
