CREATE TABLE students (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 admission_number citext NOT NULL UNIQUE CHECK (length(admission_number::text) BETWEEN 1 AND 40),
 name varchar(120) NOT NULL,
 roll_number varchar(32) NOT NULL,
 class_name varchar(40) NOT NULL REFERENCES class_groups(class_name),
 section varchar(12) NOT NULL,
 school_email citext,
 password_hash text NOT NULL,
 must_change_password boolean NOT NULL DEFAULT true,
 temporary_password_expires_at timestamptz,
 display_name varchar(40) NOT NULL DEFAULT '',
 avatar varchar(24) NOT NULL DEFAULT 'book',
 theme varchar(10) NOT NULL DEFAULT 'light' CHECK (theme IN ('light','dark','system')),
 active boolean NOT NULL DEFAULT true,
 learning_import_decided_at timestamptz,
 created_by uuid REFERENCES teachers(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX students_class_roll_unique ON students(lower(roll_number),lower(class_name),lower(section)) WHERE active;
CREATE INDEX students_class_idx ON students(class_name,section);

CREATE TABLE account_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 token_hash text NOT NULL UNIQUE,
 csrf_hash text NOT NULL,
 student_id uuid REFERENCES students(id),
 teacher_id uuid REFERENCES teachers(id),
 device_label varchar(90) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 CHECK ((student_id IS NULL) <> (teacher_id IS NULL))
);
CREATE INDEX account_sessions_student_idx ON account_sessions(student_id) WHERE revoked_at IS NULL;
CREATE INDEX account_sessions_teacher_idx ON account_sessions(teacher_id) WHERE revoked_at IS NULL;
CREATE INDEX account_sessions_expiry_idx ON account_sessions(expires_at);

CREATE TABLE account_login_limits (
 key_hash text PRIMARY KEY,
 failures integer NOT NULL DEFAULT 0,
 window_start timestamptz NOT NULL DEFAULT now(),
 locked_until timestamptz
);
CREATE TABLE student_password_resets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_id uuid NOT NULL REFERENCES students(id),
 token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE student_deletion_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_id uuid NOT NULL REFERENCES students(id),
 status varchar(12) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
 requested_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,
 resolved_by uuid REFERENCES teachers(id)
);
CREATE UNIQUE INDEX one_pending_student_deletion ON student_deletion_requests(student_id) WHERE status='pending';
CREATE TABLE student_learning_progress (
 student_id uuid PRIMARY KEY REFERENCES students(id),
 progress jsonb NOT NULL DEFAULT '{"courses":{},"mocks":[],"games":{},"customTests":[]}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exam_sessions ADD COLUMN student_id uuid REFERENCES students(id);
ALTER TABLE answers ADD COLUMN student_id uuid REFERENCES students(id);
ALTER TABLE code_runs ADD COLUMN student_id uuid REFERENCES students(id);
ALTER TABLE anti_cheat_events ADD COLUMN student_id uuid REFERENCES students(id);
CREATE INDEX exam_sessions_student_idx ON exam_sessions(student_id,submitted_at);
ALTER TABLE exams ADD COLUMN results_released_at timestamptz;
ALTER TABLE practice_users ADD COLUMN student_id uuid UNIQUE REFERENCES students(id);
ALTER TABLE course_attempts ADD COLUMN student_id uuid REFERENCES students(id);
ALTER TABLE course_enrollments ADD COLUMN student_id uuid REFERENCES students(id);
ALTER TABLE practice_game_results ADD COLUMN student_id uuid REFERENCES students(id);

-- Resolve ownership on the server, including every existing autosave/proctor path.
CREATE FUNCTION set_exam_record_student() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 SELECT student_id INTO NEW.student_id FROM exam_sessions WHERE id=NEW.session_id;
 RETURN NEW;
END $$;
CREATE TRIGGER answers_student BEFORE INSERT OR UPDATE OF session_id ON answers FOR EACH ROW EXECUTE FUNCTION set_exam_record_student();
CREATE TRIGGER code_runs_student BEFORE INSERT OR UPDATE OF session_id ON code_runs FOR EACH ROW EXECUTE FUNCTION set_exam_record_student();
CREATE TRIGGER proctor_student BEFORE INSERT OR UPDATE OF session_id ON anti_cheat_events FOR EACH ROW EXECUTE FUNCTION set_exam_record_student();
CREATE FUNCTION set_practice_record_student() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 SELECT student_id INTO NEW.student_id FROM practice_users WHERE id=NEW.user_id;
 RETURN NEW;
END $$;
CREATE TRIGGER courses_student BEFORE INSERT OR UPDATE OF user_id ON course_attempts FOR EACH ROW EXECUTE FUNCTION set_practice_record_student();
CREATE TRIGGER enrollments_student BEFORE INSERT OR UPDATE OF user_id ON course_enrollments FOR EACH ROW EXECUTE FUNCTION set_practice_record_student();
CREATE TRIGGER games_student BEFORE INSERT OR UPDATE OF user_id ON practice_game_results FOR EACH ROW EXECUTE FUNCTION set_practice_record_student();
