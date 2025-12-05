#!/usr/bin/env bash
set -euo pipefail

cd /work

cat > file.txt.bak << EOL
This is a backup file.
EOL

cat > old_text.txt.old << EOL
This is an old text file.
EOL

cat > txtfile.log << EOL
This is a log file.
EOL
