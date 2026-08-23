# CINEMIND Studio

> **The streaming catalog that does not exist until you arrive.**

CINEMIND Studio is an AI-native streaming experience for **Agentic Cinema: The Blockbuster Hackathon**. Instead of recommending only pre-existing titles, CINEMIND creates original fictional universes, series, films, characters, episode arcs and viewer-ready cinematic cuts around the active taste profile.

Creation modes:

- **Director Mode** — the viewer supplies a premise, genre, tone, format, duration or story change.
- **Autonomous Showrunner** — Google ADK + Gemini develop an original production from taste signals and narrative memory.

## Current product

### Premium streaming UI

- Full-bleed hero and cinematic navigation
- Horizontal rails, title detail, cast and episode hub
- Continue Watching, My List, Series, Movies and My Universes
- Storyboard and screenplay modes
- Search and taste-profile switching
- Director Studio with user-selected video duration
- Canon Impact Analysis with Gemini
- Real production progress rather than simulated stage labels
- One-click production: create -> wait for READY -> Play

All seed artwork falls back to original local CINEMIND assets. Runtime production does not depend on third-party sample films.

## Google production pipeline

The backend is a Python FastAPI service designed for Google Cloud.

- **Google ADK** — showrunner + specialist creative room
- **Gemini 3.6 Flash** — story architecture and structured episode planning
- **Gemini 3.1 Flash Image** — marketing art, photoreal Reality Pack and storyboard boundaries
- **Veo 3.1 Fast** — configurable low-latency visual renderer
- **Veo 3.1 Lite** — configurable native-audio renderer where the current Vertex surface exposes sound generation
- **Gemini multimodal quality review** — reviews the completed master for coherence, continuity, realism, opening clarity and language consistency
- **Google Cloud Storage** — references, keyframes, Veo shots and episode masters
- **FFmpeg** — normalizes and composes one continuous MP4
- **Cloud Run** — web + API deployment target

Model IDs and concurrency are environment-configurable.

## Coherence architecture

CINEMIND does **not** ask Veo to invent each shot independently.

```text
Story / episode architecture
          |
          v
Photoreal Reality Pack
(character 1 + character 2 + primary location)
          |
          v
Shot plan with exact start/end visual states
          |
          v
N + 1 shared storyboard boundary frames
          |
          +-------------------------------+
          |          |          |         |
          v          v          v         v
       Veo #1     Veo #2     Veo #3    Veo #N
       in parallel, each start-frame -> end-frame
          |          |          |         |
          +-------------------------------+
                          |
                          v
                   FFmpeg master MP4
                          |
                          v
                 Gemini quality gate
                          |
             bad shots only -> repair
                          |
                          v
                         READY
                          |
                          v
                         PLAY
```

Adjacent shots share the exact same boundary image: the end frame of shot `i` is also the start frame of shot `i+1`. This gives CINEMIND deterministic visual handoffs without serially extending one Veo file.

### Reality Pack

Marketing posters are never used as actor identity references. Before video production CINEMIND generates neutral, live-action production references:

- principal character identity stills
- practical wardrobe / natural skin identity anchors
- primary location production still

The prompts explicitly reject glossy CGI, game rendering, concept art, beauty-filter skin and poster-style posing.

### Narrative opening grammar

Episode 1 must orient a new viewer before the premise disrupts normal life:

1. place / time / protagonist
2. ordinary immediate objective
3. inciting incident
4. consequence / investigation
5. concrete reveal
6. intentional title-break hook

Longer episodes expand into cold open, Act I, Act II, climax and aftermath rather than repeating trailer beats.

### Quality gate

A title is not READY merely because Veo returned files. The finished master is reviewed for:

- narrative coherence
- visual continuity
- live-action realism
- opening clarity
- language consistency

If a small number of shots fail, CINEMIND can re-render only those shots using the same locked boundary frames and then recompose the master. A master that still fails remains FAILED rather than being published to the catalog.

## Faster generation

The old renderer waited for every Veo clip sequentially. The current renderer creates shared keyframes first and then runs multiple independent Veo operations concurrently.

