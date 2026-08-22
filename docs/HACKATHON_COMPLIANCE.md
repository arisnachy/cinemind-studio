# CINEMIND Hackathon Compliance Gate

This file is an engineering gate, not a legal opinion. The current Devpost rules remain the source of truth.

## Submission baseline

- Project is new for the contest period.
- Web application is functional and hosted for judging.
- Repository is public at submission time and has an OSI-approved license.
- Demo video is public, <= 3 minutes, and in English or has English subtitles.
- Runtime AI/agent stack uses Google Cloud AI services only.
- ClickHouse track runtime actively connects through the official `mcp-clickhouse` server.
- No third-party logos, franchise characters, actor likenesses, copyrighted film clips or sample streaming assets are part of the submission.
- No API keys, credentials, passwords or service-account JSON files are committed.

## Runtime proof requirements

A judge should be able to observe:

1. Director Studio sends a real `/api/studio/generate` request.
2. Google ADK creates the creative-room pass.
3. Gemini returns the structured title / characters / episodes.
4. The ADK agent has an official `mcp-clickhouse` toolset when ClickHouse credentials are configured.
5. Generated canon facts are durably persisted to ClickHouse.
6. Canon Impact Analysis runs against the live title and can query memory through MCP.
7. Optional media generation uses Google image generation and Veo only.

## ClickHouse safety boundary

The model-facing MCP process is forced to read-only mode:

- `CLICKHOUSE_ALLOW_WRITE_ACCESS=false`
- `CLICKHOUSE_ALLOW_DROP=false`

Application writes are deterministic and limited to the CINEMIND tables. Use a dedicated least-privilege ClickHouse account for the deployed demo.

## IP gate

Before recording or submitting:

- [ ] No Netflix name/logo/trade dress is represented as CINEMIND branding.
- [ ] No Unsplash or stock imagery remains in runtime assets.
- [ ] No public sample film is used as if it were generated content.
- [ ] All generated characters are fictional and do not request real-person likeness.
- [ ] Every media asset shown in the demo is original, locally generated placeholder art, or generated through the allowed Google runtime.

## Cost gate

Veo generation must remain explicit opt-in during development. Turn it on only for planned demo-generation runs and point it at a controlled GCS prefix.
