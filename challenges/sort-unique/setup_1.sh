#!/usr/bin/env bash
set -euo pipefail

cd /work

# Create input file for test case 1
cat > input.txt << 'EOF'
b
a
b
b
b
g
j
r
EOF

