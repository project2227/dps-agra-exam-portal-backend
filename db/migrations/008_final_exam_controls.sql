ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS kicked_at timestamptz;
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS kick_reason varchar(260);
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS consent_recording boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS incident_recordings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
 session_id uuid NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
 client_id uuid NOT NULL,
 trigger_type varchar(32) NOT NULL CHECK(trigger_type IN ('TAB_SWITCH','WINDOW_BLUR','FULLSCREEN_EXIT')),
 mime_type varchar(80) NOT NULL DEFAULT 'video/webm',
 started_at timestamptz NOT NULL DEFAULT now(),ended_at timestamptz,
 finish_reason varchar(60),size_bytes integer NOT NULL DEFAULT 0,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',
 UNIQUE(session_id,client_id)
);
CREATE INDEX IF NOT EXISTS incident_session_idx ON incident_recordings(session_id,started_at DESC);
CREATE TABLE IF NOT EXISTS incident_recording_chunks (
 recording_id uuid NOT NULL REFERENCES incident_recordings(id) ON DELETE CASCADE,
 sequence integer NOT NULL CHECK(sequence BETWEEN 0 AND 15000),
 file_bytes bytea NOT NULL CHECK(octet_length(file_bytes) BETWEEN 1 AND 1048576),
 PRIMARY KEY(recording_id,sequence)
);
