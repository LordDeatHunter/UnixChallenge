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

    # setup (best-effort)
    rc, out, err, ms = docker_run(
        [(chal, "/challenge", True), (work, "/work", False)],
        "cd /work && chmod +x /challenge/setup.sh 2>/dev/null || true && /challenge/setup.sh || true",
        timeout_s=10
    )
    (work/"setup.log").write_bytes(out + err)

    # build test command
    in_path = chal/"tests/public/001.in"
    exp_path = chal/"tests/public/001.out"
    run = "cd /work && set -euo pipefail; set -o pipefail; "
    if in_path.exists():
        # run += "cat /challenge/tests/public/001.in | (" + submission_cmd + ") > /work/stdout.txt"
        run += f"({submission_cmd}) < /challenge/tests/public/001.in > /work/stdout.txt"
    else:
        # run += "(" + submission_cmd + ") > /work/stdout.txt"
        run += f"({submission_cmd}) > /work/stdout.txt"

    rc, out, err, ms = docker_run(
        [(chal, "/challenge", True), (work, "/work", False)],
        run,
        timeout_s=3
    )

    (work/"run.stderr").write_bytes(err)
    (work/"run.stdout").write_bytes(out)

    actual_path = work/"stdout.txt"
    # read actual and strip spaces at start and end
    actual = actual_path.read_bytes() if actual_path.exists() else b""
    actual = actual.decode(errors='replace')
    actual = strip_lines(actual, " ")

    expected = exp_path.read_bytes()
    expected = expected.decode(errors='replace')
    expected = strip_lines(expected, " ")

    passed = (rc == 0 and actual == expected)

    summary = {
        "run_id": run_id,
        "exit_code": rc,
        "elapsed_ms": ms,
        "pass": bool(passed),
        "stdout": actual,
        "expected": expected
    }
    (work/"summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("usage: run.py <challenge_dir> <submission_cmd>")
        sys.exit(1)
    judge(sys.argv[1], sys.argv[2])
