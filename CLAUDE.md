# Claude onboarding (Deine Röhre)

Tim's own YouTube tool: lists without recommendations (README.md, German for
Tim; code comments English). Born in `TimAH93/eisenfaust` on 2026-10-06 and
moved here.

- Branches `claude/<task>`, commit subjects `[Claude] ...`. Only Tim merges to `main`.
- UI: the Archon Grid's UI philosophy (eisenfaust `docs/ARCHON_UI.md`) on the
  UI base (eisenfaust `docs/UI_BASE.md`). The kit in `app/kit/` is a copy
  (`app/kit/README.md`); change it in eisenfaust first.
- YouTube's rules: the embedded player unchanged; no downloading, no ad
  blocking, no audio without the picture.
- PowerShell steps for Tim: every set starts with its own box
  `cd C:\Users\Tim\Documents\deine-roehre`; one command per box.
- Google sign-in (app/google.mjs): scope youtube.readonly only; the client
  file and token live in %APPDATA%\deine-roehre, never in Git.
- Before pushing: `npm test`.
