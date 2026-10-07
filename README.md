# Deine Röhre

Deine eigene YouTube-Liste ohne Empfehlungen: Videos sammeln, für bestimmte
Tage einplanen, nur in diesem Zeitfenster ansehen. Mit Musikmodus und
Mini-Player, im Look des Archon Grid.

## Starten (Windows)

Einmal holen (in PowerShell):

```powershell
cd C:\Users\Tim\Documents
```

```powershell
git clone https://github.com/TimAH93/deine-roehre
```

Danach jedes Mal:

```powershell
cd C:\Users\Tim\Documents\deine-roehre
```

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

Beim ersten Start lädt es Electron (etwa 100 MB, nur einmal).

**Symbol auf dem Desktop** (einmal):

```powershell
cd C:\Users\Tim\Documents\deine-roehre
```

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\make-shortcut.ps1
```

Danach liegt „Deine Röhre“ auf dem Desktop und im Startmenü; ein Doppelklick
startet die App ohne PowerShell-Fenster. Für die Taskleiste: Rechtsklick auf
das Symbol, „Weitere Optionen anzeigen“, „An Taskleiste anheften“.

## Was es kann

Vier Fenster im Menü:

- **Today** (öffnet sich beim Start): deine Videos für heute, ein großer
  Knopf **Watch**. Darunter die kommenden Tage (Samstag und andere).
- **Pick:** alles, was infrage kommt, als Kacheln: deine eingefügten Links
  (**Mine**) und, mit Google angemeldet, die neuen Videos deiner Abos
  (**Channels**, neueste zuerst, alle 3 Stunden von selbst). Links einfügen
  ins Feld oder mit Strg+V irgendwo. Andere Wörter im Feld **suchen auf
  YouTube** (mit Google angemeldet): die Treffer stehen oben, nur angezeigt,
  bis du einen einplanst. Keine Empfehlungen, nur was du gesucht hast; etwa
  100 Suchen am Tag (YouTubes Grenze). Unter jeder Kachel ein Klick:
  **Today**, **Saturday** oder **Music**. Ein Klick aufs Bild zeigt es groß,
  ohne abzuspielen. Aus Pick spielt nichts.
- **Music:** spielt jederzeit, nacheinander, in Schleife, auf Wunsch gemischt.
  Am PC startet „Play all“ den **Musik-Mini-Player** unten rechts, immer im
  Vordergrund: links das kleine Video (YouTube verlangt, dass es sichtbar
  bleibt), rechts Titel, Interpret, ein Balken zum Spulen, Prev / Pause /
  Next / Shuffle und was als Nächstes kommt. Escape oder „Bigger“ macht ihn
  groß, die Musik läuft weiter; ebenso der kleine Zurück-Knopf ‹ oben. Am
  Handy steht das Musikfeld unter dem Video.
  Oben ein Feld: ein **Playlist-Link** (auch eine fremde Playlist) holt alle
  Lieder der Liste, ein Lied-Link das Lied, andere Wörter **suchen Lieder**
  („Add to Music“ unter dem Treffer). Ein **Mix** von YouTube („Mix – …“)
  geht nicht: den stellt YouTube selbst zusammen, und Apps können ihn nicht
  lesen; dann kommt nur sein erstes Lied.
  Mit Google angemeldet holt „Import from YouTube…“ eine deiner Playlists oder
  deine „Liked videos“ hierher.
  **Playlists in Music:** Jede geholte YouTube-Playlist (auch „Liked videos“
  und eingefügte Links) wird eine eigene Playlist mit ihrem Namen; holst du
  sie noch einmal, kommen neue Lieder in dieselbe. „New playlist“ macht eine
  eigene (z. B. „Work“, „Sport“). Unter einem Lied in Music stehen nur
  **Play**, **„Add to playlist…“**, Back to Pick und Remove (keine Tage: Musik
  plant man nicht). „Add to playlist…“ steht auch unter Videos in Pick. Darin: hinein, heraus, oder „New playlist…“
  (das Lied kommt gleich mit hinein; aus Pick geht es dabei nach Music). Oben
  wählst du, was du siehst: **All** oder eine Playlist. **„Play playlist“**
  spielt nur deren Lieder, am PC im Musik-Mini-Player; Next und Shuffle
  bleiben in der Playlist. „Delete playlist“ löscht nur die Liste (die Lieder
  bleiben in All), „Delete with its songs“ nimmt auch ihre Lieder aus Music,
  außer denen, die noch in einer anderen Playlist sind. „Only music“ (an) nimmt nur, was YouTube als
  Musik einordnet (beim Import, bei Playlist-Links und bei der Suche); „Move non-music to Pick“ räumt Music nachträglich auf
  (nichts wird gelöscht).
- **Settings:** wann Today und Samstag spielen (leer = ganzer Tag), wie viele
  Videos pro Tag (3), Google-Konto.

Tage legen sich selbst an, wenn du das erste Video dafür wählst. Ist ein Tag
vorbei, gehen nicht gesehene Videos von selbst zurück nach Pick. Einen anderen
Tag als heute oder Samstag legst du unten in Today an („Plan another day…“).

**Beim Schauen** füllt das Video das ganze Fenster, egal wie groß du es
ziehst; das Menü ist weg. **F11** (oder F): ganzer Bildschirm. **Escape**:
Pause, raus aus dem Vollbild, Menü und Fenster wieder da. Die Leiste (Pause,
Next, Mini) erscheint, wenn die Maus den oberen Rand berührt. Leertaste
pausiert, Pfeiltasten springen 5 Sekunden, die Medientasten gehen auch.
„Mini“ (am PC): ein kleiner Player unten rechts, immer im Vordergrund.
Pause- und Endbildschirm von YouTube werden abgedeckt, also keine Empfehlungen.

## Eigene Videos (am PC)

Videodateien in deinem Ordner `Videos\Deine Röhre` (und seinen Unterordnern)
erscheinen von selbst in **Pick** unter **Files**: beim Start, alle 5 Minuten
und mit „Look in the folder“. Du planst sie wie YouTube-Videos (Today,
Saturday); sie spielen direkt im Player, ohne YouTube. Den Ordner öffnest oder
wechselst du in **Settings, Your videos**. Eine Datei, die du in der App
entfernst, kommt nicht wieder; eine, die du aus dem Ordner löschst,
verschwindet aus den Listen.

Was spielt: mp4, m4v und mov überall; webm und mkv meistens am PC, aber nicht
auf dem iPhone.

## iPhone zu Hause (über den PC, im WLAN)

1. Am PC: **Settings, iPhone at home** auf **On**. Windows fragt einmal, ob
   „Electron“ (das ist Deine Röhre) ins Netzwerk darf: für **private
   Netzwerke** erlauben.
2. Settings zeigt einen **QR-Code**. Auf dem iPhone (im selben WLAN) die
   Kamera darauf halten und auf den Link tippen: Deine Röhre öffnet sich in
   Safari, schon verbunden. Dann **Teilen, Zum Home-Bildschirm**.
3. Ohne Kamera: die Adresse darunter (wie `http://192.168.1.23:47832`) in
   Safari öffnen und den 6-stelligen Code einmal eingeben.

