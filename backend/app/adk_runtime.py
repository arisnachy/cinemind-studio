from __future__ import annotations
import json
import os
import sys
import uuid
from contextlib import aclosing
from google.adk.agents import Agent
from google.adk.models import Gemini
from google.adk.runners import InMemoryRunner
from google.genai import types
from .config import settings


def _configure_vertex_environment() -> None:
    """Make ADK use Vertex AI + Application Default Credentials.

    The direct google-genai client is explicitly created with vertexai=True, but
    ADK's Gemini wrapper reads its backend selection from environment variables.
    Without this flag it falls back to the Gemini Developer API and asks for an
    API key even when ADC is already configured.
    """
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "TRUE"
    os.environ["GOOGLE_CLOUD_PROJECT"] = settings.project
    os.environ["GOOGLE_CLOUD_LOCATION"] = settings.location


def _clickhouse_toolset():
    if not settings.clickhouse_ready:
        return None
    from google.adk.tools.mcp_tool.mcp_toolset import McpToolset
    from google.adk.tools.mcp_tool import StdioConnectionParams
    from mcp import StdioServerParameters

    env = dict(os.environ)
    env.update({
        "CLICKHOUSE_HOST": settings.clickhouse_host,
        "CLICKHOUSE_PORT": str(settings.clickhouse_port),
        "CLICKHOUSE_USER": settings.clickhouse_user,
        "CLICKHOUSE_PASSWORD": settings.clickhouse_password,
        "CLICKHOUSE_DATABASE": settings.clickhouse_database,
        "CLICKHOUSE_SECURE": "true" if settings.clickhouse_secure else "false",
        "CLICKHOUSE_VERIFY": "true" if settings.clickhouse_verify else "false",
        "CLICKHOUSE_ALLOW_WRITE_ACCESS": "false",
        "CLICKHOUSE_ALLOW_DROP": "false",
    })
    return McpToolset(
        connection_params=StdioConnectionParams(
            server_params=StdioServerParameters(
                command=sys.executable,
                args=["-m", "mcp_clickhouse.main"],
                env=env,
            ),
            timeout=12,
        ),
        tool_filter=["list_databases", "list_tables", "run_query"],
        tool_name_prefix="memory_",
    )


def build_root_agent() -> Agent:
    _configure_vertex_environment()
    memory_tools = _clickhouse_toolset()
    common_model = Gemini(model=settings.text_model, retry_options=types.HttpRetryOptions(attempts=3))

    character_architect = Agent(
        name="character_architect",
        model=common_model,
        instruction="Design original fictional characters with clear motivations, relationships, visual continuity and knowledge state. Never imitate real performers or copyrighted franchise characters.",
    )
    writer = Agent(
        name="episode_writer",
        model=common_model,
        instruction="Develop compact episode arcs, hooks and scene-level dramatic progression for an original streaming story. Preserve supplied canon exactly.",
    )
    continuity = Agent(
        name="continuity_guardian",
        model=common_model,
        instruction="Act as a strict continuity editor. Identify contradictions, timeline violations and character-state conflicts. Prefer preserving established canon and explicitly report uncertainty. The root showrunner supplies any retrieved memory context.",
    )
    showrunner_tools = [memory_tools] if memory_tools else []
    return Agent(
        name="cinemind_showrunner",
        model=common_model,
        instruction=(
            "You are CINEMIND's autonomous showrunner. Create only original entertainment. "
            "When ClickHouse memory tools are available, query them before making continuity-sensitive decisions. "
            "Delegate character design, episode structure and continuity checking to your specialist sub-agents. "
            "Return a concise creative room memo with the strongest concept, canon constraints and audience-fit rationale."
        ),
        tools=showrunner_tools,
        sub_agents=[character_architect, writer, continuity],
    )


async def run_creative_room(prompt: str, viewer_id: str) -> str:
    _configure_vertex_environment()
    root_agent = build_root_agent()
    runner = InMemoryRunner(app_name="cinemind", agent=root_agent)
    session = await runner.session_service.create_session(app_name="cinemind", user_id=viewer_id)
    content = types.Content(role="user", parts=[types.Part.from_text(text=prompt)])
    final_texts: list[str] = []
    async with aclosing(runner.run_async(user_id=viewer_id, session_id=session.id, new_message=content)) as events:
        async for event in events:
            if not event.content or not event.content.parts:
                continue
            text = "".join(part.text or "" for part in event.content.parts)
            if text:
                final_texts.append(text)
    return final_texts[-1] if final_texts else ""
