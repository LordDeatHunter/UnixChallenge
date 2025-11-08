FROM alpine:latest

RUN apk add --no-cache \
  bash coreutils findutils grep gawk sed diffutils jq procps tar gzip xz \
  ca-certificates tini sudo && \
  rm -rf /var/cache/apk/* && \
  rm -rf /tmp/* && \
  echo 'runner ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/runner && \
  chmod 0440 /etc/sudoers.d/runner

ENV LC_ALL=C LANG=C

RUN adduser -D -u 1000 runner

USER runner

ENTRYPOINT ["/sbin/tini","-s","--"]

WORKDIR /work
