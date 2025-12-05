#!/usr/bin/env bash
set -euo pipefail

cd /work

cat > file1.log << EOL
This is file 1.
EOL

cat > file2.md << EOL
This is file 2.
EOL
