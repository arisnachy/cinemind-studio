#!/usr/bin/env bash
set -euo pipefail
: "${GOOGLE_CLOUD_PROJECT:?Set GOOGLE_CLOUD_PROJECT}"
REGION="${GOOGLE_CLOUD_REGION:-us-central1}"
IMAGE="$REGION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/cinemind/cinemind-studio:$(date +%Y%m%d%H%M%S)"

gcloud builds submit --tag "$IMAGE" .
gcloud run deploy cinemind-studio \
  --image "$IMAGE" \
  --region "$REGION" \
  --allow-unauthenticated \
  --memory 2Gi --cpu 2 --timeout 900 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT,GOOGLE_CLOUD_LOCATION=global,GOOGLE_GENAI_USE_ENTERPRISE=true,GEMINI_TEXT_MODEL=gemini-3.6-flash,GEMINI_IMAGE_MODEL=gemini-2.5-flash-image,VEO_MODEL=veo-3.1-fast-generate-001"
