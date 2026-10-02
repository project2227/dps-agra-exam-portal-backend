# DPS Agra Exam Portal design

An independent, student-built computer science exam portal. The assessment is the main product; practice supports preparation. The interface should feel like an organised school lab: paper, chalkboard green, clear instructions, and quiet feedback.

## Route audit

The table records the existing route and its primary action. Route names, redirects, role guards, API contracts, session handling, Socket.IO subscriptions, and proctoring requirements stay intact.

| Route | Purpose / primary action | Audit finding and design response |
| --- | --- | --- |
| `/` | Choose a role / Join an exam | Three scrolling hero chapters obscure the entrance. Put Join an exam and the two role paths above the fold; a small, optional crest introduction plays once. |
| `/about` | Understand the project / Read privacy information | Decorative headings and tiny copy compete with important information. Use readable sections and explicit independent-project attribution. |
| `/student` | Redirect / Open check-in | Preserve the existing redirect to `/student/join`. |
| `/student/login` | Account access / Sign in | Separate branding panel dominates on desktop. Keep the form first, label every input, and show errors beside the relevant control. |
| `/student/set-password` | First login / Set your new password | Keep the password requirement and account guard; make the next step and password rules plain. |
| `/student/forgot-password` | Recover access / Ask for a reset | Explain teacher reset first; retain the school-email option. |
| `/student/reset-password` | Email reset / Set your new password | Preserve token handling and show an actionable invalid-link state. |
| `/student/join` | Check in / Check in to exam | Exam selection and identity fields compete. Put exam selection first, show the opening countdown, then details, passcode, rules and required sharing consent. |
| `/student/exam/:examId` | Assessment / Answer and review | Existing single-question flow is good. Quiet the surface; show progress and save age; make mobile navigation a drawer; preserve pre-start consent and review-before-submit. |
| `/student/dashboard` | Class session / Open the current or next exam | Emphasise live/upcoming exams, then resources and preparation. Keep exam-session access unchanged. |
| `/student/profile` | Account / Manage your profile | Long form gives every section equal weight. Put the exam entry and released results/progress ahead of account maintenance; clearly mark teacher-controlled fields. |
| `/student/practice` | IDE / Choose a language and run code | Keep all editor/runner behavior. Use a consistent top bar; reserve monospace for code and output. |
| `/student/practice/:lang` | Language IDE / Run code | Preserve Python, Java, C++, C, SQL, Web and Blocks variants and editor state. |
| `/learn` | Learning Hub / Choose a course | Inconsistent headline fonts and small card copy. Use the shared card, spacing and type system. |
| `/learn/profile` | On-device practice profile / View or edit practice progress | Distinguish this existing device profile from the official student account; preserve the explicit import choice. |
| `/learn/course/:lang` | Self-study / Continue the lesson | Keep lesson navigation and progress syncing. Make active lesson and breadcrumb visible. |
| `/learn/teacher-course/:id` | Assigned course / Continue the lesson | Same lesson surface; preserve teacher-course loading and progress. |
| `/learn/mock-exam` | Timed practice / Start a mock exam | Calm assessment presentation; preserve practice-only scoring and timing. |
| `/learn/custom-test` | Custom practice / Build a test | Make configuration labels and generated-question states clear. |
| `/learn/games` | Revision / Choose a quiz | Preserve all games and score syncing; separate game mechanics from decorative motion. |
| `/learn/arcade` | Logic practice / Choose a game | Keep Circuit Switch, Memory Matrix and Stack Builder controls. Remove background motion, not game interaction. |
| `/teacher/login` | Staff access / Sign in | Retain email validation, cookie auth and access-request link; use the same form hierarchy as student sign-in. |
| `/teacher/request-access` | Request an authorised account / Send request | Keep the approval workflow; explain that a request does not grant teacher access. |
| `/teacher` | Redirect / Open dashboard | Preserve the dashboard redirect and teacher guard. |
| `/teacher/dashboard` | Overview / Open the exam needing attention | Unrelated statistic colours distract. Unified cards, once-only number entry, live/upcoming exams first. |
| `/teacher/exams/create` | Create assessment / Save or publish exam | Long configuration needs clear section hierarchy, labels and steady controls. Preserve all validation and exam options. |
| `/teacher/exams/manage` | Exam lifecycle / Manage an exam | Make live/upcoming/ended status identifiable by icon and text; retain all actions and confirmation dialogs. |
| `/teacher/exams/:examId/monitor` | Live oversight / Review the student needing attention | Roll sorting hides urgent signals. Default to attention sorting; group flags by severity; show connection state; only new flags and the Live indicator move. Keep cameras, screen sharing, wall view and selection behavior. |
| `/teacher/submissions` | Review work / Open a submission | Readable table and filters, visible empty/loading/error states; preserve marking and result-release controls. |
| `/teacher/grades` | Class analysis / Review or print grades | Use semantic labels and calm charts; preserve draft-grade and teacher-review caveats. |
| `/teacher/classes` | Classes and roster / Manage students | Dense actions need wrapping and horizontal table scrolling on phones. Preserve CSV validation, credential slips, reset, deactivate and roster editing. |
| `/teacher/students/:id` | Student details / Open their submissions | Breadcrumbs and released/unreleased history labels clarify scope. Preserve teacher access controls. |
| `/teacher/handouts` | Class resources / Share a handout | Consistent list cards, file labels, retry and no-items states. |
| `/teacher/exam-dates` | Schedule / Add or edit an exam date | Keep existing time-zone and class filtering; align date controls and list hierarchy. |
| `/teacher/courses` | Teaching material / Create or edit a course | Same cards, inputs and dialogs; preserve lesson authoring and visibility. |
| `/teacher/community` | Teacher discussion / Open or post a discussion | Plain headings and clear composer; retain posting permissions. |
| `/teacher/manage-teachers` | Administration / Approve or manage a teacher | Preserve administrator-only actions and one-time credential handling. |
| `/teacher/test-data` | Administration / Review test-data cleanup | Keep destructive-action confirmations and administrator guard. |
| `/teacher/account` | Staff account / Update account details | Consistent labelled forms and session/password feedback; preserve cookie auth. |
| `*` | Missing page / Return to the portal | Give a useful home/check-in path instead of a decorative error screen. |

