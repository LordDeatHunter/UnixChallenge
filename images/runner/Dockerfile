FROM debian:stable-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
  bash coreutils findutils grep gawk sed diffutils jq procps tar gzip xz-utils \
  ca-certificates tini && rm -rf /var/lib/apt/lists/*

ENV LC_ALL=C LANG=C

RUN useradd -m -u 1000 runner

USER runner

ENTRYPOINT ["/usr/bin/tini","--"]

WORKDIR /work
