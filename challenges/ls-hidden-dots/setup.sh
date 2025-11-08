#!/usr/bin/env bash
set -euo pipefail

cd /work

# Visible
printf "hello\n" > README.md
mkdir -p src
printf "tmp\n" > tmpfile

# Hidden files
: > .editorconfig
printf "secret\n" > .env
printf "*.log\n" > .gitignore

# Hidden symlink
printf "contents\n" > target.txt
ln -sf target.txt .link

# Hidden dirs (not to be listed)
mkdir -p .cache .config
printf "x\n" > .cache/file.in
printf "y\n" > .config/conf.yml
