#!/usr/bin/env bash
set -euo pipefail

cd /work

# Visible files
printf "visible\n" > file.txt
mkdir -p dir

# Hidden files for test 2
: > .a
: > .b
: > .c.d

# Hidden symlink
printf "target\n" > visible_target.txt
ln -sf visible_target.txt .symlink

# Hidden dir (should not be listed)
mkdir -p .hidden_dir
printf "data\n" > .hidden_dir/data.txt

