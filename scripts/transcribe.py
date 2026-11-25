#!/usr/bin/env python3
"""Transcribe a YouTube or Instagram video to plain text with timestamps.

    python3 scripts/transcribe.py URL_OR_ID [--out docs/transcripts] [--lang en] [--whisper]

Order of work:
1. Captions through yt-dlp (manual first, then automatic). Fast, no model needed.
2. If there are none, or --whisper is given, download the audio and run faster-whisper
   (`uv pip install faster-whisper`). Instagram and TikTok posts usually have no captions,
   so they always take this path.

Output: <out>/<video id>.txt, one line per caption group as `[mm:ss] text`, and a header with the
title, uploader, duration and source. Needs yt-dlp. ffmpeg is needed for the audio path only.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

YT_ARGS = ["--js-runtimes", "node", "--remote-components", "ejs:github"]
TAG = re.compile(r"<[^>]+>")
TIME = re.compile(r"(\d+):(\d{2}):(\d{2})\.\d+ --> ")


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, capture_output=True, text=True, check=False)


def normalize_url(value: str) -> str:
    if re.fullmatch(r"[\w-]{11}", value):
        return f"https://www.youtube.com/watch?v={value}"
    return value


def metadata(url: str) -> dict[str, Any]:
    proc = run(["yt-dlp", *YT_ARGS, "--skip-download", "--dump-single-json", url])
    if proc.returncode != 0 or not proc.stdout.strip():
        sys.exit(f"yt-dlp could not read {url}\n{proc.stderr[-800:]}")
    data: dict[str, Any] = json.loads(proc.stdout)
    return data


def clock(seconds: int) -> str:
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def vtt_to_lines(text: str) -> list[tuple[int, str]]:
    """Collapse the rolling duplicates of automatic captions into one entry per new sentence part."""
    lines: list[tuple[int, str]] = []
    start = 0
    last = ""
    for raw in text.splitlines():
        match = TIME.match(raw)
        if match:
            h, m, s = (int(g) for g in match.groups())
            start = h * 3600 + m * 60 + s
            continue
        if not raw.strip() or raw.startswith(("WEBVTT", "Kind:", "Language:", "NOTE")) or "-->" in raw:
            continue
        clean = TAG.sub("", raw).strip()
        if not clean or clean == last:
            continue
        lines.append((start, clean))
        last = clean
    return lines


def captions(url: str, lang: str, workdir: Path, vid: str) -> list[tuple[int, str]]:
    cmd = [
        "yt-dlp",
        *YT_ARGS,
        "--skip-download",
        "--write-subs",
        "--write-auto-subs",
        "--sub-langs",
        f"{lang},{lang}-orig",
        "--sub-format",
        "vtt",
        "-o",
        str(workdir / "%(id)s.%(ext)s"),
        url,
    ]
    run(cmd)
    files = sorted(workdir.glob(f"{vid}.{lang}*.vtt"), key=lambda p: ("orig" in p.name, p.name))
    for path in files:
        lines = vtt_to_lines(path.read_text(encoding="utf-8", errors="replace"))
        if lines:
            return lines
    return []


def whisper_lines(url: str, lang: str, workdir: Path, model: str) -> list[tuple[int, str]]:
    try:
        from faster_whisper import WhisperModel  # type: ignore[import-not-found]
    except ImportError:
        sys.exit("No captions found and faster-whisper is missing. Run: uv pip install faster-whisper")
    audio = workdir / "audio.m4a"
    proc = run(["yt-dlp", *YT_ARGS, "-f", "bestaudio", "-o", str(audio), url])
    if proc.returncode != 0 or not audio.exists():
        sys.exit(f"audio download failed\n{proc.stderr[-800:]}")
    engine = WhisperModel(model, compute_type="int8")
    segments, _ = engine.transcribe(str(audio), language=lang or None, vad_filter=True)
    return [(int(seg.start), seg.text.strip()) for seg in segments if seg.text.strip()]


def group(lines: list[tuple[int, str]], window: int = 15) -> list[tuple[int, str]]:
    """Merge short lines so each output row covers about `window` seconds."""
    rows: list[tuple[int, str]] = []
    for start, text in lines:
        if rows and start - rows[-1][0] < window:
            rows[-1] = (rows[-1][0], f"{rows[-1][1]} {text}")
        else:
            rows.append((start, text))
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("source", help="video URL or an 11 character YouTube id")
    parser.add_argument("--out", default="docs/transcripts")
    parser.add_argument("--lang", default="en")
    parser.add_argument("--whisper", action="store_true", help="skip captions and transcribe the audio")
    parser.add_argument("--model", default="small", help="faster-whisper model name")
    args = parser.parse_args()

    url = normalize_url(args.source)
    info = metadata(url)
    vid = info["id"]
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        lines = [] if args.whisper else captions(url, args.lang, work, vid)
        method = "captions"
        if not lines:
            lines = whisper_lines(url, args.lang, work, args.model)
            method = f"faster-whisper {args.model}"

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    header = [
        f"# {info.get('title', vid)}",
        f"source: {info.get('webpage_url', url)}",
        f"uploader: {info.get('uploader', '')}",
        f"duration: {info.get('duration_string', '')}",
        f"method: {method}",
        "",
    ]
    body = [f"[{clock(start)}] {text}" for start, text in group(lines)]
    target = out / f"{vid}.txt"
    target.write_text("\n".join(header + body) + "\n", encoding="utf-8")
    print(target)


if __name__ == "__main__":
    main()
