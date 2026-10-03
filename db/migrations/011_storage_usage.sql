-- Durable quota accounting for new writes, legacy writes, cascades and deletions.
UPDATE tenants t SET storage_used=coalesce((SELECT sum(size_bytes) FROM stored_files WHERE tenant_id=t.id),0)
 +coalesce((SELECT sum(size_bytes) FROM incident_recordings WHERE tenant_id=t.id),0)
 +coalesce((SELECT sum(size_bytes) FROM work_recordings WHERE tenant_id=t.id),0)
 +coalesce((SELECT sum(size_bytes) FROM tenant_files WHERE tenant_id=t.id),0)
 +coalesce((SELECT sum(octet_length(icon32)+octet_length(icon192)+octet_length(icon512)) FROM branding_assets WHERE tenant_id=t.id),0);
UPDATE tenants SET storage_quota=greatest(storage_quota,storage_used) WHERE id='00000000-0000-4000-8000-000000000001';
ALTER TABLE tenants ADD CONSTRAINT storage_within_quota CHECK(storage_used<=storage_quota);
CREATE FUNCTION plinth_storage_usage() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE before_bytes bigint:=0; after_bytes bigint:=0; owner_id uuid;
BEGIN
 IF TG_OP<>'INSERT' THEN
  owner_id:=OLD.tenant_id;
  IF TG_TABLE_NAME='branding_assets' THEN before_bytes:=octet_length(OLD.icon32)+octet_length(OLD.icon192)+octet_length(OLD.icon512); ELSE before_bytes:=OLD.size_bytes; END IF;
 END IF;
 IF TG_OP<>'DELETE' THEN
  owner_id:=NEW.tenant_id;
  IF TG_TABLE_NAME='branding_assets' THEN after_bytes:=octet_length(NEW.icon32)+octet_length(NEW.icon192)+octet_length(NEW.icon512); ELSE after_bytes:=NEW.size_bytes; END IF;
 END IF;
 UPDATE tenants SET storage_used=greatest(0,storage_used+after_bytes-before_bytes) WHERE id=owner_id;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['stored_files','incident_recordings','work_recordings','tenant_files','branding_assets'] LOOP
  EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION plinth_storage_usage()',t||'_usage',t);
 END LOOP;
END $$;
