from __future__ import annotations
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any
import clickhouse_connect
from .config import settings

log = logging.getLogger(__name__)
_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

def _safe_ident(value: str) -> str:
    if not _IDENT.match(value):
        raise ValueError(f"Unsafe ClickHouse identifier: {value!r}")
    return value

class NarrativeMemory:
    def __init__(self) -> None:
        self._client = None
        self._bootstrapped = False

    @property
    def enabled(self) -> bool:
        return settings.clickhouse_ready

    def client(self):
        if not self.enabled:
            return None
        if self._client is None:
            self._client = clickhouse_connect.get_client(
                host=settings.clickhouse_host,
                port=settings.clickhouse_port,
                username=settings.clickhouse_user,
                password=settings.clickhouse_password,
                database=settings.clickhouse_database,
                secure=settings.clickhouse_secure,
                verify=settings.clickhouse_verify,
                connect_timeout=10,
                send_receive_timeout=30,
                client_name="cinemind-studio",
            )
        return self._client

    def bootstrap(self) -> bool:
        if not (self.enabled and settings.clickhouse_allow_write and settings.clickhouse_bootstrap):
            return False
        if self._bootstrapped:
            return True
        db = _safe_ident(settings.clickhouse_database)
        client = self.client()
        statements = [
            f"""CREATE TABLE IF NOT EXISTS {db}.cinemind_events (
                event_time DateTime64(3, 'UTC'),
                event_id String,
                viewer_id String,
                universe_id String,
                title_id String,
                event_type LowCardinality(String),
                payload_json String
            ) ENGINE = MergeTree ORDER BY (viewer_id, universe_id, event_time, event_id)""",
            f"""CREATE TABLE IF NOT EXISTS {db}.cinemind_canon_facts (
                observed_at DateTime64(3, 'UTC'),
                universe_id String,
                title_id String,
                canon_version String,
                fact String,
                source LowCardinality(String)
            ) ENGINE = ReplacingMergeTree ORDER BY (universe_id, title_id, fact)""",
            f"""CREATE TABLE IF NOT EXISTS {db}.cinemind_taste_signals (
                observed_at DateTime64(3, 'UTC'),
                viewer_id String,
                signal_type LowCardinality(String),
                signal_key String,
                signal_value Float64,
                context_json String
            ) ENGINE = MergeTree ORDER BY (viewer_id, observed_at, signal_type, signal_key)""",
        ]
        try:
            for stmt in statements:
                client.command(stmt)
            self._bootstrapped = True
            return True
        except Exception:
            log.exception("ClickHouse schema bootstrap failed")
            return False

    def persist_generation(self, *, viewer_id: str, title: dict[str, Any], canon_facts: list[str]) -> bool:
        if not (self.enabled and settings.clickhouse_allow_write):
            return False
        self.bootstrap()
        client = self.client()
        now = datetime.now(timezone.utc)
        try:
            client.insert(
                "cinemind_events",
                [[now, f"generation-{title['id']}", viewer_id, title["universeId"], title["id"], "TITLE_GENERATED", json.dumps(title, separators=(",", ":"))]],
                column_names=["event_time", "event_id", "viewer_id", "universe_id", "title_id", "event_type", "payload_json"],
            )
            if canon_facts:
                client.insert(
                    "cinemind_canon_facts",
                    [[now, title["universeId"], title["id"], "v1.0.0", fact, "Gemini Showrunner"] for fact in canon_facts],
                    column_names=["observed_at", "universe_id", "title_id", "canon_version", "fact", "source"],
                )
            return True
        except Exception:
            log.exception("Could not persist generation to ClickHouse")
            return False

    def persist_resolution(self, *, viewer_id: str, title: dict[str, Any], strategy: str, requested_change: str) -> bool:
        if not (self.enabled and settings.clickhouse_allow_write):
            return False
        self.bootstrap()
        try:
            now = datetime.now(timezone.utc)
            payload = {"strategy": strategy, "requestedChange": requested_change}
            self.client().insert(
                "cinemind_events",
                [[now, f"canon-{title.get('id','unknown')}-{int(now.timestamp())}", viewer_id, title.get("universeId", ""), title.get("id", ""), "CANON_RESOLUTION", json.dumps(payload)]],
                column_names=["event_time", "event_id", "viewer_id", "universe_id", "title_id", "event_type", "payload_json"],
            )
            return True
        except Exception:
            log.exception("Could not persist canon resolution")
            return False

memory = NarrativeMemory()
