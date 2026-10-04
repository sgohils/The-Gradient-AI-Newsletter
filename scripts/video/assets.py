"""Measured typography and original graphics; no paid or scraped images."""
import argparse
import json
import os
import re
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


CAPTION_WIDTH = 740  # 12px outline fits inside x=100..864 around x=482.
CAPTION_SIZES = range(52, 35, -2)


def caption_font_path(body):
    """Use the same bold face for measurement and libass when available."""
    family, style = ImageFont.truetype(str(body), 52).getname()
    if "bold" in style.lower():
        return body, 1.0
    for candidate in (body.with_name(body.stem + "-Bold.ttf"), body.with_name(body.stem + "bd.ttf")):
        if candidate.is_file():
            candidate_family, candidate_style = ImageFont.truetype(str(candidate), 52).getname()
            if candidate_family == family and "bold" in candidate_style.lower():
                return candidate, 1.0
    # Custom regular-only fonts need room for libass's synthesized bold.
    return body, 1.1


def fit_caption(text, font_path, metric_scale=1.0):
    """Balance at most two lines by pixels, then shrink without dropping words."""
    words = text.split()
    if not words:
        raise ValueError("Caption has no visible text")
    for size in CAPTION_SIZES:
        font = ImageFont.truetype(str(font_path), size)

        def width(line):
            bounds = font.getbbox(line)
            return max(font.getlength(line), bounds[2] - bounds[0]) * metric_scale

        full = " ".join(words)
        if width(full) <= CAPTION_WIDTH:
            return size, [full], [width(full)]
        candidates = []
        for split in range(1, len(words)):
            lines = [" ".join(words[:split]), " ".join(words[split:])]
            widths = [width(line) for line in lines]
            if max(widths) <= CAPTION_WIDTH:
                candidates.append((max(widths), abs(widths[0] - widths[1]), lines, widths))
        if candidates:
            _, _, lines, widths = min(candidates)
            return size, lines, widths
    raise ValueError("Caption cannot fit two lines in the mobile safe area at the minimum 36px font size")


def layout_captions(ass, font_path, metric_scale=1.0):
    """Keep event timings intact; replace provisional wrapping with measured text."""
    family = ImageFont.truetype(str(font_path), 52).getname()[0]
    output, layouts = [], []
    for line in ass.splitlines():
        if line.startswith("WrapStyle:"):
            line = "WrapStyle: 2"  # libass must respect our explicit line breaks.
        elif line.startswith("Style: Caption,"):
            fields = line.split(",")
            fields[1] = family
            line = ",".join(fields)
        elif line.startswith("Dialogue:"):
            fields = line.split(",", 9)
            if len(fields) != 10:
                raise ValueError("Malformed caption dialogue")
            text = re.sub(r"\{[^}]*\}", "", fields[9]).replace(r"\N", " ").replace(r"\n", " ")
            size, lines, widths = fit_caption(text, font_path, metric_scale)
            fields[9] = rf"{{\pos(482,1290)\fad(55,55)\q2\fs{size}}}" + r"\N".join(lines)
            line = ",".join(fields)
            layouts.append({"start": fields[1], "end": fields[2], "fontSize": size,
                            "lines": lines, "widths": widths})
        output.append(line)
    return "\n".join(output) + "\n", layouts


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
    caption, metric_scale = caption_font_path(body)
    shutil.copyfile(caption, fonts / "caption.ttf")
    ass_path = output / "captions.ass"
    ass, caption_layouts = layout_captions(ass_path.read_text(encoding="utf-8"), caption, metric_scale)
    ass_path.write_text(ass, encoding="utf-8")

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
        "graphicsBounds": [96, 570, 876, 1130], "captions": caption_layouts}, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
