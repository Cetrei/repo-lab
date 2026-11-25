"""Packs the Python side for the browser: `apps/web/public/py/bundle.zip`.

The zip holds `repo_core`, `repo_api` and the YAML tables under `data/`. Pyodide unpacks it into its
virtual file system and sets REPO_DATA_DIR, so the engines read the same files that the tests read.
The output is deterministic (fixed timestamps, sorted entries), so rebuilding does not change it.
"""

from __future__ import annotations

import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "apps" / "web" / "public" / "py" / "bundle.zip"
FIXED_TIME = (2026, 1, 1, 0, 0, 0)

SOURCES = (
    (ROOT / "libs" / "repo_core" / "src" / "repo_core", "repo_core", "*.py"),
    (ROOT / "apps" / "api" / "src" / "repo_api", "repo_api", "*.py"),
    (ROOT / "data", "data", "*.yaml"),
)
# The HTTP adapter needs FastAPI, which the browser does not have and does not use.
SKIP = {"repo_api/http.py"}


def entries() -> list[tuple[Path, str]]:
    found: list[tuple[Path, str]] = []
    for folder, prefix, pattern in SOURCES:
        for path in sorted(folder.rglob(pattern)):
            if "__pycache__" in path.parts:
                continue
            name = f"{prefix}/{path.relative_to(folder).as_posix()}"
            if name not in SKIP:
                found.append((path, name))
    return found


def build() -> int:
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    files = entries()
    with zipfile.ZipFile(TARGET, "w", zipfile.ZIP_DEFLATED) as bundle:
        for path, name in files:
            info = zipfile.ZipInfo(name, FIXED_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            bundle.writestr(info, path.read_bytes())
    print(f"packed {len(files)} files into {TARGET.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(build())