## Design system

Six core tokens are RGB triples so existing Tailwind opacity utilities can use them. Legacy colour class names are compatibility aliases to these tokens, not a second palette.

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| `--paper` | `#f4f5ef` | `#101e18` | Page background |
| `--surface` | `#ffffff` | `#172b22` | Cards, dialogs, inputs |
| `--ink` | `#183b30` | `#e7efe9` | Primary text |
| `--muted` | `#53685f` | `#a6b9ae` | Secondary text |
| `--line` | `#cad4cb` | `#3e594a` | Quiet dividers |
| `--green` | `#24563c` | `#afdcbc` | Primary action, selected state, focus |

Semantic success, warning, danger and information colours have separate foreground/background pairs. Every status also has text and an icon. Activity flags are signals for teacher review, not automatic findings of misconduct. Inputs use a stronger control border than decorative dividers. Primary buttons use the inverse paper foreground.

- **Type:** DM Sans for all interface text and headings. JetBrains Mono only for source code, editor content and program output. One Google Fonts stylesheet, `display=swap`; no CSS font imports. Body 15px/1.6; small 12px/1.5; labels 14px; headings 20/24/32px; hero 40–64px. Timers and counts use tabular numerals in the UI family.
- **Spacing:** 4, 8, 12, 16, 24, 32, 48, 64px. Page gutters 16px on phones, 24px on tablets, 40px on lab screens. Content width at most 1200px, reading width 680px.
- **Radius:** 6px small control, 10px standard control, 16px card, 24px featured panel; pill only for compact statuses.
- **Elevation:** flat, a quiet card shadow, and one dialog/menu shadow. No glowing borders or glass blur on content cards.
- **Shared controls:** Button, Input/Field, Card/GlassCard compatibility adapter, Badge/StatusBadge, Modal, Toast, Skeleton, PageTransition and Loader. Focus is a 3px green outline with offset. Controls wrap on phones; tables scroll inside a labelled region.

## Motion

Motion for React uses lazy-loaded animation features. Tokens are **150ms** feedback, **250ms** entry, **400ms** signature, with standard `[.2,0,0,1]` and exit `[.4,0,1,1]` easing. Animate only opacity and transform.

- A single first-visit crest assembly is inline, skippable, and remembered using `dps.portal.intro.seen.v1`. It never blocks Join an exam. The existing guided tour remains available on demand.
- Route entry is a small fade/slide on a persistent wrapper. It must not key/remount exam hooks, editor state, media streams or Socket.IO connections. The exam and live monitor skip route decoration.
- Press feedback, toast entry, list additions and dialogs communicate an action. Dashboard counters enter once, then show live updates immediately. Charts reveal with an opacity/transform wrapper; do not animate stroke geometry or layout.
- Skeleton shimmer is a transformed overlay. The only ambient pulse denotes a real live connection/status. No orbits, drifting grids, breathing crest or cursor-reactive background.
- The exam room uses only save/question feedback and a short, gentle near-end timer warning. Consent, fullscreen, media and integrity overlays remain functional and blocking where they already were.
- `prefers-reduced-motion` disables transforms and loops; opacity may change briefly. A shared preference hook and MotionConfig enforce the same policy in every component.

## Loading, copy and navigation

Static branded HTML appears before JavaScript starts. Network loaders explain a slow first visit: “Waking up the server — this can take up to a minute on first visit.” Preserve retry actions and distinguish an empty list from a failed fetch. Navigation has consistent role labels, breadcrumbs on deep pages and a visible Find a page control with Ctrl/⌘K. Headings and buttons use sentence case and plain verbs.

## Verification and deployment

Baseline: 102 existing tests pass before UI edits. New component checks cover labels/error associations, status meaning, dialog focus/escape, toast feedback, reduced motion, countdown/save-age formatting and attention ordering. Existing HTTP/Socket.IO integration tests continue to verify authentication, joins, autosave, integrity events and submissions. Staging release smoke adds a proctor event and verifies its arrival in the teacher monitor.

Check the route matrix at 360, 768 and 1440px, in both themes and with reduced motion. A build-only visual fixture surface may be used for otherwise protected pages, with synthetic data and no production credentials or access bypass. It is excluded from the production build. Measure the production entry/CSS budget against the baseline, and use a remote Lighthouse measurement if available; do not claim a score without a measurement.

Before staging/production, check the live exam list and exam-date schedule for the next three hours. Do not interrupt an assessment. Stage the same commit, run the complete account → join → answer → save → flag → submit flow, then publish production. Keep the previous commit available for automatic build rollback. No database/schema or authentication migration is part of this UI release.

### Production performance baseline

Measured before the redesign with PageSpeed Insights on 2 October 2026: mobile Lighthouse performance 85, accessibility 95, FCP 3.0 seconds, LCP 3.2 seconds, TBT 0 milliseconds and CLS 0. The release must meet or exceed this performance score. Report: https://pagespeed.web.dev/analysis/https-dpslab-onrender-com/krp16j9r08?form_factor=mobile
