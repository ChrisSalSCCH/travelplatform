# ── Stage 1: dependency builder ────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build tools needed by some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: runtime ───────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Create persistent data directories
RUN mkdir -p /app/data /app/uploads /app/config \
    && chmod 755 /app/data /app/uploads /app/config

# Default env vars (overridden via docker-compose or -e flags)
ENV DATABASE_URL=sqlite:////app/data/travel_expenses.db \
    UPLOAD_DIR=/app/uploads \
    PROJECTS_FILE=/app/config/projects.yaml \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
