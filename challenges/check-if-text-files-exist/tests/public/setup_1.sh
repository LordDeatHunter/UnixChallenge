#!/usr/bin/env bash
set -euo pipefail

cd /work

cat > file1.txt << EOL
This is file 1.
EOL

cat > file2.txt << EOL
This is file 2.
EOL

cat > file3.log << EOL
This is file 3.
EOL

cat > file4.md << EOL
This is file 4.
EOL
