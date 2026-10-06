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

## Was es kann

Vier Fenster im Menü:

- **Today** (öffnet sich beim Start): deine Videos für heute, ein großer
  Knopf **Watch**. Darunter die kommenden Tage (Samstag und andere).
- **Pick:** alles, was infrage kommt, als Kacheln: deine eingefügten Links
  (**Mine**) und, mit Google angemeldet, die neuen Videos deiner Abos
  (**Channels**, neueste zuerst, alle 3 Stunden von selbst). Links einfügen
  ins Feld oder mit Strg+V irgendwo. Unter jeder Kachel ein Klick:
  **Today**, **Saturday** oder **Music**. Ein Klick aufs Bild zeigt es groß,
  ohne abzuspielen. Aus Pick spielt nichts.
- **Music:** spielt jederzeit, nacheinander, in Schleife, auf Wunsch gemischt.
  Mit Google angemeldet holt „Import from YouTube…“ eine deiner Playlists oder
  deine „Liked videos“ hierher.
- **Settings:** wann Today und Samstag spielen (leer = ganzer Tag), wie viele
  Videos pro Tag (3), Google-Konto.

Tage legen sich selbst an, wenn du das erste Video dafür wählst. Ist ein Tag
vorbei, gehen nicht gesehene Videos von selbst zurück nach Pick. Einen anderen
Tag als heute oder Samstag legst du unten in Today an („Plan another day…“).

Der **Player** ist ein eigenes Fenster, beliebig groß. „Video only“ zeigt nur
das Video, „Mini“ einen kleinen Player unten rechts, immer im Vordergrund (am
PC). Leertaste pausiert, die Medientasten der Tastatur gehen auch. Pause- und
Endbildschirm von YouTube werden abgedeckt, also keine Empfehlungen.

## Mit Google anmelden (einmal einrichten, etwa 15 Minuten)

Die App liest dein YouTube-Konto nur (Abos und Playlists) und ändert dort nichts.
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
seine eigenen zusätzlichen Videos in die Inbox.

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
- `web/`: was nur die Webseite braucht (`web-api.mjs` statt Electron,
  Manifest, Symbole, `sw.js`). `npm run site` baut `site/`; GitHub Pages
  veröffentlicht es (`.github/workflows/pages.yml`).
- `app/kit/`: UI base und Archon-Kit, kopiert aus `TimAH93/eisenfaust`
  (`kit/README.md`).
- Tests: `npm test` (Node 22.12 oder neuer).
