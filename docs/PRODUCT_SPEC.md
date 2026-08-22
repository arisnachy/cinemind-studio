# CINEMIND Studio — Product Specification

## Product thesis

Traditional streaming systems recommend from a fixed catalog. CINEMIND creates the catalog itself.

The product should feel like a premium streaming service while behaving like an autonomous creative studio. Every title is an original fictional work generated for the viewer or for a shared audience profile.

## Primary user promise

**“Tell CINEMIND what you love, and it creates what should exist next.”**

## Primary personas

### 1. Viewer
Wants personalized entertainment without becoming a filmmaker. The viewer should be able to browse, play, react and continue watching with minimal prompting.

### 2. Active Director
Wants creative control. Can define genre, premise, tone, visual direction, character constraints, setting, episode length and specific story changes.

### 3. World Builder
Wants to create a persistent fictional universe that can produce multiple seasons, films, spin-offs and characters while keeping canon coherent.

## Core experiences

### Personalized home
The home screen should contain generated rows such as:
- Created For You
- Continue Watching
- New From Your Universes
- Because You Like Medical Thrillers
- Short Episodes Tonight
- Movies From Worlds You Follow
- Trending In Your Household

### Create a universe
The user can start from either a detailed prompt or a lightweight taste request. CINEMIND should create:
- title
- premise
- genre and tonal profile
- visual identity
- key characters
- world rules
- story bible
- first season arc or film structure
- poster/key art
- initial episode slate

### Title detail experience
Each generated title should expose:
- hero art
- synopsis
- match/relevance rationale
- genres and tone
- cast of generated characters
- seasons and episodes
- trailers/previews when available
- world/canon view
- “Why this was created” explanation
- “Direct this story” entry point

### Autonomous Showrunner
When enabled, CINEMIND may propose or generate what happens next based on:
- explicit user preferences
- viewing completion
- skips and abandonment
- likes/dislikes
- preferred episode lengths
- preferred genres and themes
- continuity constraints
- unresolved story arcs

Autonomy must remain bounded by user controls and visible state. The viewer should understand when content was generated automatically and be able to pause or redirect it.

### Director Mode
The user can issue story-level changes such as:
- change a relationship
- move the setting
- change the tone
- rewrite a scene
- promote a minor character
- request an alternate ending
- create a spin-off

Before accepting a change that affects existing canon, CINEMIND should run a **Canon Impact Analysis** and identify affected episodes/scenes/facts.

## Signature feature: Canon Impact Analysis

When the user changes a canonical fact, CINEMIND should:
1. retrieve relevant canon and timeline state from ClickHouse through the official MCP integration;
2. identify contradictions and dependent story facts;
3. summarize the impact in human-readable form;
4. propose the minimum rewrite needed;
5. regenerate only affected material;
6. revalidate continuity before publication.

This is a flagship demo moment because it makes agent reasoning, memory and partner integration visible.

## Signature feature: Why This Was Created

Every title can expose a concise explanation of why it exists. Example factors:
- declared taste profile
- completion behavior
- preferred genre mix
- preferred pacing
- runtime preference
- recent engagement
- prior universe affinity

The explanation should be derived from real stored signals rather than invented after the fact.

## Content-generation scope for the hackathon

The hackathon demonstration does not need full feature-length video generation. The product should prioritize:
- complete story and universe state
- generated title metadata
- original character concepts
- poster/key art
- episode outlines/scripts
- selected storyboard frames
- a small number of generated video scenes or a trailer when credits permit

This preserves budget while demonstrating a scalable system.

## Product quality bar

CINEMIND should not look like a dashboard wrapped around an LLM. The judging build should feel like a consumer entertainment product with:
- polished navigation
- loading and generation states
- empty states
- responsive layouts
- believable content density
- original art
- persistent user state
- visible agent actions where useful
- clear recovery/error behavior

## Non-goals for the first competition build

- generating 90-minute films end-to-end
- copying third-party streaming catalogs
- using copyrighted actors, franchises, logos or promotional artwork
- pretending generated video is fully produced when only selected scenes exist
- hiding ClickHouse behind a generic database abstraction in the demo

## Success metrics for the demo

The demo should prove all of the following in under three minutes:
- personalized catalog generation
- one complete generated title experience
- real ClickHouse-backed narrative memory
- a user-directed canon change
- contradiction detection
- autonomous or semi-autonomous continuation
- original visual assets
- visible Google Cloud/Gemini agent behavior
