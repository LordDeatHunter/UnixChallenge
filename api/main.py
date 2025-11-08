from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import JSONResponse
import uvicorn, subprocess, json, os, pathlib

app = FastAPI()
ROOT = pathlib.Path(__file__).resolve().parents[1]

class SubmitReq(BaseModel):
    challenge_id: str
    cmd: str

@app.get("/challenges")
def challenges():
    out = []
    chal_dir = ROOT / "challenges"
    for d in chal_dir.iterdir():
        y = d / "challenge.yaml"
        if y.exists():
            title = ""
            try:
                # naive parse title
                for line in y.read_text().splitlines():
                    if line.startswith("title:"):
                        title = line.split(":",1)[1].strip().strip('"')
                        break
            except:
                pass
            out.append({"id": d.name, "title": title or d.name})
    return out

@app.post("/submit")
def submit(req: SubmitReq):
    cmd = [
        "python3",
        str(ROOT / "worker" / "run.py"),
        str(ROOT / "challenges" / req.challenge_id),
        req.cmd,
    ]

    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

        try:
            summary = json.loads(p.stdout or "{}")
        except Exception:
            summary = {"raw_stdout": p.stdout}

        run_id = summary.get("run_id")
        stdout_preview = ""
        stderr_preview = ""
        if run_id:
            stdout = ROOT / "artifacts" / run_id / "stdout.txt"
            stderr = ROOT / "artifacts" / run_id / "run.stderr"
            if stdout.exists():
                stdout_preview = stdout.read_text(errors="replace")[:10000]
            if stderr.exists():
                stderr_preview = stderr.read_text(errors="replace")[:10000]

        return JSONResponse(
            {
                "summary": summary,
                "stdout": stdout_preview,
                "stderr": stderr_preview,
                "worker_rc": p.returncode,
            }
        )
    except subprocess.TimeoutExpired:
        return JSONResponse(
            {"error": "judge timeout"}, status_code=504
        )

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
