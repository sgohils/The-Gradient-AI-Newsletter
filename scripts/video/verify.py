"""Verify a real encoded video, timing coverage, and non-silent audio locally/CI."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess


def verify(directory):
    import numpy as np
    import soundfile as sf

    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    if manifest["status"] != "ready":
        raise ValueError("No finished video to verify")
    probe = subprocess.run([os.environ.get("VIDEO_FFPROBE", "ffprobe"), "-v", "error", "-show_format", "-show_streams",
                            "-of", "json", str(directory / manifest["videoFile"])], check=True, capture_output=True, text=True)
    info = json.loads(probe.stdout)
    video = next(s for s in info["streams"] if s["codec_type"] == "video")
    audio_stream = next(s for s in info["streams"] if s["codec_type"] == "audio")
    duration = float(info["format"]["duration"])
    profile = manifest.get("profile", "legacy") if manifest["script"].get("version") == 3 else "legacy"
    minimum, maximum = {"legacy": (30, 45), "standard": (25, 30), "simple": (18, 24)}[profile]
    if not minimum <= duration <= maximum or abs(duration - manifest["duration"]) > 0.1:
        raise ValueError(f"Encoded duration is invalid: {duration}")
    if (video["width"], video["height"], video["codec_name"], video["pix_fmt"], video["r_frame_rate"]) != (1080, 1920, "h264", "yuv420p", "30/1"):
        raise ValueError("Encoded video dimensions, frame rate, or codec are invalid")
    if audio_stream["codec_name"] != "aac":
        raise ValueError("Encoded audio must be AAC")
    if (directory / manifest["videoFile"]).stat().st_size > 50 * 1024 * 1024:
        raise ValueError("Video exceeds the artifact/upload size budget")
    if manifest["script"].get("version") == 3:
        import hashlib
        storyboard = json.loads((directory / "storyboard.json").read_text(encoding="utf-8"))
        assets = {asset["id"]: asset for asset in manifest.get("assets", [])}
        if len(assets) < 2 or storyboard.get("version") != 5:
            raise ValueError("Real visual provenance is missing")
        real_time = 0.0
        for scene in storyboard["scenes"]:
            asset = assets.get(scene.get("assetId"))
            if not asset:
                raise ValueError("Scene references missing media")
            file = (directory / asset["file"]).resolve()
            if directory.resolve() not in file.parents or not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest() != asset["sha256"]:
                raise ValueError("Media is missing or changed")
            real_time += scene["end"] - scene["start"]
        if real_time / duration < 0.70:
            raise ValueError("Real visuals cover less than 70 percent of the video")
    timing = json.loads((directory / "timing.json").read_text(encoding="utf-8"))
    words = timing["words"]
    previous = 0.0
    for word in words:
        if not word["text"] or word["start"] < previous - 0.025 or not 0 <= word["start"] < word["end"] <= duration:
            raise ValueError("Word timings overlap or fall outside the video")
        previous = word["end"]
    clean = lambda text: "".join(re.findall(r"\w+", text.casefold()))
    if clean(" ".join(w["text"] for w in words)) != clean(manifest["script"]["narration"]):
        raise ValueError("Captions omit or change narration words")
    audio, sample_rate = sf.read(directory / "audio.wav")
    rms = float(np.sqrt(np.mean(audio ** 2)))
    if sample_rate != 24000 or not np.isfinite(audio).all() or rms < 0.005:
        raise ValueError("Narration audio is silent or invalid")
    print(f"Verified: {duration:.2f}s, 1080x1920 H.264/30fps + AAC; {len(words)} caption tokens; narration RMS {rms:.4f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", type=Path, required=True)
    verify(parser.parse_args().directory)
