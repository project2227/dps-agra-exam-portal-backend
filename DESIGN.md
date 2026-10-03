# Plinth design system

Plinth is a free, independent platform for institutes and workplaces. The requested fallback name is used because RollCall already operates school software (https://rollcall.com.au/). Plinth does not imply affiliation with other businesses using that common name. DPS Agra remains a branded Institute tenant.

## Marketing tokens

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| canvas | #F4F4F4 | #080808 | Page background |
| surface | #FFFFFF | #151515 | Forms and product windows |
| ink | #000000 | #FFFFFF | Primary text and outlines |
| muted | #555555 | #B8B8B8 | Secondary text; AA on canvas |
| line | #888888 | #666666 | Visible controls and separators |
| signature | #2EC4B6 → #F2E36B | Same | Single gradient; black text |

Instrument Serif is the display family. Manrope is the UI family. JetBrains Mono is reserved for code editors. Fonts load once, with display=swap. Body text starts at 16px; small labels are 13px; headings follow 24/32/48/72/112px with fluid clamping. Headlines are left aligned, sentence case, and whole phrases. No pricing or billing flows.

Space: 4/8/12/16/24/32/48/72/112px. Radius: 4/8/16/24px; outlined ID cards use 16px. Elevation: subtle 2px border depth, 12px product-window shadow, 28px modal shadow. Avoid repeated marketing card grids: use a large asymmetric hero, two distinct path panels, an editorial step list and shared product windows.

## Tenant themes

Institute: Chalk, Library, Ocean, Plum, Clay. Workplace: Mint, Graphite, Indigo, Amber, Rose. Each preset supplies a complete light/dark token set, primary/accent colours and radius. Custom primary/accent colours use measured WCAG luminance and select black or white foreground at a minimum 4.5:1 ratio. Org branding supplies the logo, crop-derived favicon/app icons, organisation name and token set. The DPS Agra preset retains the deployed paper/chalkboard theme; the existing exam room remains calm.

Semantic statuses always include text and an icon: live/connected, upcoming, ended/offline, paused, flagged with low/medium/high severity, submitted/reviewed. Colour is additional information.

## Motion

Marketing uses GSAP + ScrollTrigger and Lenis. One hero entrance completes in under 1.2 seconds. Pin the ID-card minting and site-building scenes on spacious desktops. Two paths enter once from opposing sides. Cross-fade the same rendered monitor between Institute and Workplace. Desktop consent, sharing badge, recording and chat use actual product components in miniature, with SVG geometry; no stock people or generated photos.

Use 150/250/400ms feedback durations and cubic-out / cubic-in-out easing. Animate transform and opacity only. SVG drawing is represented by masking/translating an already-rendered outline, not repeatedly animating layout or filters. A small static tiling SVG noise texture replaces bitmap imagery. Pointer tilt is capped at 5 degrees and enabled only for a fine pointer. No ambient loops. A live/recording indicator may pulse only while live.

Reduced motion disables smooth scrolling, pinning, pointer tilt, parallax and counting. All content is immediately visible; optional opacity feedback remains. Mobile uses sequential sections with safe-area-aware navigation, no pinning. Functional app screens retain the existing Motion components; exams and monitors have no decorative entrances.

## Navigation and guided introduction

Root: overview → choose Institute or Workplace → create site. Six-step wizard: path, organisation/subdomain, logo, theme, admin, email verification. The live preview is the same rendered tenant interface used by the guide. Provisioning displays persisted job stages and retries, never a fabricated completion timer.

The 11-scene guide covers the whole product. Next/Back/Skip, Left/Right arrows and Escape work; focus is trapped and restored. A hand-drawn SVG circle identifies the described control. It runs once, with a versioned seen key, and can be replayed from Help. Tenant introductions filter to the selected path and signed-in role. An exam in progress never opens the guide automatically.

Institute keeps all deployed routes: student sign-in/check-in/profile/dashboard/exam/practice, Learning Hub and every language/course/game, teacher dashboard/exams/monitor/submissions/grades/handouts/classes/rosters/community/account. Add attendance, timetable, announcements, fee status (records only) and staff directory. Workplace uses dashboard, sharing, tasks, attendance, chat, own flags, teams and settings. Platform owner has a separate tenant operations console.

## Interaction and accessibility

360/768/1440px layouts, light/dark and reduced motion. Visible 3px focus, explicit input labels, form-associated errors, predictable tab order, native semantics, labelled video tiles. Loading/empty/error/retry states on every new fetch. The initial HTML contains a branded loader before JavaScript; server startup copy explains free-tier wake-up. Sharing consent lists actual screen, optional webcam, active-window titles and recording retention. Pause and webcam stop remain accessible; a desktop badge cannot be hidden while sharing.

## Source preservation

The existing design audit is retained in docs/DPS_DESIGN.md. Shared exam capture, RTC, autosave and integrity behaviour is the compatibility baseline. Aryan.Code circuit-skull components/assets are removed as explicitly requested; no exam logic is removed. Logos are organisation-supplied artwork, never student photographs.
