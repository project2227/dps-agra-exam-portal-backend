CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE TABLE IF NOT EXISTS teachers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name varchar(120) NOT NULL,
 email citext NOT NULL UNIQUE,password_hash text NOT NULL,subject varchar(90) NOT NULL DEFAULT 'Computers',
 assigned_classes jsonb NOT NULL DEFAULT '[]'::jsonb, role text NOT NULL DEFAULT 'teacher' CHECK(role IN ('teacher','admin')),
 active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS class_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),class_name varchar(40) NOT NULL UNIQUE,
 sections jsonb NOT NULL DEFAULT '["A"]'::jsonb,computer_teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS exams (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title varchar(180) NOT NULL,
 subject varchar(90) NOT NULL DEFAULT 'Computers', class_name varchar(40) NOT NULL,section varchar(12) NOT NULL DEFAULT 'All',
 teacher_id uuid NOT NULL REFERENCES teachers(id),exam_type varchar(16) NOT NULL CHECK(exam_type IN ('quiz','practical','mixed')),
 start_time timestamptz NOT NULL,end_time timestamptz NOT NULL,duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 1 AND 360),
 passcode_hash text,status varchar(16) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','active','closed')),
 settings jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT exam_times CHECK(end_time>start_time)
);
CREATE INDEX IF NOT EXISTS exams_active_idx ON exams(class_name,section,start_time,end_time) WHERE status IN('active','scheduled');
CREATE TABLE IF NOT EXISTS questions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
 type varchar(8) NOT NULL CHECK(type IN ('mcq','short','long','code','file')),
 title varchar(240) NOT NULL,description text NOT NULL DEFAULT '',options jsonb NOT NULL DEFAULT '[]',
 correct_answer jsonb, marks numeric(8,2) NOT NULL CHECK(marks>=0),language varchar(30),starter_code text NOT NULL DEFAULT '',
 visible_tests jsonb NOT NULL DEFAULT '[]',hidden_tests jsonb NOT NULL DEFAULT '[]',sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS questions_exam_idx ON questions(exam_id,sort_order);
CREATE TABLE IF NOT EXISTS exam_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),exam_id uuid NOT NULL REFERENCES exams(id),student_name varchar(120) NOT NULL,
 roll_number varchar(32) NOT NULL,class_name varchar(40) NOT NULL,section varchar(12) NOT NULL,
 token_hash char(64) NOT NULL UNIQUE,joined_at timestamptz NOT NULL DEFAULT now(),submitted_at timestamptz,
 status varchar(20) NOT NULL DEFAULT 'joined' CHECK(status IN ('joined','active','submitted','disconnected','flagged','revoked')),
 fingerprint_hash char(64),user_agent varchar(220),browser varchar(90),os varchar(90),screen_size varchar(30),timezone varchar(80),
 ip_address inet,active_socket_id varchar(120),cheating_score integer NOT NULL DEFAULT 0,flags_count integer NOT NULL DEFAULT 0,
 consent_webcam boolean NOT NULL DEFAULT false,consent_screen boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS session_active_roll_uniq ON exam_sessions(exam_id,lower(roll_number),lower(class_name),lower(section))
 WHERE status IN ('joined','active','disconnected','flagged');
CREATE INDEX IF NOT EXISTS sessions_exam_idx ON exam_sessions(exam_id,joined_at);
CREATE TABLE IF NOT EXISTS answers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),exam_id uuid NOT NULL REFERENCES exams(id),
 session_id uuid NOT NULL REFERENCES exam_sessions(id),question_id uuid NOT NULL REFERENCES questions(id),
 answer_text text,code text,language varchar(30),file_key text,auto_saved_at timestamptz NOT NULL DEFAULT now(),
 submitted_at timestamptz,marks_awarded numeric(8,2),teacher_remarks text,
 UNIQUE(session_id,question_id)
);
CREATE TABLE IF NOT EXISTS code_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),exam_id uuid NOT NULL REFERENCES exams(id),
 session_id uuid NOT NULL REFERENCES exam_sessions(id),question_id uuid NOT NULL REFERENCES questions(id),
 language varchar(30) NOT NULL, code text NOT NULL,stdin text,stdout text,stderr text,
 status varchar(40) NOT NULL,test_results jsonb NOT NULL DEFAULT '[]',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS code_runs_session_idx ON code_runs(session_id,question_id,created_at DESC);
CREATE TABLE IF NOT EXISTS handouts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title varchar(180) NOT NULL,description text NOT NULL DEFAULT '',
 file_key text NOT NULL,file_type varchar(40) NOT NULL,class_name varchar(40) NOT NULL,section varchar(12) NOT NULL DEFAULT 'All',
 uploaded_by uuid NOT NULL REFERENCES teachers(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS exam_dates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title varchar(180) NOT NULL,class_name varchar(40) NOT NULL,
 section varchar(12) NOT NULL DEFAULT 'All',date timestamptz NOT NULL,description text NOT NULL DEFAULT '',
 created_by uuid NOT NULL REFERENCES teachers(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS anti_cheat_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),exam_id uuid NOT NULL REFERENCES exams(id),session_id uuid NOT NULL REFERENCES exam_sessions(id),
 event_type varchar(45) NOT NULL,severity varchar(8) NOT NULL CHECK(severity IN ('low','medium','high')),
 message varchar(260) NOT NULL DEFAULT '',metadata jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS proctor_exam_idx ON anti_cheat_events(exam_id,created_at DESC);
CREATE INDEX IF NOT EXISTS proctor_session_idx ON anti_cheat_events(session_id,created_at DESC);
CREATE TABLE IF NOT EXISTS audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),teacher_id uuid REFERENCES teachers(id),exam_id uuid REFERENCES exams(id),
 action varchar(64) NOT NULL,details jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now()
);
