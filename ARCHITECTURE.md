# Plinth architecture

## Compatibility baseline

Source: project2227/dps-agra-exam-portal-backend, deployed commit d62579178142e9d70c790a63f5dc2fe1c7c0b39a. Work is isolated from the existing DPSLab checkout. Every existing Institute route and exam contract remains available. DPSLab currently starts incident recording after a flag; it does not have a pre-flag rolling buffer. The original default remains unchanged. Workplace opts into a bounded five-second pre-roll through the shared web recorder, never native capture.

## Tenant boundary

Tenant selection resolves a validated hostname to the tenants table; a client tenant_id/header is never used. Custom wildcard domains route to the same process. A deployment without an owned wildcard domain uses validated /t/:slug routes as a temporary address; it must not claim that an unregistered subdomain is live. Requests authenticate membership within the resolved tenant.

Each organisation-owned table, including every legacy Institute table, receives tenant_id. PostgreSQL FORCE ROW LEVEL SECURITY and a non-BYPASSRLS runtime role enforce the boundary. Every ordinary database operation starts a transaction, sets the role and a server-resolved tenant context with SET LOCAL, runs the existing query, then commits. AsyncLocalStorage binds HTTP and every Socket.IO packet to that context. Composite foreign keys prevent linking one tenant's record to another's parent, even if a UUID is known. Natural uniqueness (admission number, class name, email, rate-limit keys) is tenant-local. Platform metadata is accessed only through a separate explicit internal query capability.

Existing rows migrate to the fixed DPS Agra tenant, without reassigning UUIDs, changing password hashes, losing submissions or changing passcodes. A default DPS context preserves the old backend during the deployment overlap; the new application's ordinary queries fail closed without an explicit tenant. Teacher-created minor accounts remain closed to public sign-up. Workplace invitation passwords are set by the invitee.

## Identity

Bcrypt passwords; opaque random cookies with server-side revocation and two-hour/seven-day expiry. Plinth same-origin hosting uses httpOnly, Secure, SameSite=Lax, host-only cookies plus CSRF tokens and origin validation. Legacy DPS cookie/token adapters retain exam sessions during transition. Admission accounts remain teacher managed. Org admin can invite teachers/managers/employees; organisation ownership is separate from platform ownership. The platform-owner role is bootstrapped only from server environment variables and cannot be self-selected at sign-up. IP/account lockouts persist in SQL. Authentication errors do not disclose account existence.

## Provisioning and branding

Sign-up reserves a slug atomically, blocks reserved/invalid words, hashes the admin password and creates an expiring, unverified tenant. Verification tokens are stored as hashes, are single-use and expire. Email delivery uses Brevo HTTPS or TLS-protected SMTP; without verified delivery configuration public sign-up fails closed, rather than treating an on-screen token as verification. A transactional SQL job queue stores stages: verified, features, sample data, branding, routing, ready. Jobs are idempotent, recover after restarts and retry bounded failures. Browser polling reflects real stages. Automatic routing needs no per-tenant infrastructure when a wildcard domain is configured.

Uploads accept bounded PNG/JPEG/WebP logos, decode and re-encode with Sharp, crop a square logo and derive 32/192/512px icons. Never allow active SVG/HTML uploads. Tenant theme tokens are validated on the server and select AA foregrounds. Sample records carry is_sample and can be removed independently of real records.

## Shared monitoring

The frontend useStudentRTC/useTeacherRTC hooks handle offers, answers, ICE queues, bitrate limits and reconnects in both paths. The signalling relay shares one validator with path adapters for ownership/session validity. Institute socket events and severity map remain identical. Workplace uses the same wire protocol through an authenticated namespace and tenant-prefixed rooms; manager access additionally requires team membership. No signalling target can cross tenant or team boundaries. Server relays signalling, never media. TURN uses existing server-issued, short-lived credentials; permanent TURN secrets never enter the bundle. STUN alone cannot guarantee cross-network connections.

The web page calls getDisplayMedia and optional getUserMedia. MediaRecorder chunks are serialised, bounded, retried and attached to a persisted flag. Workplace pre-roll stays in bounded RAM only while sharing and consenting. Pause/stop/policy change/work-hour expiry stops tracks, peer connections and pre-roll; reconnection cannot override pause. All flags require human review and are visible to the employee.

## Storage and retention

Files and recordings have tenant ownership, size, type, uploader and expiry metadata. Upload reservations lock the tenant's quota row, count all file/recording bytes and reject overflow. S3-compatible Neon storage is available on this project; deployments may instead use bounded durable PostgreSQL bytes for small free-tier workloads. Downloads require membership and a short-lived signature; chat files also require current channel membership. Chunks are ordered and idempotent; first bytes must be WebM. Default clip retention is 30 days, capped by PLATFORM_MAX_RETENTION_DAYS. Cleanup deletes bytes as well as metadata. Unverified/abandoned tenants expire after 14 days; the SQL worker catches up at startup and during activity. Large-scale storage/TURN/always-on execution can exceed free infrastructure allowances although users are never billed by the product.

## Workplace and chat

Teams have managers and employees. Policy includes work hours/timezone, allowlisted active applications, retention and a monotonically increasing version. Org admin must accept the monitoring notice before enabling monitoring. Each employee actively accepts the current policy; no screen permission is granted before that server record exists. Attendance records session start, active intervals, breaks and stop. Tasks have assignee/status/due date/comments. Chat channels and DMs enforce membership on history/search/send/typing/read/pin/upload/download; Socket.IO pushes tenant/channel-scoped events, unread counters and mentions.

## Electron bridge

One tenant origin only; block navigation, popups and untrusted IPC frames. Context isolation and sandbox are enabled, node integration disabled. Preload exposes only active-window notifications and validated sharing/badge state. Main process setDisplayMediaRequestHandler checks the server's current consent, work hours, active session and tenant origin before selecting the full screen. No capture/recording/transmission exists in native code. The web page owns all start/stop/pause/reconnect.

Login-item start reopens the employee page; web reconnects only when the server permits it. Close minimises to tray. The always-on-top badge reflects actual live tracks, cannot be hidden while sharing, remains inside a display's work area and has a visible open/pause action. Webcam stays off by default. A Windows build and update manifest are produced by the release pipeline. Publicly trusted Authenticode signing requires a real organisation certificate (CSC_LINK/CSC_KEY_PASSWORD or a configured signing provider); missing signing credentials must fail release, never publish a falsely labelled signed installer. Reboot/capture QA must run on Windows, not be claimed from Linux mocks.

## Release and rollback

Test legacy flows and malicious cross-tenant HTTP/SQL/socket/file attempts. Staging branch: plinth-staging-20261003, cloned from production; validate schema and row counts before migration. Gate on DPS active exams and starts within three hours. Retain a production snapshot or branch backup before migrations. Stage real Institute and Workplace flows, including browser-produced WebM and Windows bridge, then deploy only when release gates pass. Preserve previous commits/services and snapshot identifiers outside the repository. Roll back build and restore database automatically on a failed production smoke. No secret values are committed or included in public diagnostics.

## Deployment prerequisites observed during audit

The existing Render/Neon connections are available and this project has branchable object storage. No owned wildcard-domain credentials, SMTP delivery credentials or Windows code-signing certificate were found in the execution environment. These are configuration/release dependencies, not features to simulate. The production release must report any unresolved gate accurately.
