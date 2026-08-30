# KA-B235 Data Terminal

Material-Finder (P30 ↔ P1S ASPIRE) und Equipment-/Funktionsort-Suche für
Gebäude KA-B235, als statische Web-App. Läuft komplett im Browser, keine
Server-Logik nötig.

## Dateien

```
index.html          Seite (schlank, referenziert nur CSS/JS)
style.css            Design
app.js                Suchlogik
data/materials.json   45'633 Materialzuordnungen (P30 ↔ P1S ASPIRE)
data/equipment.json   9'776 Equipment-Einträge, gefiltert auf KA-B235
```

## Deployment auf GitHub Pages (5 Minuten, keine Kommandozeile nötig)

1. Gehe auf [github.com/new](https://github.com/new) und erstelle ein neues
   Repository, z. B. `ka-b235-terminal`. Öffentlich oder privat spielt keine
   Rolle — nur bei **privat** brauchst du GitHub Pro/Team, damit Pages
   funktioniert; sonst wähle **Public**.
2. Auf der leeren Repo-Seite auf **„uploading an existing file"** klicken.
3. Alle Dateien aus diesem Ordner (`index.html`, `style.css`, `app.js`,
   `README.md` und den ganzen `data/`-Ordner mitsamt Inhalt) per Drag & Drop
   reinziehen. Wichtig: die Ordnerstruktur muss erhalten bleiben — `data/`
   muss als Unterordner mit `materials.json` und `equipment.json` drin
   landen.
4. Unten „Commit changes" klicken.
5. Im Repo zu **Settings → Pages** gehen.
6. Bei „Build and deployment" → **Source: Deploy from a branch** wählen,
   Branch **main**, Ordner **/ (root)**, dann **Save**.
7. Nach ca. 1 Minute erscheint oben ein grüner Kasten mit dem Link, z. B.
   `https://<dein-username>.github.io/ka-b235-terminal/`. Das ist deine App.

Jedes Mal, wenn du eine Datei im Repo aktualisierst (z. B. eine neue
`materials.json`), baut GitHub Pages automatisch neu — kein erneutes
Einrichten nötig.

## Warum das jetzt zuverlässig läuft

Die Vorgänger-Version hat alle Daten direkt in eine einzige HTML-Datei
eingebettet (~2–6 MB Text), die der Browser komplett parsen musste, bevor
irgendetwas sichtbar wurde — auf manchen mobilen Browsern blieb das hängen.

Diese Version lädt `data/materials.json` und `data/equipment.json` per
`fetch()` **nach** dem ersten Bildaufbau, mit nativer, hoch-optimierter
JSON-Verarbeitung des Browsers. GitHub Pages liefert JSON-Dateien zudem
automatisch gzip-komprimiert aus, ganz ohne Zusatzcode.

## Lokal testen (optional)

Direktes Öffnen von `index.html` per Doppelklick funktioniert **nicht**
zuverlässig, weil `fetch()` bei `file://`-URLs in vielen Browsern blockiert
wird. Für einen lokalen Test einen kleinen Webserver starten, z. B. mit
Python:

```bash
cd ka-b235-app
python3 -m http.server 8000
```

Dann im Browser `http://localhost:8000` öffnen.

## Daten aktualisieren

`data/materials.json` und `data/equipment.json` sind einfache Arrays aus
Arrays (kompakt, ohne Feldnamen), um die Dateigrösse klein zu halten:

```json
// materials.json — pro Zeile:
[P30-Nr, P1S-Nr, P30-Kurztext, DE-Kurztext, EN-Kurztext, Status("g"|"b"|"")]

// equipment.json — pro Zeile:
[Equipment-Nr, Bezeichnung, Funktionsort-Suffix (ohne "KA-B235-"), Legacy-Nr, Quelle]
```
