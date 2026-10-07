# Claude onboarding (Deine Röhre)

Tim's own YouTube tool: lists without recommendations (README.md, German for
Tim; code comments English). Born in `TimAH93/eisenfaust` on 2026-10-06 and
moved here. **Read `docs/HANDOFF.md` first**: the state, Tim's decisions, what was declined, open
ideas. Keep it current.

- Branches `claude/<task>`, commit subjects `[Claude] ...`. Only Tim merges to `main`.
- UI: the Archon Grid's UI philosophy (eisenfaust `docs/ARCHON_UI.md`) on the
  UI base (eisenfaust `docs/UI_BASE.md`). The kit in `app/kit/` is a copy
  (`app/kit/README.md`); change it in eisenfaust first.
- YouTube's rules: the embedded player unchanged; no downloading, no ad
  blocking, no audio without the picture.
- PowerShell steps for Tim: every set starts with its own box
  `cd C:\Users\Tim\Documents\deine-roehre`; one command per box.
- Google (app/google-api.mjs, shared by PC and web): scopes youtube.readonly
  and drive.appdata (one hidden lists.json, the lists shared between devices)
  only. On the PC the client file and token live in %APPDATA%\deine-roehre,
  never in Git; the web client id (not a secret) may go in web/config.json.
- Web version: web/ + tools/build-site.mjs, published by GitHub Pages from main.
  Test the page at phone size (iPhone) before pushing.
- Before pushing: `npm test`.
