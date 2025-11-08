import os
import sys
import json
import time
import uuid
import pathlib
import subprocess

RUNNER_IMAGE = "unixchallenge-runner:latest"

def run_cmd(cmd, timeout_s):
    start = time.time()
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    try:
        out, err = p.communicate(timeout=timeout_s)
        rc = p.returncode
    except subprocess.TimeoutExpired:
        p.kill()
        out, err, rc = b"", b"TIMEOUT\n", 124

    return rc, out, err, int((time.time()-start)*1000)


def docker_run(mounts, bash_cmd, mem_mb=256, cpus="1", timeout_s=3):
    base = [
        "docker","run","--rm",
        "--network","none",
        "--read-only",
        "--pids-limit","128",
        "--cpus",cpus,
        "--memory",f"{mem_mb}m",
        "--tmpfs","/tmp:rw,size=64m",
        "--cap-drop","ALL",
        "--init",
    ]

    for host, ctr, ro in mounts:
        base += ["-v", f"{os.path.abspath(host)}:{ctr}:{'ro' if ro else 'rw'}"]

    base += [RUNNER_IMAGE, "bash", "-lc", bash_cmd]

    return run_cmd(base, timeout_s)


def strip_lines(s, chars):
    lines = s.splitlines()
    stripped = [line.strip(chars) for line in lines]
    return "\n".join(stripped).strip(chars)


def judge(chal_dir, submission_cmd):
    chal = pathlib.Path(chal_dir)
    run_id = str(uuid.uuid4())[:8]
    work = pathlib.Path("artifacts")/run_id
    work.mkdir(parents=True, exist_ok=True)

    test_dir = chal / "tests" / "public"
    solution_files = sorted(test_dir.glob("solution_*.out"))

    if not solution_files:
        print(json.dumps({"error": "No solution files found (solution_*.out)"}))
        return

    all_results = []

    for solution_file in solution_files:
        # Extract test number from solution_N.out
        test_num = solution_file.stem.split('_')[1]
        setup_path = chal / f"setup_{test_num}.sh"

        # Run setup for this specific test case
        if setup_path.exists():
            rc, out, err, ms = docker_run(
                [(chal, "/challenge", True), (work, "/work", False)],
                f"cd /work && chmod +x /challenge/setup_{test_num}.sh 2>/dev/null || true && /challenge/setup_{test_num}.sh || true",
                timeout_s=10
            )
            (work/f"setup_{test_num}.log").write_bytes(out + err)

        # Build and run test command
        run = "cd /work && set -euo pipefail; set -o pipefail; "
        run += f"({submission_cmd}) > /work/stdout_{test_num}.txt"

        rc, out, err, ms = docker_run(
            [(chal, "/challenge", True), (work, "/work", False)],
            run,
            timeout_s=3
        )

        (work/f"run_{test_num}.stderr").write_bytes(err)
        (work/f"run_{test_num}.stdout").write_bytes(out)

        actual_path = work/f"stdout_{test_num}.txt"
        actual = actual_path.read_bytes() if actual_path.exists() else b""
        actual = actual.decode(errors='replace')
        actual = strip_lines(actual, " ")

        expected = solution_file.read_bytes()
        expected = expected.decode(errors='replace')
        expected = strip_lines(expected, " ")

        passed = (rc == 0 and actual == expected)

        test_result = {
            "test_num": test_num,
            "exit_code": rc,
            "elapsed_ms": ms,
            "pass": bool(passed),
            "stdout": actual,
            "expected": expected
        }
        all_results.append(test_result)

    summary = {
        "run_id": run_id,
        "total_tests": len(all_results),
        "passed": sum(1 for r in all_results if r["pass"]),
        "failed": sum(1 for r in all_results if not r["pass"]),
        "all_pass": all(r["pass"] for r in all_results),
        "results": all_results
    }
    (work/"summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("usage: run.py <challenge_dir> <submission_cmd>")
        sys.exit(1)
    judge(sys.argv[1], sys.argv[2])
