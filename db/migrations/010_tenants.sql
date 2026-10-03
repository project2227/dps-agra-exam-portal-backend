-- Additive DPS migration: stable IDs, hashes, answers and passcodes are retained.
CREATE TABLE tenants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug varchar(48) NOT NULL UNIQUE CHECK(slug ~ '^[a-z][a-z0-9-]{2,47}$'),
 name varchar(120) NOT NULL, path varchar(12) NOT NULL CHECK(path IN('institute','workplace')),
 status varchar(16) NOT NULL DEFAULT 'unverified' CHECK(status IN('unverified','provisioning','ready','suspended','deleting','failed')),
 theme jsonb NOT NULL DEFAULT '{}', features jsonb NOT NULL DEFAULT '[]',
 logo_key text, storage_quota bigint NOT NULL DEFAULT 134217728 CHECK(storage_quota BETWEEN 1048576 AND 1073741824),
 storage_used bigint NOT NULL DEFAULT 0 CHECK(storage_used>=0), retention_days integer NOT NULL DEFAULT 30 CHECK(retention_days BETWEEN 1 AND 30),
 monitoring_policy jsonb NOT NULL DEFAULT '{"version":1,"enabled":false,"timezone":"Asia/Kolkata","start":"09:00","end":"18:00","days":[1,2,3,4,5],"allowlist":[],"noticeAccepted":false}',
 verified_at timestamptz, last_active_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO tenants(id,slug,name,path,status,verified_at,features,theme)
 VALUES('00000000-0000-4000-8000-000000000001','dps-agra','DPS Agra','institute','ready',now(),
 '["exams","monitoring","students","classes","handouts","learning","ide","community","attendance","timetable","announcements","fees","profiles"]',
 '{"preset":"chalk","primary":"#24563c","accent":"#2ec4b6","radius":16}') ON CONFLICT DO NOTHING;

-- Backwards-compatible default is restricted to DPS, never all tenants.
CREATE FUNCTION plinth_tenant() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT coalesce(nullif(current_setting('app.tenant_id',true),'')::uuid,'00000000-0000-4000-8000-000000000001'::uuid)
$$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['teachers','class_groups','exams','questions','exam_sessions','answers','code_runs','handouts','exam_dates','anti_cheat_events','audit_logs','practice_users','courses','course_enrollments','course_attempts','practice_game_results','teacher_community_messages','teacher_access_requests','stored_files','incident_recordings','incident_recording_chunks','students','account_sessions','account_login_limits','student_password_resets','student_deletion_requests','student_learning_progress'] LOOP
  EXECUTE format('ALTER TABLE %I ADD COLUMN tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id)',t);
  EXECUTE format('CREATE INDEX %I ON %I(tenant_id)',t||'_tenant_idx',t);
 END LOOP;
END $$;
ALTER TABLE students DROP CONSTRAINT students_class_name_fkey;
ALTER TABLE class_groups DROP CONSTRAINT class_groups_class_name_key;
ALTER TABLE class_groups ADD UNIQUE(tenant_id,class_name);
ALTER TABLE students ADD FOREIGN KEY(tenant_id,class_name) REFERENCES class_groups(tenant_id,class_name);
ALTER TABLE teachers DROP CONSTRAINT teachers_email_key;
ALTER TABLE teachers ADD UNIQUE(tenant_id,email);
ALTER TABLE students DROP CONSTRAINT students_admission_number_key;
ALTER TABLE students ADD UNIQUE(tenant_id,admission_number);
DROP INDEX students_class_roll_unique;
CREATE UNIQUE INDEX students_class_roll_unique ON students(tenant_id,lower(roll_number),lower(class_name),lower(section)) WHERE active;
ALTER TABLE practice_users DROP CONSTRAINT practice_users_handle_key;
ALTER TABLE practice_users ADD UNIQUE(tenant_id,handle);
ALTER TABLE account_login_limits DROP CONSTRAINT account_login_limits_pkey;
ALTER TABLE account_login_limits ADD PRIMARY KEY(tenant_id,key_hash);
DROP INDEX uq_pending_teacher_request_email;
CREATE UNIQUE INDEX uq_pending_teacher_request_email ON teacher_access_requests(tenant_id,email) WHERE status='pending';

CREATE TABLE org_users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),
 name varchar(120) NOT NULL,email citext NOT NULL,password_hash text NOT NULL,
 role varchar(12) NOT NULL CHECK(role IN('admin','manager','teacher','employee')),
 teacher_id uuid REFERENCES teachers(id), active boolean NOT NULL DEFAULT true,verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,email), UNIQUE(tenant_id,id)
);
INSERT INTO org_users(tenant_id,name,email,password_hash,role,teacher_id,active,verified_at)
 SELECT tenant_id,name,email,password_hash,CASE WHEN role='admin' THEN 'admin' ELSE 'teacher' END,id,active,now() FROM teachers;
