# CINEMIND Studio

**The streaming catalog that does not exist until you arrive.**

CINEMIND Studio is an AI-native entertainment platform concept for the Google Cloud **Agentic Cinema: The Blockbuster Hackathon**. Instead of recommending only pre-existing content, CINEMIND creates original fictional universes, series, films, characters, posters, episodes and evolving storylines around each viewer's interests.

## Core product idea

A viewer can use CINEMIND in two complementary modes:

- **Director Mode** — the viewer explicitly requests a genre, premise, characters, tone, setting or story change.
- **Autonomous Showrunner Mode** — the system learns declared and observed preferences, proposes new fictional worlds, and evolves existing stories while preserving continuity.

The experience should feel immediately familiar to users of premium streaming services: a cinematic full-screen hero, horizontal content rails, title detail pages, season/episode browsing, continue-watching state, profiles, watchlists and rich hover/preview interactions. CINEMIND must maintain its own visual identity and original assets; it must not copy third-party logos, artwork, trademarks or protected trade dress.

## ClickHouse track

ClickHouse is not a decorative database in CINEMIND. It is the **Narrative Memory Engine**: the runtime memory of universes, characters, relationships, timeline events, canon facts, viewer preferences, engagement signals and generation decisions.

The submitted implementation must actively use the official **ClickHouse MCP server (`mcp-clickhouse`)** against a real ClickHouse Cloud or self-hosted cluster at runtime.

## Google AI-only implementation rule

The hackathon restricts implementation-time and runtime AI usage. The executable project must be built with permitted Google AI tooling such as Gemini CLI, Gemini Code Assist or Google Antigravity and must use Google Cloud AI services at runtime. Third-party AI coding assistants must not contribute implementation code or generated assets to the submission.

This repository's planning documents define product strategy, UX, architecture and compliance requirements. Executable implementation should be generated and developed only through the permitted Google development workflow.

## Target product loop

1. Viewer creates/selects a taste profile.
2. CINEMIND generates a personalized content slate.
3. Viewer opens an original title and explores its world, characters, seasons and episodes.
4. Gemini-powered agents create or continue the story.
5. ClickHouse stores and retrieves narrative and preference memory.
6. A continuity agent checks new material against canon before publishing it.
7. Viewer behavior and explicit feedback influence what CINEMIND creates next.
8. The system can explain why a title or story decision was generated.

## Competition target

The project is intentionally designed around the four equal-weight judging dimensions:

- Technological Implementation
- Design
- Potential Impact
- Quality of the Idea

The goal is a complete, coherent product experience rather than a prompt-to-response demo.

## Repository status

Planning and competition blueprint are being established first. Runtime code should only be added through the hackathon-compliant Google AI development workflow.

## License

Apache License 2.0. See `LICENSE`.