Das iPhone zeigt dann die Listen des PCs, mit deinen eigenen Videos, und jede
Änderung geht in ein paar Sekunden hin und her.

**Fernbedienung:** Auf dem iPhone steht in **Music** oben „Plays on: **PC** |
This iPhone“. Bei **PC** spielt die Musik am PC (über deine Anlage), und das
iPhone ist die Fernbedienung: was gerade läuft, **Prev / Pause / Next /
Shuffle**, „Add to playlist…“ für das laufende Lied und was als Nächstes kommt.
„Play“, „Play all“ und „Play playlist“ starten es am PC (dort im
Musik-Mini-Player). Die Fernbedienung bleibt oben stehen, während du durch die
Lieder scrollst. Bei **This iPhone** spielt das iPhone selbst, wie vorher. Es geht nur, solange der PC an
ist und Deine Röhre läuft. Ohne den Code kommt niemand in deinem WLAN an deine
Listen oder Videos; **New code** in Settings meldet alle Handys ab.

## Mit Google anmelden (einmal einrichten, etwa 15 Minuten)

Die App liest dein YouTube-Konto nur (Abos und Playlists, dazu deine Suchen) und ändert dort nichts.
Deine Listen legt sie in eine einzige versteckte Datei in deinem Google Drive,
die nur Deine Röhre sieht: So haben PC, iPhone und Tablet dieselben Listen.
Dafür braucht sie einen eigenen, kostenlosen Zugang bei Google:

