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
- **Days:** ein Tag mit Datum und Zeitfenster (Vorschlag: nächster Samstag
  14–20 Uhr). „Plan for…“ legt ein Video hinein, höchstens 3 pro Tag
  (einstellbar). Die Videos spielen nur in diesem Zeitfenster. Ist der Tag
  vorbei, gehen nicht gesehene Videos zurück in die Inbox.
- **Music:** spielt jederzeit, nacheinander, in Schleife, auf Wunsch gemischt.
- **Player:** ein eigenes Fenster, beliebig groß. „Video only“ zeigt nur das
  Video, „Mini“ einen kleinen Player unten rechts, immer im Vordergrund.
  Leertaste pausiert, die Medientasten der Tastatur gehen auch.
- **Keine Empfehlungen:** Die App kennt nur deine Videos. Pause- und
  Endbildschirm von YouTube werden abgedeckt.

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
(Platz und Größe des Fensters). Kein Konto, keine Anmeldung.

## Für Entwickler

- `app/`: Electron-Hauptprogramm (`main.mjs`), Seite (`index.html`,
  `app.mjs`, `app.css`), Regeln (`lists.mjs`).
- `app/kit/`: UI base und Archon-Kit, kopiert aus `TimAH93/eisenfaust`
  (`kit/README.md`).
- Tests: `npm test` (Node 22.12 oder neuer).
