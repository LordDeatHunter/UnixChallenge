from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
import sys
import yaml
import pathlib
import uvicorn
import urllib.request
import urllib.error

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
            tags = data.get("tags", [])

        out.append({
            "id": d.name,
            "title": title or d.name,
            "description": description,
            "tags": tags
        })

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

@app.get("/cheatsheet/{query:path}")
def cheatsheet(query: str):
    try:
        url = f"https://cheat.sh/{query}"
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'curl/7.68.0'
            }
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            content = response.read().decode('utf-8')
            return PlainTextResponse(content)

    except urllib.error.HTTPError as e:
        if e.code == 404:
            return PlainTextResponse(
                "Command or topic not found. Try searching for a different term.",
                status_code=404
            )
        return PlainTextResponse(
            f"Failed to fetch documentation: HTTP {e.code}",
            status_code=e.code
        )
    except urllib.error.URLError as e:
        return PlainTextResponse(
            "Request timed out or failed. Please try again.",
            status_code=504
        )
    except Exception as e:
        return PlainTextResponse(
            f"Failed to fetch documentation: {str(e)}",
            status_code=500
        )

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
