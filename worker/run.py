import os
import sys
import json
import time
import uuid
import pathlib
import docker
import logging
import asyncio

RUNNER_IMAGE = "unixchallenge-runner:latest"

logger = logging.getLogger("uvicorn")


def get_docker_client():
    try:
        return docker.from_env()
    except Exception as e:
        error_msg = str(e)
        if "CreateFile" in error_msg or "FileNotFoundError" in error_msg or "Cannot connect to Docker" in error_msg:
            raise RuntimeError("Docker is not running or not accessible.")
        raise


def docker_setup(file_to_copy, volume_name, mem_mb=512, cpus="1", timeout_s=10):
    client = get_docker_client()
    host, remote = file_to_copy

    setup_content = pathlib.Path(host).read_bytes()
    setup_content = setup_content.replace(b'\r\n', b'\n')
    
    temp_setup = pathlib.Path(host).parent / f".{pathlib.Path(host).name}.tmp"
    temp_setup.write_bytes(setup_content)

    start = time.time()
    container = None

    try:
        container = client.containers.run(
            RUNNER_IMAGE,
            command=["bash", "-lc", "/setup.sh"],
            volumes={
                volume_name: {'bind': '/work', 'mode': 'rw'},
                os.path.abspath(str(temp_setup)): {'bind': '/setup.sh', 'mode': 'ro'}
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
        if temp_setup.exists():
            temp_setup.unlink()


def docker_run(mounts, bash_cmd, volume_name=None, mem_mb=256, cpus="1", timeout_s=3):
    client = get_docker_client()
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


async def judge(chal_dir, submission_cmd):
    chal = pathlib.Path(chal_dir)
    run_id = str(uuid.uuid4())[:8]
    work = pathlib.Path("artifacts")/run_id
    work.mkdir(parents=True, exist_ok=True)

    test_dir = chal / "tests" / "public"
    solution_files = sorted(test_dir.glob("solution_*.out"))

    if not solution_files:
        return {"error": "No solution files found (solution_*.out)"}

    all_results = []

    for solution_file in solution_files:
        test_num = solution_file.stem.split('_')[1]
        setup_path = test_dir / f"setup_{test_num}.sh"

        if not setup_path.exists():
            logger.error(f"Missing setup script for test {test_num}")
            continue

        current_test_dir = work / f"test_{test_num}"
        current_test_dir.mkdir(parents=True, exist_ok=True)

        volume_name = f"leetunix_test_{run_id}_{test_num}"

        client = get_docker_client()
        try:
            volume = client.volumes.create(name=volume_name)
        except Exception as e:
            logger.error(f"Failed to create volume: {str(e)}")
            return {"error": f"Failed to create volume: {str(e)}"}
        finally:
            client.close()

        try:
            rc, out, err, ms = await asyncio.to_thread(
                docker_setup, (setup_path, f"setup_{test_num}.sh"), volume_name
            )
            (current_test_dir/f"setup_{test_num}.log").write_bytes(out + err)

            run = f"set -euo pipefail; set -o pipefail; {submission_cmd}"

            rc, out, err, ms = await asyncio.to_thread(
                docker_run, [], run, volume_name, timeout_s=1
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
            client = get_docker_client()
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
    return summary


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("usage: run.py <challenge_dir> <submission_cmd>")
        sys.exit(1)
    result = asyncio.run(judge(sys.argv[1], sys.argv[2]))
    print(json.dumps(result, indent=2))
