"""Real-media Shorts: one FFmpeg encode, licensed assets and readable overlays."""
import argparse
import json
import os
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps


def wrap(text, font, width):
    lines, line = [], ""
    for word in text.split():
        trial = (line + " " + word).strip()
        if font.getlength(trial) > width and line:
            lines.append(line)
            line = word
        else:
            line = trial
    if line:
        lines.append(line)
    return lines


def overlay(scene, output, index):
    image = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    font_file = output / "fonts/caption.ttf"
    # A gradient protects the text while keeping the photograph full screen.
    for y in range(1920):
        alpha = max(0, int(170 * (1 - y / 900))) if y < 900 else max(0, int(160 * (y - 1000) / 920))
        draw.line((0, y, 1080, y), fill=(8, 17, 15, alpha))
    small = ImageFont.truetype(str(font_file), 28)
    draw.text((80, 160), "THE GRADIENT", font=small, fill=(180, 239, 203, 255))
    text = scene["displayText"]
    for size in (88, 80, 72, 64, 56):
        font = ImageFont.truetype(str(font_file), size)
        lines = wrap(text, font, 770)
        if len(lines) <= 3 and all(font.getlength(line) <= 770 for line in lines):
            break
    else:
        raise ValueError("Headline cannot fit the mobile safe area")
    y = 252
    for line in lines:
        draw.text((80, y), line, font=font, fill="white", stroke_width=2, stroke_fill=(12, 28, 22, 255))
        y += size + 12
    draw.rounded_rectangle((80, y + 12, 205, y + 20), radius=4, fill=(180, 239, 203, 255))
    if scene.get("callout") and scene["kind"] != "headline":
        number = ImageFont.truetype(str(font_file), 68)
        box = draw.textbbox((0, 0), scene["callout"], font=number)
        draw.rounded_rectangle((80, 680, min(860, 120 + box[2]), 790), radius=20, fill=(14, 42, 32, 235))
        draw.text((100, 694), scene["callout"], font=number, fill=(180, 239, 203, 255))
    draw.text((80, 1490), "ILLUSTRATIVE VISUAL" if scene.get("illustrative") else "SOURCE VISUAL", font=small,
              fill=(225, 233, 226, 255), stroke_width=1, stroke_fill=(12, 28, 22, 255))
    file = output / f"overlay-{index:02d}.png"
    image.save(file)
    return file.name, {"fontSize": size, "lines": lines, "bounds": [80, 252, 860, y]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--video-file", default="video.mp4")
    parser.add_argument("--simple", action="store_true")
    parser.add_argument("--preview-only", action="store_true")
    args = parser.parse_args()
    output = args.output_dir.resolve()
    plan = json.loads((output / "storyboard.json").read_text(encoding="utf-8"))
    if plan["version"] != 5 or args.video_file != "video.mp4":
        raise ValueError("Unexpected photo storyboard or output")
    assets = {asset["id"]: asset for asset in plan["assets"]}
    command = [args.ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-filter_complex_threads", "1"]
    filters, layouts, input_index = [], [], 0
    for index, original_scene in enumerate(plan["scenes"]):
        scene = dict(original_scene)
        asset = assets[scene["assetId"]]
        if args.simple and asset["kind"] == "video":
            asset = next((item for item in assets.values() if item["kind"] == "photo"), None)
            if not asset:
                raise ValueError("Static recovery requires a licensed photograph")
            scene["assetId"] = asset["id"]
            plan["scenes"][index]["assetId"] = asset["id"]
        file = (output / asset["file"]).resolve()
        if output not in file.parents or not file.is_file():
            raise ValueError("Asset path escapes the output directory")
        scene["illustrative"] = asset["usage"] == "illustrative"
        duration = scene["end"] - scene["start"]
        overlay_file, layout = overlay(scene, output, index)
        layouts.append({**layout, "assetId": asset["id"], "start": scene["start"], "end": scene["end"]})
        preview = output / f"scene-{index + 1:02d}.png"
        if asset["kind"] == "photo":
            with Image.open(file) as original:
                if original.width * original.height > 40_000_000:
                    raise ValueError("Photo exceeds decode budget")
                bg = ImageOps.fit(original.convert("RGB"), (1080, 1920), method=Image.Resampling.LANCZOS).convert("RGBA")
            with Image.open(output / overlay_file) as decoration:
                bg.alpha_composite(decoration)
            bg.convert("RGB").save(preview)
            normalized = output / f"photo-{index:02d}.jpg"
            with Image.open(file) as original:
                ImageOps.fit(original.convert("RGB"), (1080, 1920), method=Image.Resampling.LANCZOS).save(normalized, quality=94)
            command += ["-loop", "1", "-framerate", "30", "-i", normalized.name]
            if args.simple:
                transform = f"scale=1080:1920,fps=30,trim=duration={duration:.6f},setpts=PTS-STARTPTS"
            else:
                frames = max(1, round(duration * 30))
                zoom = "1.04" if scene["motion"] != "push" else f"1.0+0.04*on/{frames}"
                x = f"(iw-iw/zoom)*on/{frames}" if scene["motion"] == "pan-right" else (
                    f"(iw-iw/zoom)*(1-on/{frames})" if scene["motion"] == "pan-left" else "iw/2-iw/zoom/2")
                transform = f"zoompan=z='{zoom}':x='{x}':y='ih/2-ih/zoom/2':d=1:s=1080x1920:fps=30,trim=duration={duration:.6f},setpts=PTS-STARTPTS"
        else:
            thumbnail = subprocess.run([args.ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(file),
                                        "-frames:v", "1", "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920", str(preview)],
                                       capture_output=True, timeout=30, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
            if thumbnail.returncode:
                raise ValueError("Footage cannot be decoded; retry with static photographs")
            with Image.open(preview) as original, Image.open(output / overlay_file) as decoration:
                bg = original.convert("RGBA")
                bg.alpha_composite(decoration)
                bg.convert("RGB").save(preview)
            command += ["-stream_loop", "-1", "-i", str(file)]
            transform = f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,trim=duration={duration:.6f},setpts=PTS-STARTPTS"
        command += ["-loop", "1", "-framerate", "30", "-i", overlay_file]
        filters += [f"[{input_index}:v]{transform},setsar=1[b{index}]",
                    f"[b{index}][{input_index + 1}:v]overlay=shortest=1,format=yuv420p[s{index}]"]
        input_index += 2
    command += ["-i", "audio.wav"]
    sequence = "".join(f"[s{index}]" for index in range(len(plan["scenes"])))
    filters += [f"{sequence}concat=n={len(plan['scenes'])}:v=1:a=0,scale=1080:1920:in_range=full:out_range=tv,format=yuv420p,subtitles=captions.ass:fontsdir=fonts[v]",
                f"[{input_index}:a]loudnorm=I=-16:TP=-1.5:LRA=11[a]"]
    (output / "photo-render.filter").write_text(";\n".join(filters), encoding="utf-8")
    (output / "graphics-layout.json").write_text(json.dumps({"version": 6, "scenes": layouts, "realVisualRatio": 1}, indent=2), encoding="utf-8")
    if args.simple:
        (output / "storyboard.json").write_text(json.dumps(plan, indent=2), encoding="utf-8")
    with Image.open(output / "scene-01.png") as first:
        first.save(output / "card.png")
    if args.preview_only:
        return
    command += ["-filter_complex", ";".join(filters), "-map", "[v]", "-map", "[a]", "-t", str(plan["duration"]),
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30",
                "-color_range", "tv", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-threads", "2", ".video-rendering.mp4"]
    result = subprocess.run(command, cwd=output, capture_output=True, text=True, timeout=600,
                            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    if result.returncode:
        raise RuntimeError("Photo rendering failed: " + result.stderr[-6000:])
    (output / ".video-rendering.mp4").replace(output / "video.mp4")
    print(f"Rendered {len(plan['scenes'])} real-media beats at 1080x1920/30fps")


if __name__ == "__main__":
    main()
