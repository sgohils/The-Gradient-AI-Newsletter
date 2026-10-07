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


def spoken_text(text, pronunciations):
    pattern = r"\b(?:" + "|".join(re.escape(term) for term in sorted(pronunciations, key=len, reverse=True)) + r")\b"
    return re.sub(pattern, lambda match: pronunciations[match.group()], text)


def restore_pronunciations(words, pronunciations):
    mappings = sorted(pronunciations.items(), key=lambda item: len(item[1].split()), reverse=True)
    restored, index = [], 0
    while index < len(words):
        for original, expansion in mappings:
            expected = expansion.casefold().split()
            group = words[index:index + len(expected)]
            actual = [re.sub(r"[^\w]", "", word["text"]).casefold() for word in group]
            if actual == expected:
                punctuation = re.search(r"[^\w]+$", group[-1]["text"])
                restored.append({"text": original + (punctuation.group() if punctuation else ""), "start": group[0]["start"], "end": group[-1]["end"]})
                index += len(expected)
                break
        else:
            restored.append(words[index])
            index += 1
    return restored


def main():
    import numpy as np
    import soundfile as sf
    import torch
    from huggingface_hub import hf_hub_download
    from kokoro import KModel, KPipeline

    parser = argparse.ArgumentParser()
    parser.add_argument("--script", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--profile", choices=("legacy", "standard", "simple"), default="legacy")
    args = parser.parse_args()
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    text = Path(args.script).read_text(encoding="utf-8").strip()
    pronunciations = {} if args.profile == "legacy" else json.loads(Path("assets/video/pronunciations.json").read_text(encoding="utf-8"))
    speech = spoken_text(text, pronunciations) if pronunciations else text
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
        for result in pipeline(speech, voice=files["voices/af_heart.pt"], speed=speed):
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
        return np.concatenate(audio_parts), restore_pronunciations(words, pronunciations), offset

    minimum, maximum, target = {"legacy": (30, 45, 37), "standard": (25, 30, 28), "simple": (18, 24, 21)}[args.profile]
    audio, words, duration = synthesize(1.0)
    if not minimum <= duration <= maximum:
        speed = max(0.80, min(1.20, duration / target))
        audio, words, duration = synthesize(speed)
    if not minimum <= duration <= maximum or not words:
        raise ValueError(f"Narration duration {duration:.2f}s cannot fit {minimum}–{maximum}s naturally")
    if not np.isfinite(audio).all() or float(np.sqrt(np.mean(audio ** 2))) < 0.005:
        raise ValueError("Narration audio is silent or invalid")
    sf.write(output / "audio.wav", audio, 24000, subtype="PCM_16")
    (output / "timing.json").write_text(json.dumps({"duration": duration, "sampleRate": 24000, "words": words, "profile": args.profile}, indent=2), encoding="utf-8")
    print(f"Kokoro CPU narration: {duration:.2f}s, {len(words)} timed tokens")


if __name__ == "__main__":
    main()
