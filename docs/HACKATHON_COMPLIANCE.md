# CINEMIND Studio — Hackathon Compliance Gate

This document exists to prevent accidental disqualification.

## Hard requirements

### Project origin
- Project must be newly created during the contest period.
- Do not import implementation code or assets from an older project.

### AI tooling restriction
- Runtime AI must use Google Cloud AI tools permitted by the rules.
- Development-time AI coding assistance must also stay within the Google-approved workflow.
- Use Gemini CLI, Gemini Code Assist or Google Antigravity for executable implementation.
- Do not use OpenAI, Anthropic, Microsoft, AWS or other third-party AI models/agents to generate implementation code, scaffolding or submission assets.
- Strategy, planning and feasibility documentation may be developed separately, but submitted implementation artifacts must remain compliant.

### ClickHouse track requirement
- The product must actively use ClickHouse at runtime.
- Use the official `mcp-clickhouse` MCP server.
- Connect it to ClickHouse Cloud or a self-hosted ClickHouse cluster.
- A README mention alone does not qualify.
- At least one visible product feature should fail or materially degrade if the ClickHouse runtime is unavailable, demonstrating that it is essential rather than decorative.

### Google Cloud requirement
- The project must use Gemini and Google Cloud Agent Builder / permitted Google agent tooling.
- The repository must show actual runtime imports/configuration/calls for Google Cloud AI services.

### Platform
- Final project must run on web, Android or iOS.
- CINEMIND targets web first.

### Repository
- Repository must be public for submission.
- Repository must be open source.
- Repository must contain a detectable OSI-approved license.
- Repository must contain all source, assets and instructions needed for judging/testing.

### Hosted project
- Submission must include a hosted project URL for judging/testing.

### Demo video
- Maximum evaluated duration: first 3 minutes.
- Upload publicly to YouTube or Vimeo.
- Must show the real product functioning, not a cinematic concept trailer.
- Must be in English or include English subtitles.

## Intellectual property guardrails

The final submission must be original and must not include third-party advertising, logos, trademarks, copyrighted promotional artwork or other protected material without authorization.

For CINEMIND this means:
- do not use Netflix branding, logo, intro sound, artwork or screenshots;
- do not ship a pixel-identical clone of Netflix trade dress;
- do not use real actors as generated characters;
- do not use copyrighted franchises as generated universes;
- use only original or properly licensed fonts/assets;
- generated posters, characters and scenes should be original;
- keep CINEMIND branding visible in the judging video.

The product may use familiar streaming interaction patterns while maintaining distinct branding and visual expression.

## Submission checklist

Before submission, verify every item:

- [ ] New-project requirement satisfied
- [ ] All implementation generated/developed only with permitted Google AI tooling
- [ ] Gemini/Google AI used at runtime
- [ ] Google agent framework/service used at runtime
- [ ] Official ClickHouse MCP server used at runtime
- [ ] ClickHouse connected to real cluster
- [ ] Hosted web app available
- [ ] Public repository available
- [ ] Apache-2.0 license detected by GitHub
- [ ] Setup instructions tested from a clean environment
- [ ] No secrets in repository/history
- [ ] No third-party branded/copyrighted entertainment assets
- [ ] Original CINEMIND UI identity
- [ ] Demo shows real end-to-end functionality
- [ ] Demo proves ClickHouse-dependent behavior
- [ ] Demo proves persistent state across at least one refresh/navigation
- [ ] Demo is <= 3 minutes or strongest proof appears within first 3 minutes
- [ ] English UI/support present
- [ ] English narration or subtitles present
- [ ] Devpost text accurately describes what was actually demonstrated

## Pre-demo legal/IP scan

Inspect every frame likely to appear in the demo for:
- third-party logos
- recognizable copyrighted characters
- copyrighted poster art
- trademarked streaming branding
- exposed API keys, emails or personal data
- browser tabs/bookmarks that could introduce third-party branding

## Technical truth rule

Never claim:
- a movie is fully generated when only selected scenes exist;
- ClickHouse made a decision unless the result actually depended on the live MCP query;
- an agent completed a workflow when completion exists only in UI copy;
- content persisted unless it survives reload/restart according to the demonstrated architecture.

The competition build should prefer smaller, undeniable proofs over broader simulated claims.
