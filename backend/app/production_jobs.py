from __future__ import annotations

import copy
import logging
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

from .episode_render import render_episode
from .schemas import EpisodeRenderRequest

log = logging.getLogger(__name__)


class ProductionJobManager:
    """Non-blocking local/service production coordinator.

    The render engine itself is stateless and can later be moved behind Cloud Run
    Jobs / scene workers without changing the API contract. For local development
    this manager keeps the UI responsive and exposes real progress immediately.
    """

    def __init__(self) -> None:
        self._jobs: dict[str, dict] = {}
        self._lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="cinemind-production")

    def _update(self, job_id: str, **fields) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            job.update(fields)
            job["updatedAt"] = time.time()

    def start(self, req: EpisodeRenderRequest, base_title: dict) -> dict:
        job_id = f"prod-{uuid.uuid4().hex[:16]}"
        now = time.time()
        job = {
            "id": job_id,
            "status": "QUEUED",
            "stage": "queued",
            "completed": 0,
            "total": 1,
            "percent": 0,
            "message": "Production queued",
            "createdAt": now,
            "updatedAt": now,
            "targetSeconds": req.targetSeconds,
            "result": None,
            "error": "",
        }
        with self._lock:
            self._jobs[job_id] = job
        self._executor.submit(self._run, job_id, req, copy.deepcopy(base_title))
        return self.get(job_id)

    def _run(self, job_id: str, req: EpisodeRenderRequest, title: dict) -> None:
        self._update(job_id, status="RUNNING", stage="planning", message="Production started")

        def progress(stage: str, completed: int, total: int, message: str) -> None:
            total = max(total, 1)
            # Stage-aware progress is intentionally approximate but based on real
            # completed work, unlike the old rotating fake labels.
            weights = {
                "planning": (0, 8),
                "reality_pack": (8, 18),
                "storyboard": (18, 32),
                "rendering": (32, 86),
                "composing": (86, 92),
                "quality": (92, 97),
                "repair": (92, 97),
            }
            start, end = weights.get(stage, (0, 95))
            fraction = min(1.0, max(0.0, completed / total))
            percent = round(start + (end - start) * fraction)
            self._update(
                job_id,
                status="RUNNING",
                stage=stage,
                completed=completed,
                total=total,
                percent=percent,
                message=message,
            )

        try:
            rendered = render_episode(req, progress=progress)
            segments = rendered.get("segments", [])
            final_url = rendered.get("finalPlaybackUrl", "")
            final_uri = rendered.get("finalVideoUri", "")
            if not segments or not final_url or not final_uri:
                raise RuntimeError("Renderer did not produce a viewer-ready master")

            title["productionStatus"] = "READY"
            title["productionSegments"] = segments
            title["productionPlaybackUrl"] = final_url
            title["productionVideoUri"] = final_uri
            title["productionComposition"] = rendered.get("composition", "single-master-mp4")
            title["productionSummary"] = rendered.get("summary", "")
            title["productionLogline"] = rendered.get("logline", "")
            title["productionContinuityLock"] = rendered.get("continuityLock", {})
            title["productionQualityGate"] = rendered.get("qualityGate", {})
            title["hasGeneratedVideo"] = True
            title["videoPreviewUrl"] = final_url
            first_episode = (title.get("episodes") or [{}])[0]
            if first_episode:
                first_episode["status"] = "Ready"
                first_episode["renderedSeconds"] = rendered.get("totalDurationSeconds", 0)
                first_episode["renderedSegments"] = len(segments)

            self._update(
                job_id,
                status="READY",
                stage="ready",
                completed=1,
                total=1,
                percent=100,
                message="Viewer-ready master complete",
                result=title,
            )
        except Exception as exc:
            log.exception("Production job %s failed", job_id)
            self._update(
                job_id,
                status="FAILED",
                stage="failed",
                percent=100,
                message="Production failed quality or render gate",
                error=f"{exc.__class__.__name__}: {exc}",
            )

    def get(self, job_id: str) -> dict:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                raise KeyError(job_id)
            return copy.deepcopy(job)


production_jobs = ProductionJobManager()
