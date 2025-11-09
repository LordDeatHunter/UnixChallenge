#!/usr/bin/env bash
set -euo pipefail

cd /work

cat > input.txt << 'EOF'
abc
abc
bab
bbc
ccb
aba
aba
abc
abc
abc
aaa
abc
abc
abc
abc
aba
dbc
dbb
dbb
aba
abc
abc
aba
aaa
dbd
dbc
dbe
aba
abc
EOF
