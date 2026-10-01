-- Legacy sessions did not agree at join-time to server-relayed JPEG stills.
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS consent_stills BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN exam_sessions.consent_stills IS 'True only for a new session that explicitly agreed to temporary webcam/screen still forwarding at exam entry.';
