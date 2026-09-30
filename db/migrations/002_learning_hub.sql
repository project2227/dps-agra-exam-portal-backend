-- Student-led independent practice accounts. No exam enrollment is created here.
CREATE TABLE IF NOT EXISTS practice_users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 handle citext NOT NULL UNIQUE CHECK(length(handle::text) BETWEEN 3 AND 32),
 password_hash text NOT NULL,
 class_name varchar(16) NOT NULL DEFAULT 'IX',
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS courses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 teacher_id uuid NOT NULL REFERENCES teachers(id),
 title varchar(150) NOT NULL, language varchar(25) NOT NULL,
 class_name varchar(16) NOT NULL,
 summary varchar(800) NOT NULL DEFAULT '',
 -- Lesson text is teacher reviewed. Do NOT store PDF bytes or student media here.
 lessons jsonb NOT NULL DEFAULT '[]',
 quiz jsonb NOT NULL DEFAULT '[]',
 resources jsonb NOT NULL DEFAULT '[]',
 published boolean NOT NULL DEFAULT false,
 join_code_hash char(64) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS courses_public_idx ON courses(published,class_name,language);
CREATE TABLE IF NOT EXISTS course_enrollments (
 user_id uuid NOT NULL REFERENCES practice_users(id) ON DELETE CASCADE,
 course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
 completed_lessons jsonb NOT NULL DEFAULT '[]',
 joined_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,course_id)
);
CREATE TABLE IF NOT EXISTS course_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES practice_users(id) ON DELETE CASCADE,
 course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
 score integer NOT NULL CHECK(score BETWEEN 0 AND 100),
 correct integer NOT NULL, total integer NOT NULL CHECK(total>0),
 submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attempts_course_date ON course_attempts(course_id,submitted_at DESC);
CREATE TABLE IF NOT EXISTS practice_game_results (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES practice_users(id) ON DELETE CASCADE,
 game_id varchar(45) NOT NULL,
 score integer NOT NULL CHECK(score BETWEEN 0 AND 100),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS game_user_date ON practice_game_results(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS teacher_community_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 teacher_id uuid NOT NULL REFERENCES teachers(id),
 body varchar(1000) NOT NULL CHECK(length(trim(body))>0),
 resource_url varchar(1000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS teacher_messages_date ON teacher_community_messages(created_at DESC);
