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

- **Inbox:** YouTube-Links einfügen (ins Feld oder Strg+V irgendwo). Titel
  und Kanal kommen von YouTube. Aus der Inbox spielt nichts.
- **Channels:** mit Google angemeldet: die neuen Videos der Kanäle, die du
  abonniert hast, neueste zuerst, alle 3 Stunden von selbst. Kein Algorithmus,
  keine Empfehlungen. Von hier „Plan for…“ oder „Remove“ (kommt nicht wieder).
- **Days:** ein Tag mit Datum und Zeitfenster (Vorschlag: nächster Samstag
  14–20 Uhr). „Plan for…“ legt ein Video hinein, höchstens 3 pro Tag
  (einstellbar). Die Videos spielen nur in diesem Zeitfenster. Ist der Tag
  vorbei, gehen nicht gesehene Videos zurück in die Inbox.
- **Music:** spielt jederzeit, nacheinander, in Schleife, auf Wunsch gemischt.
  Mit Google angemeldet: „Import from YouTube…“ holt eine deiner Playlists oder
  deine „Liked videos“ hierher.
- **Player:** ein eigenes Fenster, beliebig groß. „Video only“ zeigt nur das
  Video, „Mini“ einen kleinen Player unten rechts, immer im Vordergrund.
  Leertaste pausiert, die Medientasten der Tastatur gehen auch.
- **Keine Empfehlungen:** Die App kennt nur deine Videos. Pause- und
  Endbildschirm von YouTube werden abgedeckt.

## Mit Google anmelden (einmal einrichten, etwa 15 Minuten)

Die App liest dein Konto nur (Abos und Playlists) und ändert nichts. Dafür
braucht sie einen eigenen, kostenlosen Zugang bei Google:

1. Auf https://console.cloud.google.com oben auf die Projektauswahl, dann
   **Neues Projekt**, Name `Deine Roehre`, **Erstellen**. Das Projekt auswählen.
2. **APIs & Dienste**, **Bibliothek**, nach `YouTube Data API v3` suchen,
   **Aktivieren**.
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

- `app/`: Electron-Hauptprogramm (`main.mjs`), Google-Anmeldung und
  YouTube-Abfragen (`google.mjs`, nur lesen), Seite (`index.html`, `app.mjs`,
  `app.css`), Regeln (`lists.mjs`).
- `app/kit/`: UI base und Archon-Kit, kopiert aus `TimAH93/eisenfaust`
  (`kit/README.md`).
- Tests: `npm test` (Node 22.12 oder neuer).
