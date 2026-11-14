# Terra Tempo API image (Railway). Build context = repository root:
#   docker build -f api/Dockerfile -t terra-tempo-api .
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    TERRATEMPO_CUBES=/app/data/cubes \
    PORT=8000

WORKDIR /app

# Dependencies first, for layer caching.
COPY api/requirements.txt api/requirements.txt
RUN pip install -r api/requirements.txt

# The pipeline package (every formula lives there; the API imports it).
COPY pipeline/pyproject.toml pipeline/pyproject.toml
COPY pipeline/terratempo pipeline/terratempo
RUN pip install ./pipeline

COPY api/app api/app
# Real 5° cubes, when they exist (data/cubes/<variable>.npz). Without them the API
# serves labelled synthetic data ("demonstracao").
COPY data/cubes data/cubes

RUN useradd --create-home --uid 10001 app && chown -R app /app
USER app

EXPOSE 8000
# Railway sets $PORT. --proxy-headers so the rate limit sees the real client address.
CMD ["sh", "-c", "uvicorn app.main:app --app-dir api --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
