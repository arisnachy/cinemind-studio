# CINEMIND Studio

> **The streaming catalog that does not exist until you arrive.**

CINEMIND Studio is an AI-native streaming experience for **Agentic Cinema: The Blockbuster Hackathon**. Instead of only recommending pre-existing content, CINEMIND can create original fictional universes, films, series, characters, episode arcs, key art and optional Veo scenes around a viewer's stated entertainment interests.

The product has two creation modes:

- **Director Mode** — the viewer gives a premise, genre, tone, format or story change.
- **Autonomous Showrunner** — Google ADK + Gemini synthesize a new story around the active taste profile and existing narrative memory.

## What is implemented

### Premium streaming UI

- Full-bleed hero and cinematic navigation
- Horizontal content rails and hover cards
- Continue Watching, My List, Series, Movies and My Universes
- Title detail / cast / episode hub
- Storyboard and screenplay modes
- Search overlay and profile switching
- Director Studio with live backend generation
- Canon Impact Analysis with real Gemini continuity analysis
- Veo scene generation entry point (explicitly opt-in because it consumes media-generation credits)

All seed artwork falls back to **original local CINEMIND SVG art**. The runtime no longer depends on Unsplash images or third-party sample films. Newly generated key art can come from Google's image model on Vertex AI.

### Google Cloud AI runtime

The backend is a Python FastAPI service designed for Cloud Run.

- **Google Agent Development Kit (ADK)** — showrunner + specialist agent network
- **Gemini 3.6 Flash** — creative-room reasoning and structured story generation
- **Gemini 2.5 Flash Image** — original poster/backdrop generation
- **Veo 3.1 Fast** — optional 5-second cinematic scene generation
- **Google Cloud Storage** — private Veo output storage / playback proxy
- **Cloud Run** — web + API in one deployable container

Model IDs are environment-configurable.

### ClickHouse Narrative Memory Engine

CINEMIND uses ClickHouse as persistent story memory rather than a decorative analytics database.

The ADK showrunner connects at runtime to the **official `mcp-clickhouse` server over stdio** using `McpToolset`. The MCP connection is deliberately **read-only**. Deterministic application code performs the narrowly scoped writes required to persist generated titles, canon facts and resolution events.

Core tables:

- `cinemind_events`
- `cinemind_canon_facts`
- `cinemind_taste_signals`

This separation gives the model useful memory access while keeping destructive SQL away from the agent path.

## Architecture

```text
Browser / CINEMIND streaming UI
            |
            v
      FastAPI on Cloud Run
            |
      +-----+------------------------+
      |                              |
      v                              v
Google ADK creative room       Google Gen AI SDK
Showrunner + specialists       structured output / image / Veo
      |
      v
McpToolset (stdio)
      |
      v
official mcp-clickhouse
      |
      v
ClickHouse Cloud

Deterministic FastAPI persistence -----> ClickHouse Cloud
Veo output ----------------------------> Cloud Storage
```

## Local development

### Frontend

```bash
npm install
npm run dev
```

The frontend calls `/api/*`; use Vite's dev server for UI work and run the backend separately when testing real generation.

### Backend

Python 3.11+ is required.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -e .
cp ../.env.example ../.env
uvicorn app.main:app --reload --port 8080
```

For Vertex AI authentication locally, use **Application Default Credentials** rather than committing service-account files:

```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

Then set at minimum:

```text
GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
GOOGLE_CLOUD_LOCATION=global
```

## ClickHouse configuration

Use a dedicated ClickHouse user and store credentials in Cloud Run / Secret Manager, never in Git.

```text
CLICKHOUSE_HOST=...
CLICKHOUSE_PORT=8443
CLICKHOUSE_USER=cinemind_agent
CLICKHOUSE_PASSWORD=...
CLICKHOUSE_DATABASE=default
CLICKHOUSE_SECURE=true
CLICKHOUSE_VERIFY=true
CLICKHOUSE_ALLOW_WRITE_ACCESS=true
CLICKHOUSE_ALLOW_DROP=false
```

The ADK MCP subprocess forces `CLICKHOUSE_ALLOW_WRITE_ACCESS=false` for model-initiated queries even when deterministic application persistence is enabled.

Schema SQL is also provided at `deploy/clickhouse_schema.sql`.

## Deploy to Google Cloud

Enable the foundation services and Artifact Registry:

```bash
export GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
./deploy/bootstrap_gcp.sh
```

Then deploy:

```bash
./deploy/deploy_cloud_run.sh
```

Or use `cloudbuild.yaml`.

The `Dockerfile` uses a multi-stage build: Vite compiles the streaming UI and the final Python image serves both the API and the SPA through Cloud Run.

## Media generation cost control

Image generation is enabled by default once Google Cloud is configured. Veo is deliberately opt-in:

```text
CINEMIND_ENABLE_VIDEO_GENERATION=true
CINEMIND_VIDEO_GCS_URI=gs://YOUR_BUCKET/cinemind/videos
```

This prevents a browsing session from accidentally consuming video-generation credits.

## Health / judging evidence

`GET /api/health` reports whether the runtime has:

- Gemini configuration
- ClickHouse MCP configuration
- ClickHouse cluster connectivity
- image generation enabled
- video generation enabled

For the ClickHouse track, a judging deployment should show `clickhouse_mcp: true` and `clickhouse_cluster: true`.

## Validation performed before this commit

- TypeScript: `tsc --noEmit` — PASS
- Python: `python -m compileall backend/app` — PASS
- Runtime-source scan: no Unsplash / third-party sample-video URLs
- Repository secret scan: no committed Google or ClickHouse credentials

A Linux Vite production build is reproducible inside the Docker build. The uploaded development archive contained Windows-native optional Rollup dependencies, so those local `node_modules` files are intentionally excluded from Git and rebuilt by `npm install` in the Linux container.

## License

Apache License 2.0. See [`LICENSE`](LICENSE).