CREATE TABLE org_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),
 user_id uuid NOT NULL REFERENCES org_users(id),token_hash text NOT NULL UNIQUE,csrf_hash text NOT NULL,
 device_label varchar(90) NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL,revoked_at timestamptz
);
CREATE TABLE teams (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),
 name varchar(90) NOT NULL,manager_id uuid REFERENCES org_users(id),is_sample boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,name),UNIQUE(tenant_id,id)
);
CREATE TABLE team_members (
 tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),team_id uuid NOT NULL REFERENCES teams(id),user_id uuid NOT NULL REFERENCES org_users(id),
 PRIMARY KEY(team_id,user_id)
);
CREATE TABLE monitoring_consents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),
 user_id uuid NOT NULL REFERENCES org_users(id),policy_version integer NOT NULL,accepted_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz,notice jsonb NOT NULL,UNIQUE(tenant_id,user_id,policy_version)
);
CREATE TABLE work_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),
 user_id uuid NOT NULL REFERENCES org_users(id),team_id uuid NOT NULL REFERENCES teams(id),consent_id uuid NOT NULL REFERENCES monitoring_consents(id),
 status varchar(12) NOT NULL DEFAULT 'sharing' CHECK(status IN('sharing','paused','offline','ended')),
 webcam_on boolean NOT NULL DEFAULT false,active_socket_id varchar(120),started_at timestamptz NOT NULL DEFAULT now(),
 ended_at timestamptz,last_seen_at timestamptz NOT NULL DEFAULT now(),active_seconds integer NOT NULL DEFAULT 0,break_seconds integer NOT NULL DEFAULT 0,
 UNIQUE(tenant_id,id)
);
CREATE UNIQUE INDEX one_open_work_session ON work_sessions(user_id) WHERE ended_at IS NULL;
CREATE TABLE work_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),
 session_id uuid NOT NULL REFERENCES work_sessions(id),user_id uuid NOT NULL REFERENCES org_users(id),
 event_type varchar(45) NOT NULL,severity varchar(8) NOT NULL CHECK(severity IN('low','medium','high')),
 message varchar(300) NOT NULL DEFAULT '',metadata jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id)
);
CREATE TABLE work_recordings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),
 session_id uuid NOT NULL REFERENCES work_sessions(id),flag_id uuid NOT NULL REFERENCES work_events(id),client_id uuid NOT NULL,
 mime_type varchar(80) NOT NULL,size_bytes integer NOT NULL DEFAULT 0,started_at timestamptz NOT NULL DEFAULT now(),ended_at timestamptz,
 finish_reason varchar(60),expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',UNIQUE(session_id,client_id),UNIQUE(tenant_id,id)
);
CREATE TABLE work_recording_chunks (
 tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),recording_id uuid NOT NULL REFERENCES work_recordings(id) ON DELETE CASCADE,
 sequence integer NOT NULL CHECK(sequence>=0),file_bytes bytea NOT NULL,PRIMARY KEY(recording_id,sequence)
);
CREATE TABLE work_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),
 team_id uuid NOT NULL REFERENCES teams(id),assignee_id uuid REFERENCES org_users(id),created_by uuid NOT NULL REFERENCES org_users(id),
 title varchar(180) NOT NULL,description varchar(4000) NOT NULL DEFAULT '',status varchar(16) NOT NULL DEFAULT 'todo' CHECK(status IN('todo','in_progress','done')),
 due_at timestamptz,is_sample boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,id)
);
CREATE TABLE task_comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),task_id uuid NOT NULL REFERENCES work_tasks(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES org_users(id),body varchar(2000) NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE chat_channels (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),name varchar(90) NOT NULL,
 kind varchar(8) NOT NULL DEFAULT 'channel' CHECK(kind IN('channel','dm')),dm_key text,
 is_sample boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,dm_key),UNIQUE(tenant_id,id)
);
CREATE TABLE chat_members (
 tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),channel_id uuid NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES org_users(id),last_read_at timestamptz NOT NULL DEFAULT '1970-01-01',PRIMARY KEY(channel_id,user_id)
);
CREATE TABLE chat_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),
 channel_id uuid NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES org_users(id),
 body varchar(4000) NOT NULL DEFAULT '',mentions jsonb NOT NULL DEFAULT '[]',pinned boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,id)
);
CREATE INDEX chat_history_idx ON chat_messages(channel_id,created_at DESC);
CREATE TABLE tenant_files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),
 channel_id uuid REFERENCES chat_channels(id) ON DELETE CASCADE,message_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
 uploaded_by uuid REFERENCES org_users(id),name varchar(160) NOT NULL,mime_type varchar(90) NOT NULL,size_bytes integer NOT NULL CHECK(size_bytes>0),
 file_bytes bytea NOT NULL,pinned boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,id)
);
CREATE TABLE erp_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),
 kind varchar(16) NOT NULL CHECK(kind IN('attendance','timetable','announcements','fees','profiles')),
 student_id uuid REFERENCES students(id),class_name varchar(40),section varchar(12),record_date date,
 data jsonb NOT NULL,created_by uuid REFERENCES teachers(id),is_sample boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,id)
);
CREATE TABLE branding_assets (
 tenant_id uuid PRIMARY KEY DEFAULT plinth_tenant() REFERENCES tenants(id),
 icon32 bytea NOT NULL,icon192 bytea NOT NULL,icon512 bytea NOT NULL,updated_at timestamptz NOT NULL DEFAULT now()
);

