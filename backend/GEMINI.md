# CINEMIND Google ADK runtime

This runtime is restricted to Google Cloud AI. `app/agent.py` is the canonical ADK entry point.
The ClickHouse track uses the official `mcp-clickhouse` server over stdio through Google ADK's `McpToolset`.
Never replace the MCP path with a direct-only database integration; deterministic direct ClickHouse writes are supplemental persistence, while agent memory reads must continue through MCP.
