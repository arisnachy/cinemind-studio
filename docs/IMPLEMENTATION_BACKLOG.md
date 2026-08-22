# CINEMIND Studio — Implementation Backlog

Executable implementation must be created with the hackathon-permitted Google development workflow.

## P0 — Premium streaming shell

Build the complete consumer-facing experience defined in `docs/UX_SPEC.md`:
- cinematic Home hero
- streaming navigation
- horizontal content rails
- title cards with rich focus/hover behavior
- Continue Watching
- Created For You
- Series / Movies / My Universes
- title detail experience
- episode list and progress states
- search/profile shell
- responsive desktop/mobile behavior

**Gate:** first viewport must look like a mature premium streaming product rather than a technical dashboard.

## P1 — Original seed universe

Create one fully original fictional universe with enough safe synthetic content to make the catalog believable before any live generation occurs.

**Gate:** no copyrighted franchise, actor likeness, third-party poster art, trademark or copied streaming asset.

## P2 — ClickHouse Narrative Memory

Integrate ClickHouse as the runtime memory for viewer signals, universes, characters, relationships, events, canon versions and generation provenance.

Use the official `mcp-clickhouse` server against a real cluster.

**Gate:** at least one visible user workflow materially depends on live ClickHouse MCP retrieval.

## P3 — Gemini agent network

Implement the bounded creative workflow described in `docs/ARCHITECTURE.md` using permitted Google agent tooling.

**Gate:** generation is multi-step, persistent and inspectable at a high level without exposing raw chain-of-thought.

## P4 — Personalized catalog generation

Support:
- Director Mode
- Autonomous Showrunner Mode

**Gate:** a newly created title persists and appears naturally in the streaming Home experience.

## P5 — Canon Impact Analysis

Implement the flagship story-change workflow:
- retrieve relevant memory
- detect contradictions
- identify affected story elements
- offer preserve / rewrite / alternate timeline
- regenerate only impacted material
- revalidate continuity
- persist a new canon version

**Gate:** result must derive from real stored narrative state and survive refresh.

## P6 — Original media

Prioritize within budget:
1. key art
2. character portraits/concept art
3. storyboard frames
4. teaser/trailer
5. selected generated scenes

**Gate:** all competition-visible assets must be original or properly licensed and produced with permitted Google tooling.

## P7 — Why This Was Created

Expose viewer-friendly reasons for a generated title based only on real entertainment preference/engagement signals.

**Gate:** explanation must be attributable to stored state rather than fabricated post-hoc rationale.

## P8 — Judge evidence mode

Provide subtle technical evidence for:
- ClickHouse MCP retrieval
- current canon version
- workflow completion
- generated artifact provenance
- continuity validation

**Gate:** judge evidence must not degrade the normal streaming UX.

## P9 — Deployment and submission hardening

Prepare hosted web app, reproducible setup, public repository, secret scan, original assets, English support and a <=3 minute real-product demo.

**Final gate:** every claim in Devpost and the video must be demonstrably true in the running product.
