"""Free CPU narration with Kokoro's predicted word timings (no ASR service)."""
import argparse
import json
import os
import re
from pathlib import Path

os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

MODEL_REPO = "hexgrad/Kokoro-82M"
MODEL_REVISION = "f3ff3571791e39611d31c381e3a41a3af07b4987"


def fit_narration(synthesize, script):
    """Fit small spoken blocks naturally; each gets at most one speed retry."""
    import numpy as np
    entries = script["sentences"]
    hook = entries[0]["text"]
    groups = [hook]
    if script["format"] == "structured":
        groups += [" ".join(item["text"] for item in entries[1:4]),
                   " ".join(item["text"] for item in entries[4:])]
    else:
        groups += [" ".join(item["text"] for item in entries[1:])]
    parts, words, offset = [], [], 0.0
    def take(speed, text):
        audio, timed, duration = synthesize(speed, text)
        # Keep a short breath before the first predicted phoneme, rather than
        # exporting the model's leading silence as an empty opening.
        trim = max(0, int((timed[0]["start"]-0.05) * 24000)) if timed else 0
        if trim:
            audio = audio[trim:]
            shift = trim / 24000
            timed = [{**word, "start": round(max(0, word["start"]-shift), 4),
                      "end": round(word["end"]-shift, 4)} for word in timed]
            duration -= shift
        return audio, timed, duration
    for index, text in enumerate(groups):
        audio, timed, duration = take(1.0, text)
        if index == 0:
            minimum, maximum, target = 0.0, 4.0, 3.7
        elif script["format"] == "structured" and index == 1:
            minimum, maximum, target = 25.1-offset, 26.7-offset, 25.8-offset
        else:
            minimum, maximum, target = 38.0-offset, 42.0-offset, 40.0-offset
        if not minimum <= duration <= maximum:
            speed = max(0.80, min(1.20, duration / max(0.1, target)))
            audio, timed, duration = take(speed, text)
        if index == 0 and duration > 4.025:
            raise ValueError("Hook cannot finish within four seconds naturally")
        if script["format"] == "structured" and index == 1 and not 25 <= offset + duration <= 26.9:
            raise ValueError(f"Breakthrough end {offset+duration:.2f}s cannot reach the 25–27s impact window naturally")
        for token in timed:
            words.append({**token, "start": round(offset+token["start"], 4),
                          "end": round(offset+token["end"], 4)})
        parts.append(audio)
        offset += duration
    if not 35 <= offset <= 45:
        raise ValueError(f"Narration duration {offset:.2f}s cannot fit 35–45s naturally")
    return np.concatenate(parts), words, offset


def main():
    import numpy as np
    import soundfile as sf
    import torch
    from huggingface_hub import hf_hub_download
    from kokoro import KModel, KPipeline

    parser = argparse.ArgumentParser()
    parser.add_argument("--script", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--script-json", help="Versioned script for measured section pacing")
    args = parser.parse_args()
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    text = Path(args.script).read_text(encoding="utf-8").strip()
    if not text or len(text) > 3000:
        raise ValueError("Narration is empty or too long")
    torch.set_num_threads(min(4, os.cpu_count() or 1))
    torch.manual_seed(0)
    files = {name: hf_hub_download(MODEL_REPO, name, revision=MODEL_REVISION)
             for name in ("config.json", "kokoro-v1_0.pth", "voices/af_heart.pt")}
    model = KModel(repo_id=MODEL_REPO, config=files["config.json"], model=files["kokoro-v1_0.pth"]).to("cpu").eval()
    pipeline = KPipeline(lang_code="a", repo_id=MODEL_REPO, model=model, device="cpu")

    def synthesize(speed, spoken_text=text):
        audio_parts, words = [], []
        offset = 0.0
        for result in pipeline(spoken_text, voice=files["voices/af_heart.pt"], speed=speed):
            audio = result.audio.detach().cpu().numpy()
            duration = len(audio) / 24000
            for token in result.tokens or []:
                start = getattr(token, "start_ts", None)
                end = getattr(token, "end_ts", None)
                if start is not None and end is not None and end > start:
                    words.append({"text": token.text, "start": round(offset + max(0, start), 4),
                                  "end": round(offset + min(duration, end), 4)})
                elif token.text.strip() and words and not re.search(r"\w", token.text):
                    # Punctuation can have no phoneme duration; retain it on its word.
                    words[-1]["text"] += token.text
                elif re.search(r"\w", token.text):
                    raise ValueError(f"Speech token has no usable timing: {token.text}")
            audio_parts.append(audio)
            offset += duration
        return np.concatenate(audio_parts), words, offset

    script = json.loads(Path(args.script_json).read_text(encoding="utf-8")) if args.script_json else None
    if script and script.get("version") == 3:
        if " ".join(item["text"] for item in script["sentences"]) != text:
            raise ValueError("Script JSON differs from spoken text")
        audio, words, duration = fit_narration(synthesize, script)
    else:
        audio, words, duration = synthesize(1.0)
        if not 30 <= duration <= 45:
            speed = max(0.80, min(1.20, duration / 37))
            audio, words, duration = synthesize(speed)
        if not 30 <= duration <= 45:
            raise ValueError(f"Narration duration {duration:.2f}s cannot fit 30–45s naturally")
    if not words:
        raise ValueError("Narration has no usable word timings")
    if not np.isfinite(audio).all() or float(np.sqrt(np.mean(audio ** 2))) < 0.005:
        raise ValueError("Narration audio is silent or invalid")
    sf.write(output / "audio.wav", audio, 24000, subtype="PCM_16")
    (output / "timing.json").write_text(json.dumps({"duration": duration, "sampleRate": 24000, "words": words}, indent=2), encoding="utf-8")
    print(f"Kokoro CPU narration: {duration:.2f}s, {len(words)} timed tokens")


if __name__ == "__main__":
    main()
