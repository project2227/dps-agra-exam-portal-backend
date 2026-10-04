CREATE TABLE work_activity_intervals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),
 session_id uuid NOT NULL,user_id uuid NOT NULL,team_id uuid NOT NULL,bucket timestamptz NOT NULL,
 mode varchar(12) NOT NULL CHECK(mode IN('writing','reading','meeting')),
 source varchar(12) NOT NULL CHECK(source IN('browser','desktop')),
 seconds integer NOT NULL CHECK(seconds BETWEEN 0 AND 30),
 input_events integer NOT NULL CHECK(input_events BETWEEN 0 AND 2000),
 edits integer NOT NULL CHECK(edits BETWEEN 0 AND 10000),repeats integer NOT NULL CHECK(repeats BETWEEN 0 AND 2000),
 idle_seconds integer NOT NULL CHECK(idle_seconds BETWEEN 0 AND 86400),
 category varchar(12) NOT NULL CHECK(category IN('editing','interaction','reading','meeting','idle','unknown')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,session_id,bucket),
 FOREIGN KEY(tenant_id,session_id) REFERENCES work_sessions(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,user_id) REFERENCES org_users(tenant_id,id),
 FOREIGN KEY(tenant_id,team_id) REFERENCES teams(tenant_id,id)
);
CREATE INDEX work_activity_report ON work_activity_intervals(tenant_id,bucket,user_id);
CREATE TABLE work_progress_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL DEFAULT plinth_tenant() REFERENCES tenants(id),
 user_id uuid NOT NULL,team_id uuid NOT NULL,task_id uuid NOT NULL,
 summary varchar(3000) NOT NULL,ai_consent boolean NOT NULL DEFAULT false,ai_review jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,user_id) REFERENCES org_users(tenant_id,id),
 FOREIGN KEY(tenant_id,team_id) REFERENCES teams(tenant_id,id),
 FOREIGN KEY(tenant_id,task_id) REFERENCES work_tasks(tenant_id,id) ON DELETE CASCADE
);
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['work_activity_intervals','work_progress_notes'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',n);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',n);
  EXECUTE format('CREATE POLICY tenant_boundary ON %I USING(tenant_id=plinth_tenant()) WITH CHECK(tenant_id=plinth_tenant())',n);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON %I TO plinth_runtime',n);
 END LOOP;
END $$;
