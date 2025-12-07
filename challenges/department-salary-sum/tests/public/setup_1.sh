#!/usr/bin/env bash
set -euo pipefail

cd /work

printf "id,name,department,salary\n" > employees.csv
printf "1,Alice,Engineering,70000\n" > employees.csv
printf "2,Bob,Marketing,50000\n" >> employees.csv
printf "3,Charlie,Engineering,80000\n" >> employees.csv
printf "4,David,HR,60000\n" >> employees.csv
printf "5,Eve,Marketing,55000\n" >> employees.csv >> employees.csv
