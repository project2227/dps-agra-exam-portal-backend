-- Removing a published exam archives it instead of destroying assessed work.
ALTER TABLE exams ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS exams_teacher_visible_idx
 ON exams (teacher_id,created_at DESC) WHERE archived_at IS NULL;
