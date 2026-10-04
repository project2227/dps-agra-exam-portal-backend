# DPS landing restoration

The public landing page restores the scroll chapters, paper/green presentation,
illustrated exam journey and animated school crest from commit
`2bb10ae21ab9aa5029d68d331d6e25e77492091d`. This was the most recent live
frontend deployment before Friday, 2 October 2026 at 14:38 IST.

The restored presentation lives in `LegacyExamLanding.jsx`,
`LegacyExamCrest.jsx` and `legacy-exam-landing.css`. CSS selectors and
keyframe names are scoped to this landing page. The existing modern landing
component is retained. The route loads the restored presentation lazily so its
styles do not change the exam room, learning tools or account screens.

The current student sign-in and profile links are included. Current account
management, exam APIs, autosave, Socket.IO monitoring, optional local vision
consent and teacher controls are preserved. Reduced-motion preferences disable
decorative animation and the long scroll journey.

No database migration or account rollback is part of this presentation change.
