-- Optional bounded, private storage for small teaching files on existing Neon.
-- No existing S3 files or handout metadata are changed.
CREATE TABLE IF NOT EXISTS stored_files (
 storage_key text PRIMARY KEY,
 file_bytes bytea NOT NULL,
 mime_type varchar(110) NOT NULL,
 original_name varchar(155) NOT NULL,
 size_bytes integer NOT NULL CHECK(size_bytes BETWEEN 1 AND 5242880),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT stored_files_valid_size CHECK(octet_length(file_bytes)=size_bytes)
);
CREATE INDEX IF NOT EXISTS stored_files_created_idx ON stored_files(created_at);