1. Auf https://console.cloud.google.com oben auf die Projektauswahl, dann
   **Neues Projekt**, Name `Deine Roehre`, **Erstellen**. Das Projekt auswählen.
2. **APIs & Dienste**, **Bibliothek**, nach `YouTube Data API v3` suchen,
   **Aktivieren**. Genauso `Google Drive API` aktivieren (für die gemeinsamen
   Listen auf PC und Handy).
3. **Google Auth Platform** (früher „OAuth-Zustimmungsbildschirm“),
   **Jetzt starten**: App-Name `Deine Röhre`, deine E-Mail, Zielgruppe
   **Extern**, Kontakt-E-Mail, zustimmen, **Erstellen**.
4. **Zielgruppe**: unter Testnutzer deine Gmail-Adresse hinzufügen, dann
   **App veröffentlichen** („In Produktion“). Sonst läuft die Anmeldung nach
   7 Tagen ab. Eine Prüfung durch Google ist für eine eigene App nicht nötig.
5. **Clients**, **Client erstellen**, Anwendungstyp **Desktop-App**,
   **Erstellen**, dann **JSON herunterladen**.
6. In Deine Röhre: **Settings**, **Choose client file**, die heruntergeladene
   Datei wählen, dann **Sign in with Google**. Dein Browser öffnet Googles
   Seite. Google zeigt „Google hat diese App nicht überprüft“: das ist bei
   einer eigenen App normal, **Erweitert**, **Weiter zu Deine Röhre**.

Die Client-Datei gehört nicht in Git und nicht in fremde Hände (sie ist dein
Zugang). Die App kopiert sie nach `%APPDATA%\deine-roehre\google-client.json`;
die Anmeldung liegt verschlüsselt (nur dein Windows-Konto kann sie lesen) in
`google-token.bin` daneben. **Sign out** löscht sie und meldet die App bei
Google ab. YouTube erlaubt der App etwa 10.000 Abfragen am Tag; ein Blick auf
100 Kanäle braucht etwa 100.

## Auf dem Handy (iPhone, Android-Tablet)

Dieselbe App als Webseite: https://timah93.github.io/deine-roehre/ (sobald sie
veröffentlicht ist, siehe unten). Dieselben Listen wie am PC, wenn du dich mit
demselben Google-Konto anmeldest. Nicht auf dem Handy: Mini-Player, „Fenster im
Vordergrund“, Medientasten.

**Einmal einrichten:**

1. Tim übernimmt den Stand in `main` (oder sagt Claude Bescheid).
2. Auf GitHub im Repository: **Settings**, **Pages**, unter „Build and
   deployment“ bei **Source** „GitHub Actions“ wählen. Danach veröffentlicht
   jede Änderung in `main` die Seite von selbst (Reiter **Actions**,
   „Web version“).
3. In Google Cloud: **Clients**, **Client erstellen**, Anwendungstyp
   **Webanwendung**, bei **Autorisierte JavaScript-Quellen**
   `https://timah93.github.io` eintragen, **Erstellen**. Die **Client-ID**
   (endet auf `.apps.googleusercontent.com`) Claude schicken: sie kommt in
   `web/config.json` (sie ist kein Geheimnis). Bis dahin kannst du sie in der
   App unter Settings, **Enter client ID** eintragen.
