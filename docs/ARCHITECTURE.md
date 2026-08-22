# CINEMIND Studio — Architecture Blueprint

## Architectural goal

Create a web-first, production-oriented multi-agent entertainment platform using only hackathon-permitted Google AI services plus ClickHouse as the required partner runtime.

## High-level components

### Experience layer
A responsive web application provides the streaming interface, creation flow, universe browser, title pages, episode state and visible agent progress.

### Application/API layer
A backend service coordinates authenticated user state, generation requests, orchestration, asset references, permissions, persistence and delivery to the web client.

### Agent orchestration layer
Use Google Cloud Agent Builder / Google ADK-compatible agents. Suggested logical roles:

- **Showrunner Agent** — owns the top-level creative objective and decides which specialist needs to act.
- **Taste Agent** — converts explicit entertainment preferences and allowed engagement signals into a bounded creative profile.
- **Universe Architect** — defines world rules, setting, thematic constraints and long-running story structure.
- **Character Architect** — creates and maintains character goals, relationships, knowledge, traits and visual descriptors.
- **Writer Agent** — creates episode/scene plans, scripts and dialogue.
- **Continuity Agent** — queries narrative memory, detects contradictions and validates proposed story changes.
- **Art Director Agent** — prepares safe, original visual-generation briefs for key art, characters, locations and storyboard assets.
- **Release Agent** — determines whether generated material is complete enough to appear in the viewer catalog and creates user-visible release metadata.

These are logical responsibilities. The final implementation may consolidate roles where that improves latency and reliability.

## ClickHouse: Narrative Memory Engine

The ClickHouse runtime is central to the design.

### Information families to persist

#### Viewer signals
- profile identifier
- declared genre/tone preferences
- title impressions
- starts/completions
- skips
- likes/dislikes
- runtime preferences
- explicit creative instructions

#### Universe state
- universe identifier
- canonical premise
- world rules
- active titles
- timeline markers
- unresolved arcs
- canon version

#### Characters
- identity
- role
- stable visual descriptors
- motivations
- relationships
- knowledge state
- injuries/status
- location
- narrative importance

#### Story events
- universe
- title
- season
- episode
- scene
- event type
- involved characters
- chronological position
- canonical fact produced or changed
- source generation/action identifier

#### Generation provenance
- request/event identifier
- agent responsible
- high-level action type
- memory records consulted
- output artifact references
- validation state
- release decision

### Required runtime behavior

The final system must use the official **mcp-clickhouse** server connected to ClickHouse Cloud or a self-hosted cluster. At least one central user-facing workflow must visibly depend on live MCP queries.

Recommended flagship dependencies:
- personalized slate generation
- continuity validation
- canon impact analysis
- explanation of “why this was created”

## Canon model

Treat canon as versioned state rather than a single long prompt.

Each accepted story fact should be attributable to a universe, title/episode/scene context and a canon version. A proposed rewrite can create one of three outcomes:

1. **Preserve canon** — reject or alter the request to remain consistent.
2. **Rewrite canon** — update dependent narrative material and publish a new canon version.
3. **Fork timeline** — preserve the original and create an alternate branch.

The continuity agent should retrieve only relevant memory instead of sending the entire fictional universe into every model call.

## Asset architecture

Store generated media as durable assets with metadata and provenance.

Asset categories:
- title key art
- character portraits/concept art
- location art
- storyboard frames
- trailers
- selected generated scenes
- captions/subtitles

The database stores asset references and metadata rather than embedding large media objects directly in analytical tables.

## Suggested Google Cloud responsibilities

Final service selection should be validated against current hackathon resources and budget, but the architecture is compatible with:
- Gemini on Vertex AI / Google GenAI for reasoning and generation
- Google ADK / Agent Builder for orchestration
- Imagen for original visual assets where permitted/available
- Veo for selected video assets where permitted/available
- Cloud Run for web/API/agent services
- Cloud Storage for generated media
- Secret Manager for credentials
- Cloud Logging / Trace for operational evidence

## End-to-end workflow: personalized title generation

1. User opens Home or requests a new title.
2. Taste Agent retrieves the bounded viewer preference state.
3. Showrunner decides whether to evolve an existing universe or create a new one.
4. Relevant narrative state is queried through ClickHouse MCP.
5. Universe/Character/Writer responsibilities produce a structured creative package.
6. Continuity Agent checks internal consistency.
7. Art Director prepares original visual assets.
8. Release Agent validates minimum completeness.
9. Metadata and provenance are persisted.
10. The web app receives the new title and inserts it into the streaming catalog.

## End-to-end workflow: canon change

1. User requests a story change.
2. Request is normalized into a candidate canon mutation.
3. Continuity Agent queries affected facts/events through ClickHouse MCP.
4. System identifies conflicts and dependent material.
5. User receives a Canon Impact Analysis.
6. User chooses preserve, rewrite or fork.
7. Required agents regenerate only impacted material.
8. Continuity Agent revalidates.
9. New canon version and artifact references are recorded.
10. Updated episode/title state is released to the UI.

## Reliability principles

- Do not rely on conversational memory as source of truth.
- Persist state before claiming completion.
- Make agent actions idempotent where practical.
- Preserve generation provenance.
- Separate planning from publishing.
- Fail visibly when required memory or media generation is unavailable.
- Avoid invented success states.
- Keep expensive video generation outside routine navigation paths.

## Cost discipline

Use text reasoning and analytical queries for most of the system. Generate expensive image/video assets only when they materially affect the viewer experience or judging demo.

For the hackathon, prioritize one highly polished universe with enough pre-generated original content to demonstrate the platform, plus one live generation/continuity workflow.

## Judge-visible evidence

The final build should make the architecture verifiable without asking judges to trust documentation alone:
- a live ClickHouse-dependent result
- visible high-level agent activity
- durable universe state across refreshes
- a continuity conflict detected from stored canon
- original generated media assets
- source repository showing actual Google and ClickHouse runtime integrations
