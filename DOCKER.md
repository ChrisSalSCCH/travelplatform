# SCCH Travel Portal — Docker Setup

## Voraussetzungen

- Docker ≥ 24
- Docker Compose v2 (`docker compose` — ohne Bindestrich)

---

## Quick Start

```bash
# 1. Konfigurationsdatei anlegen (optional, aber empfohlen)
cp backend/config/.env.example backend/config/.env
# → .env mit echten Werten fülllen (AD, VLM, Google Maps, ...)

# 2. Images bauen
docker compose build

# 3. Starten
docker compose up -d
```

Die App ist danach unter **http://localhost** erreichbar.

Backend-API direkt: **http://localhost/api/health**

---

## Demo-Zugangsdaten

| Rolle     | E-Mail               | Passwort       |
|-----------|----------------------|----------------|
| Admin     | admin@scch.at        | scch-admin     |
| Approver  | approver@scch.at     | scch-approver  |
| Employee  | (Demo-Modus)         | —              |

---

## Umgebungsvariablen

Alle Variablen werden in `backend/config/.env` gesetzt.  
Eine vollständig kommentierte Vorlage liegt unter `backend/config/.env.example`.

| Variable | Beschreibung | Default |
|---|---|---|
| `DATABASE_URL` | SQLite-Pfad oder PostgreSQL-URL | `sqlite:////app/data/travel_expenses.db` |
| `AD_ENABLED` | Active Directory Login aktivieren | `false` |
| `AD_SERVER` | LDAP-Server-URL | — |
| `AD_DOMAIN` | AD-Domäne | — |
| `AD_BASE_DN` | Base Distinguished Name | — |
| `AD_BIND_USER` | Service-Account für LDAP-Bind | — |
| `AD_BIND_PASSWORD` | Passwort des Service-Accounts | — |
| `GOOGLE_MAPS_API_KEY` | Google Maps API Key (Backend) | — |
| `VLM_ENABLED` | Automatische Belegbetrags-Erkennung | `false` |
| `VLM_BASE_URL` | URL des VLM-Dienstes | — |
| `VLM_API_KEY` | Bearer-Token für VLM | — |
| `VLM_MODEL` | Modellname | `default` |
| `PROJECTS_FILE` | Pfad zur Projektdatei | `/app/config/projects.yaml` |

### Frontend-Build-Argumente (in `docker-compose.yml` unter `args`)

| Variable | Beschreibung |
|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps für Adress-Autocomplete im Browser |
| `VITE_AD_ENABLED` | AD-Login im Frontend anzeigen |
| `VITE_VLM_ENABLED` | Auto-Detect-Button für Belegbeträge anzeigen |

Diese Werte werden **beim Build** in das JS-Bundle eingebettet.  
Um sie zu ändern muss `docker compose build frontend` erneut aufgerufen werden.

---

## Volumes / Persistenz

| Host-Pfad | Container-Pfad | Inhalt |
|---|---|---|
| `./data/` | `/app/data/` | SQLite-Datenbankdatei |
| `./uploads/` | `/app/uploads/` | Hochgeladene Belege / Fotos |
| `./backend/config/` | `/app/config/` | `projects.yaml`, `.env` |

> **Wichtig:** Die Verzeichnisse `data/` und `uploads/` werden automatisch angelegt.

---

## Projekte & Arbeitspakete konfigurieren

Bearbeite `backend/config/projects.yaml` und starte den Backend-Container neu:

```bash
docker compose restart backend
```

Die Projekte werden beim Start automatisch in die Datenbank eingelesen (Upsert).

---

## Port ändern

Standardmäßig läuft die App auf Port 80. Um einen anderen Port zu verwenden:

```bash
APP_PORT=8090 docker compose up -d
```

oder in einer `.env`-Datei im Projekt-Root:

```
APP_PORT=8090
```

---

## Logs

```bash
docker compose logs -f            # alle Services
docker compose logs -f backend    # nur Backend
docker compose logs -f frontend   # nur nginx
```

## Stoppen

```bash
docker compose down              # Container stoppen
docker compose down -v           # inkl. anonyme Volumes
```
