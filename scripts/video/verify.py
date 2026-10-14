"""Verify a real encoded video, timing coverage, and non-silent audio locally/CI."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess


def verify_pacing(manifest, timing, plan):
    if manifest["script"].get("version") != 3:
        return
    if not 35 <= manifest["duration"] <= 45:
        raise ValueError("New narration must last 35–45 seconds")
    clean = lambda text: "".join(re.findall(r"\w+", text.casefold()))
    words = timing["words"]
    entries = manifest["script"]["sentences"]
    offset, ranges = 0, []
    for entry in entries:
        start = offset
        offset += len(clean(entry["text"]))
        ranges.append((start, offset))
    cursor, spans = 0, []
    for word in words:
        beginning = cursor
        cursor += len(clean(word["text"]))
        spans.append((beginning, cursor, word["start"], word["end"]))
    hook_end = next(word[3] for word in spans if word[0] < ranges[0][1] <= word[1])
    if words[0]["start"] > 0.25 or hook_end > 4.025:
        raise ValueError("Hook must start immediately and finish within four seconds")
    if entries[-1]["role"] != "engagement" or not entries[-1]["text"].endswith("?"):
        raise ValueError("The final spoken line must be a question")
    if manifest["title"] != manifest["script"]["workingTitle"] or len(manifest["title"]) > 49:
        raise ValueError("Working title was changed")
    scenes = plan["scenes"]
    if not scenes or scenes[0]["start"] != 0 or abs(scenes[-1]["end"]-manifest["duration"]) > 0.025:
        raise ValueError("Visuals do not cover the complete video")
    previous = 0.0
    for scene in scenes:
        if abs(scene["start"]-previous) > 0.025 or not 0 < scene["end"]-scene["start"] <= 3.55:
            raise ValueError("Visual cue spacing or coverage is invalid")
        if scene.get("role") == "hook" and scene.get("sourceVisible") is not False:
            raise ValueError("The hook contains a source citation")
        previous = scene["end"]
    examples = [scene for scene in scenes if scene.get("role") == "breakthrough" and
                scene.get("visual") in ("example", "comparison")]
    if not examples or examples[0]["start"] > 8 or scenes[-1].get("role") != "engagement":
        raise ValueError("Early example or final question is missing")
    if manifest["script"]["format"] == "structured":
        impact = next(i for i, item in enumerate(entries) if item["role"] == "impact")
        impact_time = next(word[2] for word in spans if word[0] <= ranges[impact][0] < word[1])
        if impact != 4 or not 25 <= impact_time <= 27:
            raise ValueError("Structured breakthrough or impact timing is invalid")


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
    minimum = 35 if manifest["script"].get("version") == 3 else 30
    if not minimum <= duration <= 45 or abs(duration - manifest["duration"]) > 0.1:
        raise ValueError(f"Encoded duration is invalid: {duration}")
    if (video["width"], video["height"], video["codec_name"], video["pix_fmt"], video["r_frame_rate"]) != (1080, 1920, "h264", "yuv420p", "30/1"):
        raise ValueError("Encoded video dimensions, frame rate, or codec are invalid")
    if audio_stream["codec_name"] != "aac":
        raise ValueError("Encoded audio must be AAC")
    if (directory / manifest["videoFile"]).stat().st_size > 50 * 1024 * 1024:
        raise ValueError("Video exceeds the artifact/upload size budget")
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
    if manifest["script"].get("version") == 3:
        verify_pacing(manifest, timing, json.loads((directory / "storyboard.json").read_text(encoding="utf-8")))
    audio, sample_rate = sf.read(directory / "audio.wav")
    rms = float(np.sqrt(np.mean(audio ** 2)))
    if sample_rate != 24000 or not np.isfinite(audio).all() or rms < 0.005:
        raise ValueError("Narration audio is silent or invalid")
    print(f"Verified: {duration:.2f}s, 1080x1920 H.264/30fps + AAC; {len(words)} caption tokens; narration RMS {rms:.4f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", type=Path, required=True)
    verify(parser.parse_args().directory)
