#!/usr/bin/env bash
set -euo pipefail

cd /work

cat > input.txt << 'EOF'
zebra
apple
apple
banana
apple
zebra
cherry
EOF
