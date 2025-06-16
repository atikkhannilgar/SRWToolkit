FROM python:3.12-slim AS base

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update -y && apt-get install curl -y

FROM base AS poetry
WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN pip install poetry poetry-plugin-export
RUN poetry export -o requirements.txt --without-hashes

FROM base
COPY --from=poetry /app/requirements.txt /app/requirements.txt
WORKDIR /app
RUN pip install -r requirements.txt
COPY . .
EXPOSE 1339
CMD ["uvicorn", "--host", "0.0.0.0", "--port", "1339", "api.app:app"]