-- Internal platform metadata. Never exposed through ordinary tenant query access.
CREATE TABLE platform_email_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),token_hash text NOT NULL UNIQUE,
 kind varchar(12) NOT NULL CHECK(kind IN('verify','invite','entry')),email citext NOT NULL,payload jsonb NOT NULL DEFAULT '{}',
 expires_at timestamptz NOT NULL,used_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE provisioning_jobs (
 tenant_id uuid PRIMARY KEY REFERENCES tenants(id),stage varchar(24) NOT NULL DEFAULT 'verified',status varchar(12) NOT NULL DEFAULT 'pending',
 attempts integer NOT NULL DEFAULT 0,error_code varchar(60),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE platform_limits (key_hash text PRIMARY KEY,failures integer NOT NULL DEFAULT 0,window_start timestamptz NOT NULL DEFAULT now(),locked_until timestamptz);
CREATE TABLE platform_owners (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email citext NOT NULL UNIQUE,password_hash text NOT NULL,name varchar(120) NOT NULL);
CREATE TABLE platform_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL REFERENCES platform_owners(id),token_hash text NOT NULL UNIQUE,csrf_hash text NOT NULL,expires_at timestamptz NOT NULL,revoked_at timestamptz);

-- Every foreign key between owned tables also includes tenant_id. A guessed
-- foreign UUID must not link a row to another organisation.
DO $$ DECLARE r record; cols text; refs text; BEGIN
 FOR r IN SELECT c.*,c.conrelid::regclass::text AS child,c.confrelid::regclass::text AS parent FROM pg_constraint c
  WHERE c.contype='f' AND cardinality(c.conkey)=1
  AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=c.conrelid AND attname='tenant_id')
  AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=c.confrelid AND attname='tenant_id') LOOP
  SELECT quote_ident(attname) INTO cols FROM pg_attribute WHERE attrelid=r.conrelid AND attnum=r.conkey[1];
  SELECT quote_ident(attname) INTO refs FROM pg_attribute WHERE attrelid=r.confrelid AND attnum=r.confkey[1];
  EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON %s(tenant_id,%s)',replace(r.parent,'.','_')||'_'||r.confkey[1]||'_scope_unique',r.parent,refs);
  EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY(tenant_id,%s) REFERENCES %s(tenant_id,%s)%s',r.child,left(r.conname,48)||'_scope',cols,r.parent,refs,CASE r.confdeltype WHEN 'c' THEN ' ON DELETE CASCADE' ELSE '' END);
 END LOOP;
END $$;
DO $$ DECLARE t record; BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='plinth_runtime') THEN CREATE ROLE plinth_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
 EXECUTE format('GRANT plinth_runtime TO %I',current_user);
 GRANT USAGE ON SCHEMA public TO plinth_runtime;
 GRANT SELECT ON tenants TO plinth_runtime;
 GRANT UPDATE(storage_used) ON tenants TO plinth_runtime;
 ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
 CREATE POLICY tenant_metadata_boundary ON tenants USING(id=plinth_tenant()) WITH CHECK(id=plinth_tenant());
 FOR t IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='tenant_id'
  AND table_name NOT IN('platform_email_links','provisioning_jobs') LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t.table_name);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t.table_name);
  EXECUTE format('CREATE POLICY tenant_boundary ON %I USING(tenant_id=plinth_tenant()) WITH CHECK(tenant_id=plinth_tenant())',t.table_name);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON %I TO plinth_runtime',t.table_name);
 END LOOP;
END $$;
