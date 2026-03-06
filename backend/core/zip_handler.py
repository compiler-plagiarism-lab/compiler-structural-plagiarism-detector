"""
zip_handler.py — Handles ZIP archive extraction and .py file discovery.
"""

import os
import zipfile
import tempfile
import shutil


def extract_zip(zip_path: str, dest_dir: str) -> list[str]:
    """
    Extract a ZIP archive into dest_dir and return a list of
    absolute paths to all .py files found inside.
    """
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(dest_dir)

    py_files: list[str] = []
    for root, _, files in os.walk(dest_dir):
        for f in files:
            if f.endswith(".py"):
                py_files.append(os.path.join(root, f))
    py_files.sort()
    return py_files


def create_temp_dir() -> str:
    """Create a temporary directory for storing uploaded files."""
    return tempfile.mkdtemp(prefix="plagiarism_")


def cleanup_temp_dir(path: str):
    """Remove a temporary directory and all its contents."""
    if os.path.exists(path):
        shutil.rmtree(path, ignore_errors=True)
