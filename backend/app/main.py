from __future__ import annotations
import logging
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from google.cloud import storage
from .canon_service import analyze
from .config import settings
from .gemini_service import studio
from .memory import memory
from .schemas import CanonAnalyzeRequest, CanonResolveRequest, GenerateTitleRequest, VideoRequest
from .video_service import videos

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
app = FastAPI(title="CINEMIND Studio", version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup() -> None:
    if memory.enabled and settings.clickhouse_allow_write:
        memory.bootstrap()

@app.get("/api/health")
def health():
    clickhouse_ok = False
    if memory.enabled:
        try:
            memory.client().query("SELECT 1")
            clickhouse_ok = True
        except Exception:
            clickhouse_ok = False
    return {
        "ok": True,
        "gemini": studio.ready,
        "geminiModel": settings.text_model,
        "clickhouse_mcp": settings.clickhouse_ready,
        "clickhouse_cluster": clickhouse_ok,
        "imageGeneration": settings.enable_images,
        "videoGeneration": settings.enable_video,
        "veoModel": settings.veo_model,
        "veoDurationSeconds": settings.veo_duration_seconds,
    }

@app.post("/api/studio/generate")
async def generate(req: GenerateTitleRequest):
    if not studio.ready:
        raise HTTPException(503, "Google Cloud is not configured. Set GOOGLE_CLOUD_PROJECT and deploy with Vertex AI credentials.")
    try:
        blueprint, _ = await studio.generate_blueprint(req)
        title = studio.to_title(req, blueprint)
        memory.persist_generation(viewer_id=req.profile.id, title=title, canon_facts=blueprint.canonFacts)
        return title
    except Exception as exc:
        logging.exception("Generation failed")
        raise HTTPException(500, f"Gemini studio generation failed: {exc}") from exc

@app.post("/api/canon/analyze")
async def canon_analyze(req: CanonAnalyzeRequest):
    if not studio.ready:
        raise HTTPException(503, "Google Cloud is not configured")
    try:
        result = await analyze(req.title, req.requestedChange)
        return result.model_dump()
    except Exception as exc:
        logging.exception("Canon analysis failed")
        raise HTTPException(500, f"Canon analysis failed: {exc}") from exc

@app.post("/api/canon/resolve")
async def canon_resolve(req: CanonResolveRequest):
    title_id = req.title.get("id", "unknown")
    base = req.title.get("canonVersion", "v1.0.0")
    if req.strategy == "fork":
        version = f"{base}-alt"
        message = "Alternate timeline created; primary canon preserved."
    elif req.strategy == "rewrite":
        version = "v1.1.0"
        message = "Affected scenes marked for Gemini rewrite and continuity revalidation."
    else:
        version = base
        message = "Incoming change constrained to preserve established canon."
    memory.persist_resolution(viewer_id="viewer", title=req.title, strategy=req.strategy, requested_change=req.requestedChange)
    return {"message": message, "canonVersion": version, "titleId": title_id}

@app.post("/api/media/video")
def generate_video(req: VideoRequest):
    try:
        return videos.generate(req.title)
    except Exception as exc:
        raise HTTPException(400, str(exc)) from exc

@app.api_route("/api/media/video/content", methods=["GET", "HEAD"])
def video_content(uri: str, request: Request):
    if not uri.startswith("gs://"):
        raise HTTPException(400, "Only gs:// Veo outputs are supported")
    bucket_name, _, blob_name = uri[5:].partition("/")
    if not bucket_name or not blob_name:
        raise HTTPException(400, "Invalid GCS video URI")

    blob = storage.Client(project=settings.project).bucket(bucket_name).blob(blob_name)
    try:
        blob.reload()
    except Exception as exc:
        raise HTTPException(404, "Generated video is not available yet") from exc

    total = int(blob.size or 0)
    if total <= 0:
        raise HTTPException(404, "Generated video is empty")

    common_headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
        "Content-Type": blob.content_type or "video/mp4",
    }
    range_header = request.headers.get("range")

    if request.method == "HEAD":
        return Response(status_code=200, headers={**common_headers, "Content-Length": str(total)})

    if not range_header:
        data = blob.download_as_bytes()
        return Response(content=data, status_code=200, media_type=blob.content_type or "video/mp4", headers={**common_headers, "Content-Length": str(total)})

    try:
        unit, spec = range_header.split("=", 1)
        if unit.strip().lower() != "bytes" or "," in spec:
            raise ValueError("unsupported range")
        start_text, end_text = spec.split("-", 1)
        if start_text:
            start = int(start_text)
            end = int(end_text) if end_text else total - 1
        else:
            suffix = int(end_text)
            if suffix <= 0:
                raise ValueError("invalid suffix")
            start = max(total - suffix, 0)
            end = total - 1
        if start < 0 or start >= total or end < start:
            raise ValueError("invalid range")
        end = min(end, total - 1)
    except (ValueError, TypeError):
        return Response(status_code=416, headers={**common_headers, "Content-Range": f"bytes */{total}"})

    data = blob.download_as_bytes(start=start, end=end)
    length = end - start + 1
    headers = {
        **common_headers,
        "Content-Range": f"bytes {start}-{end}/{total}",
        "Content-Length": str(length),
    }
    return Response(content=data, status_code=206, media_type=blob.content_type or "video/mp4", headers=headers)

DIST = Path(os.getenv("CINEMIND_DIST", "/app/dist"))
if DIST.exists():
    assets = DIST / "assets"
    if assets.exists():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        candidate = DIST / path
        if path and candidate.exists() and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST / "index.html")
