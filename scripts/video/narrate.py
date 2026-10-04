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


def main():
    import numpy as np
    import soundfile as sf
    import torch
    from huggingface_hub import hf_hub_download
    from kokoro import KModel, KPipeline

    parser = argparse.ArgumentParser()
    parser.add_argument("--script", required=True)
    parser.add_argument("--output-dir", required=True)
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

    def synthesize(speed):
        audio_parts, words = [], []
        offset = 0.0
        for result in pipeline(text, voice=files["voices/af_heart.pt"], speed=speed):
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

    audio, words, duration = synthesize(1.0)
    if not 30 <= duration <= 45:
        speed = max(0.80, min(1.20, duration / 37))
        audio, words, duration = synthesize(speed)
    if not 30 <= duration <= 45 or not words:
        raise ValueError(f"Narration duration {duration:.2f}s cannot fit 30–45s naturally")
    if not np.isfinite(audio).all() or float(np.sqrt(np.mean(audio ** 2))) < 0.005:
        raise ValueError("Narration audio is silent or invalid")
    sf.write(output / "audio.wav", audio, 24000, subtype="PCM_16")
    (output / "timing.json").write_text(json.dumps({"duration": duration, "sampleRate": 24000, "words": words}, indent=2), encoding="utf-8")
    print(f"Kokoro CPU narration: {duration:.2f}s, {len(words)} timed tokens")


if __name__ == "__main__":
    main()