4. Auf dem **iPhone**: die Adresse in Safari öffnen, **Teilen**, **Zum
   Home-Bildschirm**. Auf dem **Android-Tablet**: in Chrome öffnen, Menü (⋮),
   **App installieren** (oder „Zum Startbildschirm hinzufügen“).
5. In der App: **Settings**, **Sign in with Google**.

**Was anders ist als am PC:**
- Google meldet eine Webseite jeweils für eine Stunde an; danach fragt die
  App eventuell noch einmal nach (ein Tipp auf „Sign in with Google“).
- Auf dem iPhone stoppt Musik, wenn der Bildschirm ausgeht (das macht iOS mit
  jeder Webseite). Auf dem Android-Tablet läuft sie oft weiter.
- Werbung: Die App blockiert keine Werbung (YouTubes Regeln). Werbefrei geht
  es mit YouTube Premium, wenn du im selben Browser bei YouTube angemeldet bist.

**Gemeinsame Listen:** Jede Änderung geht nach etwa 2 Sekunden in die Datei in
deinem Drive; jedes Gerät schaut beim Öffnen und alle 2 Minuten nach. Es gilt
die zuletzt geänderte Fassung. Änderst du auf zwei Geräten gleichzeitig ohne
Internet, gewinnt die spätere Änderung, die frühere geht verloren. Meldet sich
ein Gerät zum ersten Mal an, übernimmt es die gemeinsamen Listen und legt nur
seine eigenen zusätzlichen Videos nach Pick.

## Look

Die UI-Philosophie des Archon Grid: das Emblem oben links ist „Home“, das Menü
sind kleine Fenster mit Fraktur-Titel an je einer Glutlinie, ein Klick lässt
den Eintrag zum Fenster wachsen (schwarzes Glas, Eisen- und Glutrahmen),
Fenster lassen sich verschieben und in der Größe ändern und merken sich ihren
Platz. Innen schlichte Systemschrift, keine Symbole.

Das Emblem liegt nicht in Git: lege `archon-grid.png` in den Ordner `brand`
(siehe `brand/README.md`). Ohne Emblem steht „Deine Röhre“ in Fraktur da.

## Regeln von YouTube, die es einhält

Videos laufen im eingebetteten YouTube-Player (youtube-nocookie.com),
unverändert: kein Download, kein Werbeblocker, kein Ton ohne Bild (deshalb
zeigt der Musikmodus ein kleines Video). Manche Videos erlauben keine anderen
Player; dann bietet die App „Open on YouTube“ an.

## Gespeichert

`%APPDATA%\deine-roehre\lists.json` (deine Listen) und `window.json`
(Platz und Größe des Fensters); mit Google zusätzlich `google-client.json` und
`google-token.bin` (siehe oben). Sonst kein Konto, keine Anmeldung.

## Für Entwickler

- `app/`: Electron-Hauptprogramm (`main.mjs`), Google-Anmeldung am PC
  (`google.mjs`), die Abfragen an YouTube und Drive (`google-api.mjs`, von PC
  und Web geteilt), Seite (`index.html`, `app.mjs`, `app.css`), Regeln
  (`lists.mjs`).
- `app/home.mjs`: der Videoordner und der Heimserver fürs iPhone (Code,
  Schlüssel, Videos mit Spulen); `app/lan-api.mjs` ist die Brücke der Seite
  dort.
- `web/`: was nur die Webseite braucht (`web-api.mjs` statt Electron,
  Manifest, Symbole, `sw.js`). `npm run site` baut `site/`; GitHub Pages
  veröffentlicht es (`.github/workflows/pages.yml`).
- `app/kit/`: UI base und Archon-Kit, kopiert aus `TimAH93/eisenfaust`
  (`kit/README.md`).
- Tests: `npm test` (Node 22.12 oder neuer).
