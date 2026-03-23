#FROM python:3.13-slim
FROM alpine:latest

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev

COPY alembic.ini ./
COPY alembic/ ./alembic/
COPY api/ ./api/
COPY worker/ ./worker/
COPY database/ ./database/
COPY challenges/ ./challenges/

RUN mkdir -p artifacts

EXPOSE 8000

CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn api.main:app --host 0.0.0.0 --port 8000"]
