#!/usr/bin/env bash
set -euo pipefail

cd /work

cat > A.txt << 'EOF'
# users.csv
id,name,email,role,status
1,Alice,a@example.com,admin,active
2,Bob,b@example.com,editor,active
3,Carol,c@example.com,viewer,suspended
4,Dan,d@example.com,editor,active
5,Eve,e@example.com,admin,active
6,Frank,f@example.com,viewer,deleted
7,Grace,g@example.com,editor,active
8,Heidi,h@example.com,viewer,active
9,Ivan,i@example.com,admin,active
10,Judy,j@example.com,viewer,active
-- checksums --
SHA256:3A7F5C9B
MD5:1bc29b36
PATH:/var/log/app/events.log
BEGIN
EVENT:2025-03-01T12:00:00Z LOGIN user=alice ok
EVENT:2025-03-01T12:05:14Z UPLOAD user=bob size=1024
EVENT:2025-03-01T12:09:02Z LOGIN user=carol fail
EVENT:2025-03-01T12:11:55Z DELETE user=frank ok
EVENT:2025-03-01T12:15:33Z DOWNLOAD user=heidi size=2048
END
tokens:
abc123
deadbeef
cafebabe
feedface
0xFFEE
NOTE: case-sensitive matching only
literal equals: a(b)[c]{d}^$.*+?|-\
blank

line with trailing spaces···
exact match required
TAB	SEPARATED	VALUES
EOF

cat > B.txt << 'EOF'
id,name,email,role,status
5,Eve,e@example.com,admin,active
EVENT:2025-03-01T12:15:33Z DOWNLOAD user=heidi size=2048
BEGIN
END
deadbeef
cafebabe
literal equals: a(b)[c]{d}^$.*+?|-\
blank

TAB	SEPARATED	VALUES
line with trailing spaces···
EOF
