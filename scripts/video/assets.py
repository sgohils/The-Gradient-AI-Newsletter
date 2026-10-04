"""Measured typography and original graphics; no paid or scraped images."""
import argparse
import json
import os
import re
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def wrap(text, font, width):
    lines, line = [], ""
    for word in text.split():
        if font.getlength(word) > width:
            raise ValueError("Headline contains a word too wide to render safely")
        candidate = f"{line} {word}".strip()
        if font.getlength(candidate) <= width:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()
    output = Path(args.output_dir)
    story = json.loads((output / "story.json").read_text(encoding="utf-8"))
    windows = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts"
    body_candidates = [Path(os.environ.get("VIDEO_BODY_FONT", "")), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"), windows / "arial.ttf"]
    headline_candidates = [Path(os.environ.get("VIDEO_HEADLINE_FONT", "")), Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"), windows / "georgia.ttf"]
    body = next((p for p in body_candidates if p.is_file()), None)
    headline = next((p for p in headline_candidates if p.is_file()), None)
    if body is None or headline is None:
        raise RuntimeError("Install DejaVu fonts or set VIDEO_BODY_FONT and VIDEO_HEADLINE_FONT")
    fonts = output / "fonts"
    fonts.mkdir(exist_ok=True)
    shutil.copyfile(body, fonts / "body.ttf")
    shutil.copyfile(headline, fonts / "headline.ttf")
    # libass uses the internal font family, which differs on Windows.
    body_family = ImageFont.truetype(str(body), 52).getname()[0]
    ass_path = output / "captions.ass"
    ass_path.write_text(ass_path.read_text(encoding="utf-8").replace("DejaVu Sans", body_family), encoding="utf-8")
    caption_font = ImageFont.truetype(str(body), 52)
    for event in ass_path.read_text(encoding="utf-8").splitlines():
        if event.startswith("Dialogue:"):
            text = re.sub(r"\{[^}]*\}", "", event.split(",", 9)[9])
            # Leave room for bold synthesis, outline, and platform controls.
            if any(caption_font.getlength(line) * 1.1 > 740 for line in text.split(r"\N")):
                raise ValueError("Caption cannot fit the mobile safe area")

    paper, ink, green, muted = "#f6f5f1", "#202421", "#176b5b", "#555c57"
    image = Image.new("RGB", (1080, 1920), paper)
    draw = ImageDraw.Draw(image)
    small = ImageFont.truetype(str(body), 28)
    label = ImageFont.truetype(str(body), 24)
    draw.rectangle((96, 185, 103, 223), fill=green)
    draw.text((122, 186), "AI / DAILY BRIEF", font=small, fill=ink)
    draw.text((96, 246), story["issueDate"], font=label, fill=muted)
    draw.line((96, 284, 876, 284), fill="#d9dcd5", width=2)
    for size in (64, 60, 56, 52, 48, 44, 40, 36):
        font = ImageFont.truetype(str(headline), size)
        lines = wrap(story["title"], font, 780)
        if len(lines) * (size + 14) <= 230:
            break
    else:
        raise ValueError("Headline cannot fit the mobile safe area")
    draw.multiline_text((96, 316), "\n".join(lines), font=font, fill=ink, spacing=14)
    draw.text((96, 1436), "SOURCE", font=label, fill=green)
    source_lines = wrap(story["sourceHost"], small, 780)
    if len(source_lines) > 2:
        raise ValueError("Source hostname cannot fit the safe area")
    draw.multiline_text((96, 1473), "\n".join(source_lines), font=small, fill=muted, spacing=6)
    image.save(output / "card.png")
    (output / "layout.json").write_text(json.dumps({"headlineFontSize": size, "headlineLines": lines, "captionCenter": [482, 1290], "safeRight": 876,
        "graphicsBounds": [96, 570, 876, 1130]}, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
