-- Public access requests are never teacher accounts. An existing, authorized
-- administrator must verify each request before issuing any staff credentials.
CREATE TABLE IF NOT EXISTS teacher_access_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name varchar(120) NOT NULL,
 email citext NOT NULL,
 subject varchar(90) NOT NULL DEFAULT 'Computers',
 requested_classes jsonb NOT NULL DEFAULT '[]'::jsonb,
 message varchar(400) NOT NULL DEFAULT '',
 status varchar(12) NOT NULL DEFAULT 'pending'
   CHECK (status IN ('pending','approved','declined')),
 reviewed_by uuid REFERENCES teachers(id) ON DELETE SET NULL,
 teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_teacher_request_email
 ON teacher_access_requests(email) WHERE status='pending';
CREATE INDEX IF NOT EXISTS idx_teacher_request_review
 ON teacher_access_requests(status,created_at DESC);
