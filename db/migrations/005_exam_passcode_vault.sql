-- Preserve bcrypt verification while enabling owner-only repeat viewing.
-- The application stores a separately AES-256-GCM encrypted display copy;
-- the encryption key remains only in Render's private backend environment.
ALTER TABLE exams ADD COLUMN IF NOT EXISTS passcode_ciphertext text;
