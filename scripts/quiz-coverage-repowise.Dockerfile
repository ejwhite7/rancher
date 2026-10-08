FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim
RUN apt-get update -qq && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*
ENV UV_TOOL_DIR=/opt/uv-tools UV_TOOL_BIN_DIR=/usr/local/bin DO_NOT_TRACK=1
RUN uv tool install repowise==0.55.0
