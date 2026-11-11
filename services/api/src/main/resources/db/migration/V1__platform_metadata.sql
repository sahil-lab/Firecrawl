CREATE TABLE platform_metadata (
    name VARCHAR(64) PRIMARY KEY,
    value VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO platform_metadata (name, value)
VALUES ('schema_version', '1');
