# CINEMIND Studio — Gemini Build Brief

## Purpose

This brief is the implementation handoff for the Google-approved development workflow. Executable code should be produced only with Gemini CLI, Gemini Code Assist or Google Antigravity.

## Mission

Build CINEMIND Studio as a polished web application for the Google Cloud Agentic Cinema Hackathon, targeting the ClickHouse track.

The application must look and feel like a mature premium streaming platform, but all branding, copy, art and visual identity must be original to CINEMIND.

The defining product behavior is that the catalog is generated for the viewer instead of being limited to pre-existing titles.

## Phase 1 — Product shell

Deliver a responsive streaming home with:
- fixed/translucent cinematic navigation
- full-bleed hero
- multiple horizontal content rails
- content cards with focus/hover actions
- Continue Watching state
- Created For You state
- Series / Movies / My Universes navigation
- title detail experience
- profile state
- loading/skeleton states

Acceptance criteria:
- no admin-dashboard visual language
- first viewport feels like a finished consumer entertainment product
- desktop experience is presentation-ready
- mobile remains coherent
- no third-party entertainment assets or trademarks

## Phase 2 — Synthetic but original seed universe

Create one fully original demonstration universe that can safely preload the interface before live generation.

Required seed state:
- at least one flagship series
- multiple episodes with original metadata
- original character set
- original locations
- original poster/key-art placeholders that can later be generated with permitted Google image tooling
- watch-progress states
- at least one unresolved story arc

Seed content must be clearly fictional and original.

## Phase 3 — ClickHouse Narrative Memory

Provision the narrative-memory layer and integrate the official `mcp-clickhouse` server.

Model the following conceptual information families:
- viewer entertainment preferences
- viewing/engagement events
- fictional universes
- titles/seasons/episodes/scenes
- characters
- relationships
- locations
- timeline/story events
- canonical facts
- canon versions
- generation provenance
- continuity validation results

Acceptance criteria:
- ClickHouse connection is real
- MCP integration is active at runtime
- user-visible workflow retrieves live state through MCP
- data survives application navigation/reload
- sample queries/results can be demonstrated during judging without exposing credentials

## Phase 4 — Gemini agent network

Implement a bounded multi-agent workflow using permitted Google agent tooling.

Logical capabilities:
- Showrunner
- Taste interpretation
- Universe architecture
- Character architecture
- Writing
- Continuity
- Art direction
- Release/publishing validation

Agents may be consolidated when this reduces complexity, but responsibilities and evidence should remain understandable.

Acceptance criteria:
- user request triggers a multi-step workflow
- agents retrieve relevant narrative memory rather than stuffing the entire universe into a single prompt
- outputs are structured enough to persist reliably
- high-level agent progress is visible to the viewer
- no raw chain-of-thought is exposed

## Phase 5 — Personalized catalog generation

Implement two paths.

### Director Mode
The viewer can request a new series/film or provide constraints such as genre, tone, setting and character direction.

### Autonomous Showrunner Mode
The system can create a new title from the viewer's bounded taste profile with minimal prompting.

Acceptance criteria:
- newly generated title is persisted
- new title appears naturally in a Home rail
- detail page works immediately
- generation provenance is stored
- the interface can explain the main factors behind creation without inventing unsupported reasons

## Phase 6 — Canon Impact Analysis

This is the flagship technical feature.

User requests a change to an established fact or relationship.

System must:
1. identify the proposed canon mutation;
2. retrieve relevant stored narrative memory through ClickHouse MCP;
3. detect contradictions/dependencies;
4. show affected episodes/scenes/facts;
5. offer preserve / rewrite / alternate timeline choices;
6. regenerate only affected material when rewrite is selected;
7. revalidate continuity;
8. persist a new canon version.

Acceptance criteria:
- conflict list is derived from real stored state
- the result is reproducible
- revised state survives refresh
- judges can see why ClickHouse is indispensable

## Phase 7 — Original media generation

Use permitted Google image/video services only when available and within budget.

Priority order:
1. title key art
2. character portraits/concept art
3. selected storyboard frames
4. short teaser/trailer
5. one or two high-value generated scenes

Do not spend budget generating feature-length content.

Acceptance criteria:
- every visual shown in judging materials is original or properly licensed
- assets have durable references/provenance
- UI honestly distinguishes playable generated video from scripts/storyboards/planned episodes

## Phase 8 — Why This Was Created

Create a viewer-facing explanation for a generated title based on real stored preference/engagement signals.

Acceptance criteria:
- explanation factors map to actual state
- no sensitive inference beyond entertainment preferences and product behavior
- language is concise and consumer-friendly

## Phase 9 — Judge mode / observability

Create a subtle judge-verification path without turning the consumer UI into a debugging dashboard.

Possible judge evidence:
- current universe/canon version
- latest ClickHouse MCP retrieval
- agent workflow completion receipts
- generated artifact provenance
- continuity validation status

Keep this visually separate from the main viewer experience.

## Phase 10 — Deployment and evidence

Prepare:
- hosted web project
- reproducible setup instructions
- environment-variable documentation
- no secrets committed
- public repository at submission time
- 3-minute demo script
- clean synthetic demo account/profile
- deterministic demo path where practical

## Three-minute demo target

### 0:00–0:25 — Hook
Open on a mature CINEMIND Home screen.
Message: streaming normally recommends what exists; CINEMIND creates what should exist next.

### 0:25–0:55 — Personal creation
Show Autonomous Showrunner or Director Mode creating a title from a taste request.
New title appears in the catalog.

### 0:55–1:25 — Product depth
Open the generated title. Show characters, episodes, key art and persistent universe state.

### 1:25–2:15 — Flagship proof
Change a canonical relationship/fact.
Show Canon Impact Analysis retrieving memory, identifying contradictions and rewriting affected material.

### 2:15–2:40 — ClickHouse proof
Show a concise judge-visible evidence panel proving the continuity result depended on live ClickHouse MCP state.

### 2:40–3:00 — Close
Return to Home with the evolved universe visible.
Closing message: **“Your streaming service does not recommend the next story. It creates it.”**

## Definition of competition-ready

Do not call the build ready until:
- the first screen looks production-quality;
- one end-to-end generation path works live;
- one ClickHouse-dependent continuity path works live;
- persistence is real;
- all visible art is original;
- all implementation AI/tooling is competition-compliant;
- the demo can be recorded from the real product without simulated success states.
