"""
main.py — FastAPI Application (Backend Entry Point)
====================================================
Serves the frontend, handles file uploads, runs the analysis pipeline,
and exposes API endpoints for comparison data and PDF reports.

Run with:  uvicorn backend.main:app --reload
"""

import os
import uuid
from pathlib import Path
from itertools import combinations

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from backend.core.analyzer import fingerprint_source, compare_fingerprints
from backend.core.zip_handler import extract_zip, create_temp_dir, cleanup_temp_dir
from backend.core.report_gen import generate_pdf_report

# ─────────────────────────────────────────────
#  App & State
# ─────────────────────────────────────────────

app = FastAPI(title="Structural Plagiarism Checker")

# Resolve paths relative to THIS file's parent (project root)
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

# Mount static assets (CSS, JS)
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR / "static")), name="static")

# In-memory store for the latest analysis session
_session: dict = {}


# ─────────────────────────────────────────────
#  Page Routes (serve HTML)
# ─────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index_page():
    return (FRONTEND_DIR / "index.html").read_text(encoding="utf-8")


@app.get("/compare", response_class=HTMLResponse)
async def compare_page():
    return (FRONTEND_DIR / "compare.html").read_text(encoding="utf-8")


# ─────────────────────────────────────────────
#  API — Upload & Analyze
# ─────────────────────────────────────────────

@app.post("/api/upload")
async def upload_files(files: list[UploadFile] = File(...)):
    """
    Accepts multiple .py files OR a single .zip archive.
    Runs the full analysis pipeline and stores results in memory.
    """
    global _session
    temp_dir = create_temp_dir()

    try:
        py_paths: list[str] = []

        for f in files:
            dest = os.path.join(temp_dir, f.filename)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            content = await f.read()
            with open(dest, "wb") as fh:
                fh.write(content)

            if f.filename.endswith(".zip"):
                # Extract zip into a sub-folder
                zip_extract_dir = os.path.join(temp_dir, f.filename + "_extracted")
                os.makedirs(zip_extract_dir, exist_ok=True)
                py_paths.extend(extract_zip(dest, zip_extract_dir))
            elif f.filename.endswith(".py"):
                py_paths.append(dest)

        if len(py_paths) < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 .py files to compare.")

        # ── Read sources & fingerprint ──
        sources: dict[str, str] = {}
        fingerprints: dict[str, dict] = {}

        for p in py_paths:
            name = os.path.basename(p)
            # handle duplicate basenames by appending a short id
            if name in sources:
                name = f"{Path(p).stem}_{uuid.uuid4().hex[:4]}{Path(p).suffix}"
            with open(p, encoding="utf-8") as fh:
                src = fh.read()
            sources[name] = src
            fp, _ = fingerprint_source(src)
            fingerprints[name] = fp

        # ── Pairwise comparison ──
        file_names = list(sources.keys())
        results: list[dict] = []
        for a, b in combinations(file_names, 2):
            cr = compare_fingerprints(fingerprints[a], fingerprints[b], a, b)
            results.append({
                "file_a": cr.file_a,
                "file_b": cr.file_b,
                "similarity": cr.similarity,
                "matched_lines_a": cr.matched_lines_a,
                "matched_lines_b": cr.matched_lines_b,
            })

        results.sort(key=lambda r: r["similarity"], reverse=True)

        # Store for later /compare and /report queries
        _session = {
            "sources": sources,
            "fingerprints": fingerprints,
            "results": results,
            "file_names": file_names,
        }

        return JSONResponse({"status": "ok", "results": results, "files": file_names})

    finally:
        cleanup_temp_dir(temp_dir)


# ─────────────────────────────────────────────
#  API — Side-by-Side Comparison Data
# ─────────────────────────────────────────────

@app.get("/api/compare")
async def compare_files(file_a: str = Query(...), file_b: str = Query(...)):
    """Return source code and matched line ranges for two files."""
    if not _session:
        raise HTTPException(status_code=400, detail="No analysis session. Upload files first.")

    sources = _session["sources"]
    if file_a not in sources or file_b not in sources:
        raise HTTPException(status_code=404, detail="File not found in current session.")

    # Find the pre-computed result for this pair
    pair = None
    for r in _session["results"]:
        if {r["file_a"], r["file_b"]} == {file_a, file_b}:
            pair = r
            break

    if pair is None:
        # Compute on-the-fly (shouldn't happen if UI is correct)
        fp_a = _session["fingerprints"][file_a]
        fp_b = _session["fingerprints"][file_b]
        cr = compare_fingerprints(fp_a, fp_b, file_a, file_b)
        pair = {
            "file_a": cr.file_a,
            "file_b": cr.file_b,
            "similarity": cr.similarity,
            "matched_lines_a": cr.matched_lines_a,
            "matched_lines_b": cr.matched_lines_b,
        }

    return {
        "source_a": sources[file_a],
        "source_b": sources[file_b],
        "similarity": pair["similarity"],
        "matched_lines_a": pair["matched_lines_a"],
        "matched_lines_b": pair["matched_lines_b"],
    }


# ─────────────────────────────────────────────
#  API — PDF Report Download
# ─────────────────────────────────────────────

@app.get("/api/report")
async def download_report(file_a: str = Query(...), file_b: str = Query(...)):
    """Generate and return a PDF plagiarism report."""
    if not _session:
        raise HTTPException(status_code=400, detail="No analysis session.")

    sources = _session["sources"]
    if file_a not in sources or file_b not in sources:
        raise HTTPException(status_code=404, detail="File not found.")

    pair = None
    for r in _session["results"]:
        if {r["file_a"], r["file_b"]} == {file_a, file_b}:
            pair = r
            break

    if not pair:
        raise HTTPException(status_code=404, detail="Comparison not found.")

    pdf_bytes = generate_pdf_report(
        file_a=pair["file_a"],
        file_b=pair["file_b"],
        similarity=pair["similarity"],
        matched_lines_a=pair["matched_lines_a"],
        matched_lines_b=pair["matched_lines_b"],
        source_a=sources.get(file_a, ""),
        source_b=sources.get(file_b, ""),
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{file_a}_vs_{file_b}.pdf"},
    )


# ─────────────────────────────────────────────
#  API — Similarity Matrix / Graph Data
# ─────────────────────────────────────────────

@app.get("/api/matrix")
async def similarity_matrix():
    """
    Returns nodes (files) and edges (similarity pairs) for the
    network-graph visualization on the frontend.
    """
    if not _session:
        raise HTTPException(status_code=400, detail="No analysis session.")

    nodes = [{"id": f, "label": f} for f in _session["file_names"]]
    edges = [
        {
            "from": r["file_a"],
            "to": r["file_b"],
            "value": r["similarity"],
            "label": f'{r["similarity"]:.1f}%',
        }
        for r in _session["results"]
    ]
    return {"nodes": nodes, "edges": edges}
