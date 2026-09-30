# Teacher enrollment — independent student-built prototype

Only an authenticated administrator can approve teachers or create staff accounts. This is **not** an official school authentication system, and you must not claim staff authorization unless the school explicitly permits it.

## For invited teachers or staff testers
1. Open the portal's **Teacher Login** page and select **Request teacher access**.
2. Enter your name, email, teaching subject and requested classes. Do not share a password here.
3. Your information is an **unverified request**, not an account. The administrator must verify eligibility independently and grant access.
4. The administrator sends you a one-time temporary password privately. Sign in at **Teacher Login** and use **My Account** to change it immediately.

## For the authorized portal administrator
1. Sign in and click **Enroll teachers** on the dashboard, or use the sidebar **Manage teachers**.
2. In **Awaiting verification**, independently check each applicant's identity and their entitlement to teach requested classes. Do not approve unverified requests.
3. Approve or decline requests. Approval creates a role-limited `teacher` account, generates a random temporary password, and displays it **once**. It is not sent by email automatically.
4. For staff already verified, use **Direct enrollment**, assign only appropriate classes, and leave the temporary password blank to generate one.
5. Share credentials over a private channel, require an immediate password change, and deactivate unused accounts. Students and public visitors cannot use administrator endpoints.

If your prototype has **no** administrator yet, the project owner can set the `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` environment variables on the **separate DPS backend** in Render and deploy once. The bootstrap runs only when there are zero staff accounts. Remove these variables after the account is created and confirm the first login. Do not paste administrator credentials into chats, GitHub, or frontend source.

No outbound email provider is configured. The login page intentionally does **not** claim that password-reset emails are sent. Contact the administrator for verified credential recovery.

This is **free-tier staging infrastructure**, not approved for administering real school examinations or holding actual student information without appropriate authorization, review and reliable hosting.
