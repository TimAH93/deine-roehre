# Handoff: what is not in the code (2026-10-07)

Everything a new session needs that lives only in the first chat (2026-10-06/07, started in `TimAH93/eisenfaust`,
moved here). Read with `CLAUDE.md` and `README.md`. Keep this page current: tick what is done, add what is new.

## Where things stand

- All work is on `claude/erste-version`. **There is no `main` yet.** Tim decides whether this branch becomes
  `main` (rename on GitHub, or Claude pushes it). The web version needs `main` (Pages publishes from it).
- Tim runs the PC app on Windows from `C:\Users\Tim\Documents\deine-roehre` (`start.ps1`).
- **Confirmed by Tim on his PC:** the app starts; playing works; the video fills the window; Escape brings the
  menu back; the player ("really dope"); importing his liked videos into Music worked.
- **Built but not yet confirmed on real hardware:** the one-click Today/Pick layout, the music mini player, "Only
  music" / "Move non-music to Pick", the return button, the clear pause, the desktop shortcut
  (`tools/make-shortcut.ps1`), the Drive sync between devices, own video files, and the iPhone at home.
- **Built 2026-10-07, second chat (not yet confirmed on real hardware):** one field in Pick and in Music that adds a
  pasted link or searches YouTube (search.list, 100 quota units each, about 100 a day; results only shown, not kept);
  a pasted playlist link in Music brings all its songs ("Only music" applies). Tested with Node and Chromium (PC and
  iPhone size) against a stand-in for Google, not against the real YouTube.
- **Not testable in a cloud session:** Electron cannot be downloaded there, and YouTube and Google are blocked.
  Test with Node (`npm test`) and Playwright's Chromium (`/opt/pw-browsers`) against the real page files with a
  stand-in for `window.roehre`; for the iPhone at home, start `app/home.mjs` for real (see `tests/home.test.mjs`).
  Always tell Tim what was and was not tested.

## Google Cloud (Tim's project "Deine Roehre")

- Done by Tim: project created; Google Auth Platform set up (name "Deine Röhre", external); Tim added as test
  user; YouTube Data API v3 and Google Drive API switched on (he said "API activated"); a **Desktop** client
  created. Whether the PC sign-in succeeded is **not yet confirmed**.
