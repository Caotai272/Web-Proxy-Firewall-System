INSERT INTO rules (type, target, action, description)
VALUES
    ('domain', 'facebook.com', 'block', 'Block social media domain'),
    ('domain', 'youtube.com', 'block', 'Block streaming domain'),
    ('domain', 'example.com', 'allow', 'Allow demo safe domain'),
    ('url_pattern', '/download/', 'block', 'Block generic download paths')
ON CONFLICT DO NOTHING;

INSERT INTO blocked_extensions (extension, description)
VALUES
    ('.exe', 'Executable files'),
    ('.zip', 'Compressed archives'),
    ('.apk', 'Android packages')
ON CONFLICT (extension) DO NOTHING;
