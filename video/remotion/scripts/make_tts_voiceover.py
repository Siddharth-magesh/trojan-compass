"""Synthetic voiceover (macOS `say`) from video/voiceover_script.md, fitted to each scene and mixed onto the silent final cut.
Usage (repo root): python3 video/remotion/scripts/make_tts_voiceover.py [--voice Samantha]
Writes public/audio/voiceover/sNN.aiff, and renders/final/trojan_compass_demo_voiceover.mp4 (video stream copied, not re-encoded).
"""

import argparse
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VIDEO = ROOT.parent
SCRIPT = VIDEO / "voiceover_script.md"
OUT = ROOT / "public" / "audio" / "voiceover"
SILENT = VIDEO / "renders" / "final" / "trojan_compass_demo.mp4"
FINAL = VIDEO / "renders" / "final" / "trojan_compass_demo_voiceover.mp4"
FPS, FADE = 30, 12
FRAMES = [300, 300, 240, 720, 660, 540, 540, 540, 540, 300, 570]  # must match src/config/timeline.ts
LEAD_IN_S, TAIL_S = 0.35, 0.35


def scene_windows() -> list[tuple[float, float]]:
    starts, t = [], 0
    for f in FRAMES:
        starts.append(t)
        t += f - FADE
    end = (sum(FRAMES) - FADE * (len(FRAMES) - 1)) / FPS
    bounds = [s / FPS for s in starts] + [end]
    return [(bounds[i] + LEAD_IN_S, bounds[i + 1] - TAIL_S) for i in range(len(FRAMES))]


def lines() -> list[str]:
    text = SCRIPT.read_text(encoding="utf-8").split("## Plain read-through")[0]
    out = [m.group(1) for m in re.finditer(r"^> (.+)$", text, re.M)]
    return [re.sub(r"\s+", " ", l.replace("**", "").replace(" / ", ", ").replace("/", "")).strip() for l in out]


def duration(path: Path) -> float:
    res = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True)
    return float(res.stdout)


def synth(text: str, path: Path, voice: str, budget: float) -> tuple[int, float]:
    rate = 178
    for _ in range(8):  # speed up gently until the line fits its scene (natural range 170-215 wpm)
        subprocess.run(["say", "-v", voice, "-r", str(rate), "-o", str(path), text], check=True)
        d = duration(path)
        if d <= budget or rate >= 215:
            return rate, d
        rate = min(215, int(rate * d / budget) + 2)
    return rate, d


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="Samantha")
    voice = ap.parse_args().voice
    OUT.mkdir(parents=True, exist_ok=True)
    texts, windows = lines(), scene_windows()
    assert len(texts) == len(windows), f"{len(texts)} script lines for {len(windows)} scenes"
    inputs, filters = ["-i", str(SILENT)], []
    for i, (text, (start, end)) in enumerate(zip(texts, windows), 1):
        path = OUT / f"s{i:02d}.aiff"
        rate, d = synth(text, path, voice, end - start)
        flag = "" if d <= end - start else "  (over by %.1fs)" % (d - (end - start))
        print(f"s{i:02d} start {start:6.2f}s  {d:5.2f}s of {end - start:5.2f}s  rate {rate}{flag}")
        inputs += ["-i", str(path)]
        ms = int(start * 1000)
        filters.append(f"[{i}:a]aresample=48000,adelay={ms}|{ms}[a{i}]")
    mix = "".join(f"[a{i}]" for i in range(1, len(texts) + 1))
    filters.append(f"{mix}amix=inputs={len(texts)}:normalize=0,loudnorm=I=-16:TP=-1.5,apad[vo]")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filters),
                    "-map", "0:v", "-map", "[vo]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(FINAL)], check=True)
    print(f"wrote {FINAL}")


if __name__ == "__main__":
    main()
