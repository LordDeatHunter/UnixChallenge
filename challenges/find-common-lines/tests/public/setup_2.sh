#!/usr/bin/env bash
set -euo pipefail

cd /work

cat > A.txt << 'EOF'
The quick brown fox
jumps over the lazy dog
Pack my box with five dozen liquor jugs.
How vexingly quick daft zebras jump!
Bright vixens jump; dozy fowl quack.
Sphinx of black quartz, judge my vow.
EOF

cat > B.txt << 'EOF'
The quick brown fox
Sphinx of black quartz, judge my vow.
Jackdaws love my big sphinx of quartz.
The five boxing wizards jump quickly.
jumps over the lazy dog
EOF