`VEO_MAX_CONCURRENCY` controls the maximum number of simultaneous shot renders. The default is `6`; actual throughput remains subject to Google Cloud quota and model availability.

Other latency reductions:

- marketing poster + backdrop are generated concurrently
- Reality Pack references are generated concurrently
- storyboard boundary frames are generated concurrently
- Veo operation polling is configurable (`VEO_POLL_SECONDS`, default 5)
- production returns a job id immediately; the browser polls real progress instead of keeping one giant HTTP request open

## Long-form design

The Director Studio currently accepts durations up to **30 minutes / 1800 seconds**. Veo itself still produces short clips; CINEMIND creates long-form video by orchestrating many bounded shots and composing them into one master.

A 20-minute master is roughly 150 eight-second shot jobs before retries. Therefore long-form production is a distributed orchestration problem, not a single Veo request.

**Current status:** the local/service production-job API and render engine are architected for long-form work, but 20+ minute production is **not yet declared Cloud production-ready**. Before judging/deployment at that duration, the in-process job manager must be externalized to durable Google Cloud workers (Cloud Run Jobs / Tasks / Workflows or equivalent) so a render survives instance shutdown, restart and scaling. Short validation cuts should pass the quality gate before spending credits on long-form runs.

## Production jobs and real progress

`POST /api/studio/generate` returns a title with `productionJobId` rather than blocking until all media is complete.

The UI polls:

```text
GET /api/production/jobs/{job_id}
```

Real stages include:

```text
planning
reality_pack
storyboard
rendering
composing
quality
repair
ready
```

## ClickHouse Narrative Memory Engine

CINEMIND uses ClickHouse as persistent story memory rather than decorative analytics.

The ADK showrunner connects at runtime to the official `mcp-clickhouse` server over stdio using `McpToolset`. Model-initiated MCP access is deliberately read-only; deterministic application code performs narrowly scoped writes.

Core tables:

- `cinemind_events`
- `cinemind_canon_facts`
- `cinemind_taste_signals`

## Local development

### Frontend

```bash
npm install
npm run dev
```

### Backend

Python 3.11+:

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -e .
uvicorn app.main:app --reload --port 8080
```

Authenticate locally with Application Default Credentials:

```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

Minimum Google settings:

```text
GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
GOOGLE_CLOUD_LOCATION=global
GOOGLE_GENAI_USE_VERTEXAI=TRUE
```

Video production example:

```text
CINEMIND_ENABLE_VIDEO_GENERATION=true
CINEMIND_VIDEO_GCS_URI=gs://YOUR_BUCKET/cinemind/videos
VEO_LOCATION=us-central1
VEO_VISUAL_MODEL=veo-3.1-fast-generate-001
VEO_AUDIO_MODEL=veo-3.1-lite-generate-001
VEO_DURATION_SECONDS=8
VEO_MAX_CONCURRENCY=6
CINEMIND_ENABLE_TTS=false
CINEMIND_ENABLE_QUALITY_GATE=true
```

Veo remains opt-in to prevent normal browsing from accidentally consuming media-generation quota/credits.

## Health / preflight

`GET /api/health` reports, among other fields:

- `gemini`
- `imageModel`
- `videoGeneration`
- `veoVisualModel`
- `veoAudioModel`
- `veoMaxConcurrency`
- `realityPack`
- `sharedStoryboardKeyframes`
- `firstAndLastFrame`
- `parallelShotRendering`
- `qualityGate`
- `episodeComposer`
- `productionJobs`
- `longFormMaxSeconds`
- ClickHouse MCP / cluster state

Do not start paid video generation unless `episodeComposer` is `true` and the expected Veo configuration is visible.

## Validation

GitHub Actions validates every push / pull request with:

- frontend dependency installation
- TypeScript + Vite production build
- backend dependency installation
- Python `compileall`
- FastAPI application import

Runtime media quality still requires a real Vertex/Veo test because CI intentionally has no production Google credentials.

## License

Apache License 2.0. See [`LICENSE`](LICENSE).
