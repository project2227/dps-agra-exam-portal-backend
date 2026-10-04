-- Additive, opt-in browser-local analysis. Existing exams and guest records are unchanged.
ALTER TABLE exam_sessions ADD COLUMN consent_vision boolean NOT NULL DEFAULT false;
