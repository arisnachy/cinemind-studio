# CINEMIND Studio — Premium Streaming UX Specification

## UX objective

CINEMIND should feel instantly familiar to anyone who uses a modern premium streaming service while remaining visually and legally its own product.

The interaction model should borrow the strongest established streaming patterns: immersive hero content, dark cinematic surfaces, horizontal rails, focus on artwork, low-friction playback, title detail overlays/pages, profiles, watchlists and continue-watching state.

Do **not** reproduce Netflix logos, proprietary artwork, exact brand typography, trademarked animations or pixel-identical trade dress.

## Overall visual character

- cinematic, dark, immersive and content-first
- minimal chrome
- large edge-to-edge imagery
- strong hierarchy between hero, rails and metadata
- subtle gradients that protect text readability
- restrained motion and premium transitions
- dense enough to look like a real streaming catalog, never like a hackathon dashboard

## Application shell

### Top navigation
Persistent desktop header with:
- CINEMIND wordmark
- Home
- Series
- Movies
- My Universes
- My List
- search
- notifications/activity
- profile avatar/menu

The header begins visually transparent over the hero and becomes a solid/darker surface as the user scrolls.

### Mobile navigation
Prioritize:
- Home
- Search
- Create
- My Universes
- Profile

## Home screen

### Hero region
The first viewport is dominated by a generated title.

Required content:
- full-bleed original key art or cinematic still
- title treatment using CINEMIND-owned typography/art
- concise synopsis
- relevance/match signal when appropriate
- primary action: Play / Generate Episode / Continue
- secondary action: More Info
- optional badge showing “Created for you” or “Evolving universe”

The hero should fade naturally into the page background rather than ending in a hard rectangle.

### Horizontal rails
Rows use large artwork cards and fluid horizontal scrolling.

Initial rails:
1. Continue Watching
2. Created For You
3. New From Your Universes
4. Because You Like…
5. Tonight: 20–35 Minute Stories
6. Movies
7. Series
8. Experimental Worlds

Rows should feel populated even when some items are still being generated. Use purposeful skeleton states instead of generic spinners.

## Content cards

### Default state
Show poster/backdrop artwork with minimal overlay.

### Hover/focus expansion
On desktop, a focused card can expand or elevate and reveal:
- Play
- Add to My List
- Like/Dislike
- More Info
- episode/runtime metadata
- genre/tone tags
- canon status or “new episode generated” indicator when relevant

Movement should be smooth but not excessive.

### Generated-content indicators
Avoid plastering “AI” everywhere. Use subtle language such as:
- Created for you
- Generated today
- New chapter ready
- Universe evolving

## Title detail experience

Use either a large modal or dedicated route with:
- cinematic hero backdrop
- title
- synopsis
- match rationale
- metadata
- primary actions
- season selector
- episode list
- generated cast/characters
- trailers/scenes
- “Why this was created”
- “Explore universe”
- “Direct this story”

## Episode list

Each episode row/card should display:
- thumbnail
- episode number/title
- duration target
- synopsis
- watch/generation status
- progress bar when partially watched

Episodes not yet materialized can display states such as:
- Planned
- Writing
- Storyboard ready
- Scene generation in progress
- Ready

This is a distinctive CINEMIND behavior and should feel native to the streaming experience.

## Create flow

The creation experience should open as a cinematic studio overlay rather than a technical form.

### Fast start
User can simply describe what they want.

### Guided controls
Optional chips/sliders/selectors for:
- genre
- mood
- setting
- era
- episode/film format
- story intensity
- humor
- mystery
- realism vs fantasy
- preferred language

### Autonomous option
A prominent switch/control:
**“Surprise me — build from my taste profile.”**

After creation starts, transition into an agentic production state showing meaningful stages, e.g.:
- Reading your taste profile
- Building the universe
- Casting characters
- Establishing canon
- Writing the first arc
- Creating key art
- Continuity check
- Publishing to your home

Do not expose raw chain-of-thought. Show high-level status and evidence only.

## My Universes

A dedicated library for persistent fictional worlds.

Each universe card should show:
- key art
- universe name
- active titles/spin-offs
- last generated event
- canon health
- next planned release

Opening a universe reveals:
- timeline
- character graph
- locations
- active mysteries/arcs
- seasons/films
- canon facts
- recent changes

This screen can be more information-rich than the consumer Home but must preserve the cinematic visual language.

## Canon Impact Analysis UI

This is a hero feature and must be visually memorable.

When a user requests a change that conflicts with existing story state, show a focused panel such as:

**Canon Impact Analysis**
- 3 contradictions found
- Episode 1 · Scene 7
- Episode 2 · Scene 4
- Episode 3 · Scene 11

Then present actions:
- Preserve current canon
- Rewrite affected scenes
- Fork alternate timeline

The system should show that the results came from stored narrative memory and continuity analysis, not a generic warning.

## Why This Was Created UI

A compact explanation sheet can show normalized factors such as:
- Medical thriller affinity — high
- Sci-fi affinity — high
- Shorter runtime preference — medium
- Mystery completion — high
- Recent interest in Caribbean settings — rising

No sensitive profiling should be inferred beyond user-provided or product-generated entertainment behavior.

## Profiles

Support multiple viewer profiles conceptually. Each profile has separate:
- taste model
- history
- watch progress
- universes
- recommendations/generations

## Search

Search should work across:
- generated titles
- characters
- universes
- genres
- themes
- user intent

It should also support creative intent, e.g. “make me something like a medical mystery but in space” without using copyrighted franchises as source material.

## Playback / scene viewer

For the competition prototype, playback can support:
- generated teaser/trailer
- selected generated scenes
- storyboard sequence
- script/story mode where full video is not available

The product must be honest about which assets are actual generated video versus planned/scripted content.

## Motion principles

- subtle scale on focus
- smooth rail movement
- cinematic cross-fades
- hero background transitions
- restrained glass/blur where useful
- no generic SaaS card animations

## Accessibility

- keyboard navigation for rails and dialogs
- visible focus states
- captions/subtitles for generated video
- semantic controls
- adequate contrast
- reduced-motion support

## Responsive quality bar

Desktop is the primary judging experience, but tablet and mobile layouts must remain coherent. The interface should never collapse into an admin dashboard on smaller screens.

## Demo home-state requirement

Before recording the judging video, preload a synthetic viewer profile and enough original generated titles to make the first screen look like a mature streaming product. Then demonstrate live generation and continuity actions on top of that believable state.
