# syntax=docker/dockerfile:1.7
FROM node:22-slim AS web-build
WORKDIR /src
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY index.html tsconfig.json vite.config.ts postcss.config.js tailwind.config.js ./
COPY src ./src
RUN npm run build

FROM python:3.13-slim AS runtime
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080 \
    CINEMIND_DIST=/app/dist
WORKDIR /app
COPY backend /app/backend
RUN pip install --upgrade pip && pip install /app/backend
ENV PYTHONPATH=/app/backend
COPY --from=web-build /src/dist /app/dist
EXPOSE 8080
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
