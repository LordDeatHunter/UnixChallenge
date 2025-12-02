from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import sys
import yaml
import pathlib
import uvicorn

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from worker.run import judge

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    chal_path = ROOT / "challenges" / req.challenge_id

    if not chal_path.exists():
        return JSONResponse(
            {"error": "Challenge not found"}, status_code=404
        )

    try:
        summary = judge(str(chal_path), req.cmd)

        if summary and "error" in summary:
            return JSONResponse(
                {"error": summary["error"]}, status_code=400
            )

        return JSONResponse({"summary": summary})

    except Exception as e:
        return JSONResponse(
            {"error": f"Internal error: {str(e)}"}, status_code=500
        )

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