- **Publishing status is "Test"**: "App veröffentlichen" was greyed out (Branding needs more, probably home page /
  privacy policy links). In Test mode the sign-in runs out after 7 days; the app says so. Do not upload a logo
  (that starts Google's verification).
- **Still to do for the phone:** a second client of type **Webanwendung** with authorised JavaScript origin
  `https://timah93.github.io`; its client ID (not a secret) goes into `web/config.json` as `{"googleClientId": "…"}`.
  Then GitHub → Settings → Pages → Source "GitHub Actions".
- **Reminder Tim asked for:** if he accepted the Google Cloud free trial, he wants to **close the billing account**
  (console.cloud.google.com/billing → "Abrechnungskonto schließen"). Deine Röhre needs no billing; never delete the
  project.
- Secrets: the client file and token live only in `%APPDATA%\deine-roehre` (never in Git; `.gitignore` guards
  `client_secret*.json`, `google-client.json`). Checked 2026-10-07: no key, token or client file anywhere in the
  history. Tim's e-mail address does not belong in the repository either.

## Tim's decisions (keep them)

- **UI:** the Archon Grid's philosophy (eisenfaust `docs/ARCHON_UI.md`) on the UI base, simplified: emblem home,
  compact Fraktur menu on ember lines, black-glass iron windows, no icons, words not symbols. Four windows: Today
  (opens at start), Pick, Music, Settings. One-click planning (Today / Saturday / Music); days lay themselves out
  and close by themselves; at most 3 videos a day (changeable).
- **Watching:** the video fills the whole window at any size; the menu is hidden; **Escape** pauses and brings the
  menu back (music keeps playing); F11 full screen; the bar shows at the top edge; a return button (‹) in the player.
- **Pause:** the picture stays fully visible (Tim wants to read text in it); only a small Play in the middle; a clear
  layer keeps YouTube's "More videos" from being clicked.
- **Music:** its own mini player (PC: bottom right, always in front): the small video (200 px, YouTube's least)
  beside title, artist, a seek bar, Prev / Pause / Next / Shuffle, "Next: …".
- **Same lists everywhere:** one hidden file in Google Drive (drive.appdata); the copy changed last wins; a device
  joining keeps its own extra videos.
- **Phone:** iPhone and an Android tablet. Music stopping when the iPhone screen is off is accepted.
- **Own videos and the iPhone at home** first through the PC in the home Wi-Fi (built); Google Drive videos for
  away from home were offered as option 2, not chosen yet.
- Tim mixes English and German in chat; the README is German; PowerShell steps always start with their own
  `cd C:\Users\Tim\Documents\deine-roehre` box, one command per box.

- **Playlists in Music** (built 2026-10-07, second chat, same testing as above): `state.playlists`, each song also in
  `music`; an imported or pasted YouTube playlist becomes its own playlist (`from` = its YouTube id, a second import
  fills the same one); Music shows All or one playlist and plays what it shows. Tim asked for it so the liked videos
  are one playlist he can leave out of sight. Tim's earlier flat import: importing "Liked videos" once more fills the
  new playlist with the songs already in Music.
  Then Tim asked for "Add to playlist" under the videos and a "Play playlist" that opens the mini player: the choice
  "Add to playlist…" is under every song and every Pick video (a Pick video goes to Music with it), with "New
  playlist…"; "Play playlist" plays only that playlist (`playing.list`), Next and Shuffle stay inside it.
  Tim's wish: under a song in Music only Play and the playlists, no days (`songButtons`: Play, Add to playlist…,
  Back to Pick, Remove). Tim reported not seeing the new buttons: most likely the old window was still open (a second
  start only brings it to the front) or `git pull` did not run through; asked him to check.
- **Mixes** (YouTube's "Mix – …", list ids starting RD): Tim asked how to play one. Claude advised against (a Mix is
  YouTube's recommendations, and the Data API cannot read it) and offered search plus playlist links instead; Tim took
  those. A pasted Mix link brings only its first song and says why. Tim may still ask for Mixes; it is his call.

## Things Claude declined (do not build them)

- **Ad blocking.** YouTube's terms forbid it in embedded players. Ad-free only with YouTube Premium.
- **Downloading from YouTube**, and **audio without the picture**.
- **Downloading episodes from proxa.me** or similar sites (likely without the rights holders' permission), by hand
  or automatically. Asked twice. Playing files Tim already has is fine (built: own videos).

## Open ideas, in the order Tim showed interest

1. The step-by-step tutorial ("Use and feel"): Step 1 (pull, start, see Today) given again on 2026-10-07, Tim has not
   reported back yet. Continue one step at a
   time, Tim reports what he sees.
2. **Next episode:** after S01E01 is watched, offer S01E02 for the next day (files; `lists.mjs fileTitle` already
   cleans names).
3. **YouTube Premium in the app:** today the player uses youtube-nocookie and the PC app has no YouTube login, so
   Premium does **not** remove ads there. Offered: a "sign in to YouTube" window in the app and the normal
   youtube.com player. Tim has not answered whether he has Premium.
4. ~~Playlists in Music~~ (built 2026-10-07).
5. **Channels list:** the subscribed channels on the left, each can be switched off (one that uploads too much).
6. **Google Drive videos** for the iPhone away from home (option 2 above).
7. **The emblem:** Tim copies `archon-grid.png` from eisenfaust's `docs\brand` into `brand\` (not in Git); later
   maybe Deine Röhre's own emblem (Anna decides art in Tim's projects).
8. **YouTube history into the Archon Grid** (Google Takeout: watch and search history as JSON): that is work in the
   `eisenfaust` repository, not here; Tim said yes in principle.

## Known limits (already in the README)

- Web sign-in lasts an hour at a time (one tap to renew); Test mode: 7 days on the PC.
- Sync is whole-file, last change wins; two devices changing offline at once lose the earlier change.
- The iPhone plays mp4, m4v, mov; webm and mkv mostly only on the PC.
- The iPhone at home works only while the PC is on and Deine Röhre runs; Windows asks once to allow private networks.
