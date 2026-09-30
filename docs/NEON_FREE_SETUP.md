# Free Neon PostgreSQL for DPS Agra Exam Portal (staging)

This backend must have its OWN database. NEVER use `cyber-arena-db`, import Cyber Arena tables, or put connection credentials in GitHub or chat messages.

## Connect Neon

Preferred: authorize the Neon plugin in ChatGPT and ask to create a free project called `dps-agra-exam-db`. This lets the assistant manage the new project without receiving your database password in chat.

Manual alternative:
1. Sign up at https://console.neon.tech/ and select **Free**.
2. Create project `dps-agra-exam-db`, preferably an east-US region near the existing Render Virginia workspace.
3. Use the default `neondb` database or a dedicated `dps_exam` database with a restricted application role.
4. Use **Connect > direct connection** (turn OFF pooled connection). This backend's migration runner uses session-level `pg_advisory_lock`; a transaction-pooled connection is not suitable for its migration session.

Do not paste the connection string in this chat, any issue, a GitHub commit, or your InfinityFree frontend. Put it in Render **Environment** only, using `DATABASE_URL`. The connection string is a credential.

## Configure a separate Render API service

Repository: https://github.com/project2227/dps-agra-exam-portal-backend
Name: `dps-agra-exam-api`
Region: Virginia (prefer matching Neon geography).
Build: `npm install && npm run check && npm test`
Start: `npm start`
Health: `/api/health`

Set these Render environment variables (see `docs/DEPLOY.md`):
- `NODE_ENV=production`
- `DATABASE_URL`: your **direct** Neon Postgres URL, only in Render's Environment screen
- `DATABASE_SSL=true` (the Node adapter removes `sslmode` query options and enforces certificate verification)
- `FRONTEND_URL`: exact HTTPS origin of the **separate exam frontend**, not Cyber Arena's URL
- `JWT_SECRET` and `STUDENT_SESSION_SECRET`: two independent cryptographically random secrets, each at least 32 chars
- `FINGERPRINT_PEPPER`: independent random secret, at least 16 chars
- `UPLOAD_PROVIDER=disabled`
- `STORE_IP=false`
- `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`: use only during the very first startup; remove from Render immediately after creating the admin

Deploy, verify `GET /api/health` reports a connected database, and use only synthetic test accounts until the complete end-to-end checklist in `docs/DEPLOY.md` passes.

## Free-plan limitations

Neon Free suspends inactive compute after approximately five minutes; 0.5 GB/project storage and compute/network limits apply. This is appropriate for development and demonstrations, not an examination where uptime and data integrity are critical. Upgrade to reliable always-on infrastructure with backups and rehearse failover before real exams.

Docs: https://neon.com/docs/introduction/plans and https://neon.com/docs/get-started/connect-neon
