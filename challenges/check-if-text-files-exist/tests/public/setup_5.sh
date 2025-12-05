#!/usr/bin/env bash
set -euo pipefail

cd /work

mkdir -p folder.txt

cat > readme.md << EOL
This is a readme file.
EOL

cat > data.json << EOL
{"key": "value"}
EOL
