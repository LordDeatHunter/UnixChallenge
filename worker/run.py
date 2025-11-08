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


def docker_setup(file_to_copy, volume_name, mem_mb=512, cpus="1", timeout_s=10):
    base = [
        "docker","run","--rm",
        "--network","none",
        "--pids-limit","128",
        "--cpus",cpus,
        "--memory",f"{mem_mb}m",
        "--tmpfs","/tmp:rw,size=64m",
        "--cap-drop","ALL",
        "--workdir","/work",
        "--init",
    ]

    host, remote = file_to_copy

    base += ["-v", f"{volume_name}:/work"]
    base += ["-v", f"{os.path.abspath(host)}:/setup.sh:ro"]

    base += [RUNNER_IMAGE, "bash", "-lc", f"/setup.sh"]

    return run_cmd(base, timeout_s)


def docker_run(mounts, bash_cmd, volume_name=None, mem_mb=256, cpus="1", timeout_s=3):
    base = [
        "docker","run","--rm",
        "--network","none",
        "--read-only",
        "--pids-limit","128",
        "--cpus",cpus,
        "--memory",f"{mem_mb}m",
        "--tmpfs","/tmp:rw,size=64m",
        "--cap-drop","ALL",
        "--workdir","/work",
    ]

    for host, ctr, ro in mounts:
        base += ["-v", f"{os.path.abspath(host)}:{ctr}:{'ro' if ro else 'rw'}"]

    if volume_name:
        base += ["-v", f"{volume_name}:/work"]

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
        test_num = solution_file.stem.split('_')[1]
        setup_path = test_dir / f"setup_{test_num}.sh"

        if not setup_path.exists():
            print(json.dumps({"error": f"Missing setup script for test {test_num}"}))
            continue

        current_test_dir = work / f"test_{test_num}"
        current_test_dir.mkdir(parents=True, exist_ok=True)

        volume_name = f"leetunix_test_{run_id}_{test_num}"
        subprocess.run(["docker", "volume", "create", volume_name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        try:
            rc, out, err, ms = docker_setup((setup_path, f"setup_{test_num}.sh"), volume_name)
            (current_test_dir/f"setup_{test_num}.log").write_bytes(out + err)

            run = f"set -euo pipefail; set -o pipefail; {submission_cmd}"

            rc, out, err, ms = docker_run(
                [],
                run,
                volume_name=volume_name,
                timeout_s=3
            )

            (current_test_dir/f"run_{test_num}.stderr").write_bytes(err)
            (current_test_dir/f"run_{test_num}.stdout").write_bytes(out)

            actual = out.decode(errors='replace')
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
                "stderr": err.decode(errors='replace')[:1000],
                "expected": expected
            }
            all_results.append(test_result)
        finally:
            subprocess.run(["docker", "volume", "rm", volume_name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

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
