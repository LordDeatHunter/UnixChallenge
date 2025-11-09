#!/usr/bin/env bash
set -euo pipefail

cd /work

cat > A.txt << 'EOF'
alpha
beta
gamma
delta
epsilon
theta
lambda
omega
zeta
kappa
EOF

cat > B.txt << 'EOF'
gamma
theta
omega
tau
phi
EOF
