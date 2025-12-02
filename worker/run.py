import os
import sys
import json
import time
import uuid
import pathlib
import docker

RUNNER_IMAGE = "unixchallenge-runner:latest"



def docker_setup(file_to_copy, volume_name, mem_mb=512, cpus="1", timeout_s=10):
    client = docker.from_env()
    host, remote = file_to_copy

    start = time.time()
    container = None

    try:
        container = client.containers.run(
            RUNNER_IMAGE,
            command=["bash", "-lc", "/setup.sh"],
            volumes={
                volume_name: {'bind': '/work', 'mode': 'rw'},
                os.path.abspath(host): {'bind': '/setup.sh', 'mode': 'ro'}
            },
            network_mode='none',
            pids_limit=128,
            cpu_quota=int(float(cpus) * 100_000),
            cpu_period=100_000,
            mem_limit=f"{mem_mb}m",
            tmpfs={'/tmp': 'rw,size=64m'},
            cap_drop=['ALL'],
            working_dir='/work',
            init=True,
            remove=False,
            detach=True,
            stdout=True,
            stderr=True,
        )

        result = container.wait(timeout=timeout_s)
        elapsed_ms = int((time.time() - start) * 1000)

        rc = result['StatusCode']
        out = container.logs(stdout=True, stderr=False)
        err = container.logs(stdout=False, stderr=True)

        container.remove()
        return rc, out, err, elapsed_ms

    except Exception as e:
        elapsed_ms = int((time.time() - start) * 1000)

        if container:
            try:
                container.kill()
                out = container.logs(stdout=True, stderr=False)
                err = container.logs(stdout=False, stderr=True)
                container.remove()

                if "timeout" in str(e).lower() or isinstance(e, TimeoutError):
                    return 124, out, b"TIMEOUT\n" + err, elapsed_ms
                else:
                    return 1, out, err, elapsed_ms
            except Exception:
                pass

        return 1, b"", str(e).encode(), elapsed_ms
    finally:
        client.close()


def docker_run(mounts, bash_cmd, volume_name=None, mem_mb=256, cpus="1", timeout_s=3):
    client = docker.from_env()

    volumes = {}
    for host, ctr, ro in mounts:
        volumes[os.path.abspath(host)] = {'bind': ctr, 'mode': 'ro' if ro else 'rw'}

    if volume_name:
        volumes[volume_name] = {'bind': '/work', 'mode': 'rw'}

    start = time.time()
    container = None

    try:
        container = client.containers.run(
            RUNNER_IMAGE,
            command=["bash", "-lc", bash_cmd],
            volumes=volumes,
            network_mode='none',
            read_only=True,
            pids_limit=128,
            cpu_quota=int(float(cpus) * 100000),
            cpu_period=100000,
            mem_limit=f"{mem_mb}m",
            tmpfs={'/tmp': 'rw,size=64m'},
            cap_drop=['ALL'],
            working_dir='/work',
            remove=False,
            detach=True,
            stdout=True,
            stderr=True,
        )

        result = container.wait(timeout=timeout_s)
        elapsed_ms = int((time.time() - start) * 1000)

        rc = result['StatusCode']
        out = container.logs(stdout=True, stderr=False)
        err = container.logs(stdout=False, stderr=True)

        container.remove()
        return rc, out, err, elapsed_ms

    except Exception as e:
        elapsed_ms = int((time.time() - start) * 1000)

        if container:
            try:
                container.kill()
                out = container.logs(stdout=True, stderr=False)
                err = container.logs(stdout=False, stderr=True)
                container.remove()

                if "timeout" in str(e).lower() or isinstance(e, TimeoutError):
                    return 124, out, b"TIMEOUT\n" + err, elapsed_ms
                else:
                    return 1, out, err, elapsed_ms
            except Exception:
                pass

        return 1, b"", str(e).encode(), elapsed_ms
    finally:
        client.close()


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

        client = docker.from_env()
        try:
            volume = client.volumes.create(name=volume_name)
        except Exception as e:
            print(json.dumps({"error": f"Failed to create volume: {str(e)}"}))
            continue
        finally:
            client.close()

        try:
            rc, out, err, ms = docker_setup((setup_path, f"setup_{test_num}.sh"), volume_name)
            (current_test_dir/f"setup_{test_num}.log").write_bytes(out + err)

            run = f"set -euo pipefail; set -o pipefail; {submission_cmd}"

            rc, out, err, ms = docker_run(
                [],
                run,
                volume_name=volume_name,
                timeout_s=1
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
            client = docker.from_env()
            try:
                volume = client.volumes.get(volume_name)
                volume.remove()
            except Exception:
                pass
            finally:
                client.close()

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
