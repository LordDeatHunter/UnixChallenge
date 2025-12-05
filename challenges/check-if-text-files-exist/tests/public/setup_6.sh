#!/usr/bin/env bash
set -euo pipefail

cd /work

cat > .hidden.txt << EOL
This is a hidden text file.
EOL

cat > .config.yaml << EOL
key: value
EOL
