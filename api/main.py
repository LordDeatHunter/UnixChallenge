from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import JSONResponse
import json
import yaml
import pathlib
import uvicorn
import subprocess

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
        if not y.exists():
            continue

        with y.open("r") as f:
            data = yaml.safe_load(f)
            title = data.get("title", "")
            description = data.get("description", "")

        out.append({"id": d.name, "title": title or d.name, "description": description or ""})
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

        return JSONResponse(
            {
                "summary": summary,
                "worker_rc": p.returncode,
            }
        )
    except subprocess.TimeoutExpired:
        return JSONResponse(
            {"error": "judge timeout"}, status_code=504
        )

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
