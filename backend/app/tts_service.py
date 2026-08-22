from __future__ import annotations
import io
import logging
import uuid
import wave
from urllib.parse import quote
from google.cloud import storage
from google.genai import types
from .config import settings
from .gemini_service import studio

log = logging.getLogger(__name__)

VOICE_POOL = ["Charon", "Puck", "Aoede", "Leda", "Orus", "Kore"]

# google.genai speech_config accepts a narrower locale set than the UI. Keep the
# user's requested locale for writing/style, but map it to a supported synthesis
# code. Dominican Spanish is rendered as Latin-American Spanish while the prompt
# explicitly asks for Dominican pronunciation and cadence.
SUPPORTED_SPEECH_CODES = {
    "de-DE", "en-AU", "en-GB", "en-IN", "en-US", "es-US", "fr-FR", "hi-IN",
    "pt-BR", "ar-XA", "es-ES", "fr-CA", "id-ID", "it-IT", "ja-JP", "tr-TR",
    "vi-VN", "bn-IN", "gu-IN", "kn-IN", "ml-IN", "mr-IN", "ta-IN", "te-IN",
    "nl-NL", "ko-KR", "cmn-CN", "pl-PL", "ru-RU", "th-TH",
}


def speech_code(locale: str) -> str:
    normalized = (locale or "en-US").replace("_", "-")
    if normalized in SUPPORTED_SPEECH_CODES:
        return normalized
    lang = normalized.split("-", 1)[0].lower()
    if lang == "es":
        return "es-ES" if normalized.lower() == "es-es" else "es-US"
    defaults = {
        "en": "en-US", "fr": "fr-FR", "pt": "pt-BR", "de": "de-DE",
        "it": "it-IT", "ja": "ja-JP", "ko": "ko-KR", "ru": "ru-RU",
        "pl": "pl-PL", "nl": "nl-NL", "tr": "tr-TR", "vi": "vi-VN",
        "th": "th-TH", "id": "id-ID", "hi": "hi-IN", "cmn": "cmn-CN",
    }
    return defaults.get(lang, "en-US")


class NarrationService:
    def _wav_bytes(self, pcm: bytes, rate: int = 24000) -> bytes:
        out = io.BytesIO()
        with wave.open(out, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(rate)
            wf.writeframes(pcm)
        return out.getvalue()

    def voice_for_character(self, character_name: str) -> str:
        if not character_name:
            return settings.tts_voice
        index = sum(ord(ch) for ch in character_name) % len(VOICE_POOL)
        return VOICE_POOL[index]

    def synthesize_to_gcs(
        self,
        text: str,
        locale: str,
        style: str = "cinematic, emotionally natural performance",
        voice_name: str | None = None,
    ) -> dict | None:
        if not settings.enable_tts or not text.strip() or not settings.video_gcs_uri:
            return None
        voice = voice_name or settings.tts_voice
        synth_locale = speech_code(locale)
        locale_style = "Dominican Spanish accent and cadence" if locale.lower().startswith("es-do") else f"natural {locale} pronunciation"
        try:
            prompt = (
                f"Perform ONLY the following exact line. Do not add, translate, summarize, or announce a speaker name. "
                f"Use {locale_style}. Performance style: {style}. Line: {text}"
            )
            response = studio.client().models.generate_content(
                model=settings.tts_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    speech_config=types.SpeechConfig(
                        language_code=synth_locale,
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice)
                        ),
                    ),
                ),
            )
            pcm = b""
            for candidate in response.candidates or []:
                content = candidate.content
                if not content:
                    continue
                for part in content.parts or []:
                    if part.inline_data and part.inline_data.data:
                        raw = part.inline_data.data
                        pcm += raw if isinstance(raw, bytes) else bytes(raw)
            if not pcm:
                raise RuntimeError("Gemini TTS returned no audio bytes")

            wav = self._wav_bytes(pcm)
            prefix = settings.video_gcs_uri[5:] if settings.video_gcs_uri.startswith("gs://") else settings.video_gcs_uri
            bucket_name, _, base_prefix = prefix.partition("/")
            if not bucket_name:
                raise RuntimeError("Invalid CINEMIND_VIDEO_GCS_URI")
            object_name = "/".join(x for x in [base_prefix.rstrip('/'), "audio", f"{uuid.uuid4().hex}.wav"] if x)
            blob = storage.Client(project=settings.project).bucket(bucket_name).blob(object_name)
            blob.upload_from_string(wav, content_type="audio/wav")
            uri = f"gs://{bucket_name}/{object_name}"
            return {
                "audioUri": uri,
                "playbackUrl": f"/api/media/video/content?uri={quote(uri, safe='')}",
                "model": settings.tts_model,
                "voice": voice,
                "locale": locale,
                "synthesisLocale": synth_locale,
            }
        except Exception as exc:
            log.warning("Gemini TTS failed for %s via %s: %s", locale, synth_locale, exc)
            return None


narration = NarrationService()
