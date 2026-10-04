"""Measured typography and original graphics; no paid or scraped images."""
import argparse
import json
import os
import re
import shutil
from pathlib import Path
from PIL import ImageFont


CAPTION_WIDTH = 740  # 12px outline fits inside x=100..864 around x=482.
CAPTION_SIZES = range(64, 35, -2)


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
            original = fields[9]
            highlight = re.search(r"\{\\1c&HCBEFB4&\}([^{}]+)\{\\1c&HFFFFFF&\}", original)
            highlighted_index = None
            if highlight:
                prefix = re.sub(r"\{[^}]*\}", "", original[:highlight.start()]).replace(r"\N", " ").replace(r"\n", " ")
                highlighted_index = len(prefix.split())
            text = re.sub(r"\{[^}]*\}", "", original).replace(r"\N", " ").replace(r"\n", " ")
            size, lines, widths = fit_caption(text, font_path, metric_scale)
            word_index, decorated = 0, []
            for fitted_line in lines:
                words = []
                for word in fitted_line.split():
                    words.append(r"{\1c&HCBEFB4&}" + word + r"{\1c&HFFFFFF&}" if word_index == highlighted_index else word)
                    word_index += 1
                decorated.append(" ".join(words))
            # New highlighting events have no per-word fade, avoiding flicker.
            fade = r"\fad(55,55)" if r"\fad(" in original else ""
            fields[9] = rf"{{\pos(482,1290){fade}\q2\fs{size}}}" + r"\N".join(decorated)
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
    windows = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts"
    body_candidates = [Path(os.environ.get("VIDEO_BODY_FONT", "")), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"), windows / "arial.ttf"]
    body = next((p for p in body_candidates if p.is_file()), None)
    if body is None:
        raise RuntimeError("Install DejaVu fonts or set VIDEO_BODY_FONT")
    fonts = output / "fonts"
    fonts.mkdir(exist_ok=True)
    shutil.copyfile(body, fonts / "body.ttf")
    caption, metric_scale = caption_font_path(body)
    shutil.copyfile(caption, fonts / "caption.ttf")
    ass_path = output / "captions.ass"
    ass, caption_layouts = layout_captions(ass_path.read_text(encoding="utf-8"), caption, metric_scale)
    ass_path.write_text(ass, encoding="utf-8")

    (output / "layout.json").write_text(json.dumps({"captionCenter": [482, 1290], "safeRight": 876,
        "graphicsBounds": [96, 680, 876, 1135], "captions": caption_layouts}, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
