"""Original, animated editorial illustrations on CPU; no image or video API."""
import argparse
import json
import math
import os
import subprocess
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont


def ease(value):
    return 1 - (1 - max(0, min(1, value))) ** 3


def wrap(text, font, width, scale=1):
    lines = []
    for paragraph in text.splitlines():
        line = ""
        for word in paragraph.split():
            if font.getlength(word) / scale > width:
                return []
            candidate = (line + " " + word).strip()
            if font.getlength(candidate) / scale <= width:
                line = candidate
            elif line:
                lines.append(line)
                line = word
        if line:
            lines.append(line)
    return lines


def fitted_text(text, fonts, scale, headline=False):
    # Short, source-derived excerpts carry the visual; the subtitles carry the
    # complete narration. Never silently truncate an already selected excerpt.
    for size in ((88, 80, 72, 68, 64, 60, 56, 52, 48, 44, 40, 36) if headline else
                 (80, 72, 68, 64, 60, 56, 52, 48, 44, 40, 36)):
        lines = wrap(text, fonts[size], 780, scale)
        if lines and len(lines) * (size + 10) <= 300:
            return size, lines
    raise ValueError("Scene text cannot fit the mobile safe area")


def circle(draw, x, y, radius, **kwargs):
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), **kwargs)


def network(draw, t, ink, accent, dim, background, fonts):
    points = [(x, y) for x in (225, 555) for y in (120, 195, 270)]
    for i, (x, y) in enumerate(points):
        draw.line((x, y, 390, 195), fill=dim, width=3)
        p = (t * 0.45 + i * 0.17) % 1
        circle(draw, x + (390 - x) * p, y + (195 - y) * p, 5, fill=accent)
        circle(draw, x, y, 18, fill=background, outline=accent, width=3)
    circle(draw, 390, 195, 64 + 4 * math.sin(t * 2), outline=dim, width=2)
    draw.rounded_rectangle((341, 146, 439, 244), radius=18, fill=accent)
    draw.text((390, 195), "AI", font=fonts[40], fill=background, anchor="mm")


def code(draw, t, ink, accent, dim, background, fonts):
    draw.rounded_rectangle((170, 91, 610, 299), radius=14, fill=background, outline=dim, width=3)
    draw.line((170, 134, 610, 134), fill=dim, width=2)
    for i in range(3):
        circle(draw, 194 + 19 * i, 113, 5, fill=accent if i == 0 else dim)
    draw.text((270, 208), "{ }", font=fonts[72], fill=accent, anchor="mm")
    for i, width in enumerate((193, 137, 168)):
        y = 174 + i * 36
        revealed = width * (0.78 + 0.22 * math.sin(t * 1.1 + i) ** 2)
        draw.rounded_rectangle((350, y, 350 + revealed, y + 8), radius=4, fill=accent if i == 0 else dim)
    x = 350 + 168 * (0.78 + 0.22 * math.sin(t * 1.1 + 2) ** 2)
    draw.line((x + 8, 241, x + 8, 262), fill=ink, width=3)


def comparison(draw, t, ink, accent, dim, background, fonts):
    draw.rounded_rectangle((357, 85, 423, 125), radius=8, fill=background, outline=accent, width=2)
    draw.text((390, 105), "?", font=fonts[28], fill=ink, anchor="mm")
    for i, x in enumerate((175, 435)):
        draw.line((390, 125, 390, 145, x + 85, 145, x + 85, 173), fill=dim, width=2)
        draw.rounded_rectangle((x, 173, x + 170, 291), radius=12, fill=background, outline=accent, width=3)
        for row, width in enumerate((113, 85, 99)):
            y = 198 + row * 27
            draw.line((x + 24, y, x + 24 + width, y), fill=dim, width=5)
        circle(draw, x + 85, 145 + 24 * ((t * 0.7 + i * 0.5) % 1), 4, fill=accent)


def research(draw, t, ink, accent, dim, background, fonts):
    draw.rounded_rectangle((270, 86, 478, 301), radius=10, fill=background, outline=accent, width=3)
    draw.polygon([(434, 86), (478, 130), (434, 130)], fill=dim)
    for i, width in enumerate((99, 136, 106, 123)):
        y = 136 + i * 30
        draw.rounded_rectangle((298, y, 298 + width, y + 7), radius=3, fill=dim)
    x = 481 + 8 * math.sin(t * 0.8)
    circle(draw, x, 225, 54, fill=background, outline=accent, width=6)
    draw.line((x + 38, 264, x + 83, 307), fill=accent, width=10)
    draw.line((x - 23, 225, x + 23, 225), fill=dim, width=3)
    draw.line((x, 202, x, 248), fill=dim, width=3)


def chip(draw, t, ink, accent, dim, background, fonts):
    for i in range(5):
        x = 310 + i * 40
        draw.line((x, 93, x, 124), fill=accent, width=6)
        draw.line((x, 287, x, 319), fill=accent, width=6)
        y = 142 + i * 33
        draw.line((246, y, 286, y), fill=accent, width=6)
        draw.line((494, y, 534, y), fill=accent, width=6)
    draw.rounded_rectangle((286, 124, 494, 287), radius=14, fill=background, outline=accent, width=4)
    draw.rounded_rectangle((318, 155, 462, 254), radius=8, outline=dim, width=2)
    draw.text((390, 207), "AI", font=fonts[48], fill=ink, anchor="mm")
    for i, side in enumerate((-1, 1)):
        x, end, y = (286, 155, 172) if side == -1 else (494, 625, 239)
        draw.line((x, y, end, y, end, y - 60 * side), fill=dim, width=2)
        circle(draw, x + (end - x) * ((t * 0.5 + i * 0.5) % 1), y, 5, fill=accent)


def robot(draw, t, ink, accent, dim, background, fonts):
    points = [(275, 275), (320 + math.sin(t) * 8, 190), (438, 147 + math.sin(t) * 6), (505, 207)]
    draw.line(points, fill=accent, width=13, joint="curve")
    for x, y in points:
        circle(draw, x, y, 16, fill=background, outline=accent, width=5)
    draw.line((505, 207, 541, 185, 557, 207), fill=accent, width=6)
    draw.line((505, 207, 541, 229, 557, 207), fill=accent, width=6)
    draw.rounded_rectangle((234, 287, 319, 307), radius=6, fill=accent)
    draw.line((170, 315, 610, 315), fill=dim, width=2)


def security(draw, t, ink, accent, dim, background, fonts):
    points = [(390, 86), (490, 129), (472, 239), (390, 302), (308, 239), (290, 129), (390, 86)]
    draw.polygon(points, fill=background)
    draw.line(points, fill=accent, width=5, joint="curve")
    draw.arc((357, 135, 423, 201), 180, 360, fill=ink, width=5)
    draw.rounded_rectangle((348, 172, 432, 232), radius=9, fill=accent)
    circle(draw, 390, 194, 6, fill=background)
    draw.line((390, 195, 390, 213), fill=background, width=4)
    r = 128 + 4 * math.sin(t * 1.5)
    draw.arc((390 - r, 195 - r, 390 + r, 195 + r), t * 30, t * 30 + 100, fill=dim, width=3)


def policy(draw, t, ink, accent, dim, background, fonts):
    draw.rounded_rectangle((270, 86, 485, 299), radius=9, fill=background, outline=accent, width=3)
    for i, width in enumerate((121, 153, 100)):
        y = 119 + i * 32
        draw.line((299, y, 299 + width, y), fill=dim, width=6)
    circle(draw, 469, 250, 48 + 2 * math.sin(t), fill=accent)
    draw.line((444, 249, 461, 265, 492, 234), fill=background, width=7, joint="curve")


def link(draw, t, ink, accent, dim, background, fonts):
    shift = 8 * math.sin(t * 1.2)
    draw.rounded_rectangle((238 + shift, 124, 410 + shift, 225), radius=47, outline=accent, width=10)
    draw.rounded_rectangle((370 - shift, 170, 542 - shift, 271), radius=47, outline=accent, width=10)
    draw.line((345, 199, 435, 199), fill=background, width=18)
    draw.line((351, 177, 430, 218), fill=accent, width=10)
    for x, y in ((209, 115), (568, 283)):
        draw.line((x - 10, y, x + 10, y), fill=dim, width=2)
        draw.line((x, y - 10, x, y + 10), fill=dim, width=2)


ILLUSTRATIONS = {"network": network, "code": code, "comparison": comparison, "research": research, "chip": chip,
                 "robot": robot, "security": security, "policy": policy, "link": link}


class DesignDraw:
    """Draw in 1080p design coordinates on the less expensive 720p canvas."""

    def __init__(self, image, scale, offset=(0, 0)):
        self.draw = ImageDraw.Draw(image)
        self.scale = scale
        self.offset = offset

    def xy(self, coordinates):
        if isinstance(coordinates[0], (tuple, list)):
            return [self.xy(point) for point in coordinates]
        return tuple(value * self.scale + self.offset[i % 2] for i, value in enumerate(coordinates))

    def style(self, kwargs):
        if "width" in kwargs:
            kwargs["width"] = max(1, round(kwargs["width"] * self.scale))
        return kwargs

    def rectangle(self, coordinates, **kwargs):
        self.draw.rectangle(self.xy(coordinates), **self.style(kwargs))

    def rounded_rectangle(self, coordinates, radius, **kwargs):
        self.draw.rounded_rectangle(self.xy(coordinates), radius=radius * self.scale, **self.style(kwargs))

    def ellipse(self, coordinates, **kwargs):
        self.draw.ellipse(self.xy(coordinates), **self.style(kwargs))

    def line(self, coordinates, **kwargs):
        self.draw.line(self.xy(coordinates), **self.style(kwargs))

    def polygon(self, coordinates, **kwargs):
        self.draw.polygon(self.xy(coordinates), **self.style(kwargs))

    def arc(self, coordinates, start, end, **kwargs):
        self.draw.arc(self.xy(coordinates), start, end, **self.style(kwargs))

    def text(self, coordinates, text, **kwargs):
        self.draw.text(self.xy(coordinates), text, **kwargs)


PALETTES = (
    {"background": "#112c23", "ink": "#fbfaf7", "accent": "#b4efcb", "dim": "#457f66", "muted": "#a0baab", "panel": "#183d30"},
    {"background": "#151e1b", "ink": "#fbfaf7", "accent": "#b4efcb", "dim": "#456457", "muted": "#a0baab", "panel": "#202f29"},
    {"background": "#f6f5f1", "ink": "#202421", "accent": "#176b5b", "dim": "#b5c9bd", "muted": "#555c57", "panel": "#e8eee6"},
)
FONT_SIZES = (20, 22, 24, 26, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 80, 88, 96, 108, 128, 156, 180, 208, 240)


def background_image(plan, palette):
    width, height = plan["renderWidth"], plan["renderHeight"]
    scale = width / plan["width"]
    image = Image.new("RGB", (width, height), palette["background"])
    glow = Image.new("RGBA", image.size)
    draw = DesignDraw(glow, scale)
    draw.ellipse((370, 430, 1310, 1370), fill=(103, 197, 145, 25))
    image = Image.alpha_composite(image.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(round(100 * scale)))).convert("RGB")
    draw = DesignDraw(image, scale)
    for radius in (360, 530, 710):
        draw.arc((790 - radius, 960 - radius, 790 + radius, 960 + radius), 210, 390, fill=palette["panel"], width=2)
    return image


def prepare_art(plan, story, output):
    if (plan["version"], plan["width"], plan["height"], plan["fps"], plan["renderWidth"], plan["renderHeight"]) != (2, 1080, 1920, 15, 720, 1280):
        raise ValueError("Unexpected graphics version, dimensions, or frame rate")
    scale = plan["renderWidth"] / plan["width"]
    bold_path = output / "fonts/caption.ttf"
    fonts = {size: ImageFont.truetype(str(bold_path), round(size * scale)) for size in FONT_SIZES}
    icon_fonts = {size: ImageFont.truetype(str(bold_path), round(size * scale * 1.4)) for size in FONT_SIZES}
    regular = {size: ImageFont.truetype(str(output / "fonts/body.ttf"), round(size * scale)) for size in (22, 24, 26, 28)}
    layouts = []
    for scene in plan["scenes"]:
        text = scene["displayText"].strip(",;: ")
        if scene["excerpt"]:
            if scene["variant"]:
                text = "…" + text
            if not text.endswith((".", "!", "?")):
                text += "…"
        layouts.append(fitted_text(text, fonts, scale, scene["kind"] == "headline"))
    source_lines = wrap(story["sourceHost"], regular[26], 780, scale)
    if not source_lines or len(source_lines) > 2:
        raise ValueError("Source hostname cannot fit the mobile safe area")
    numbers = {}
    for i, scene in enumerate(plan["scenes"]):
        if scene["theme"] == "number":
            for size in (240, 208, 180, 156, 128, 108, 96, 80, 64, 48, 36):
                lines = wrap(scene["callout"], fonts[size], 700, scale)
                if lines and len(lines) * (size + 10) <= 320:
                    numbers[i] = (size, lines)
                    break
            if i not in numbers:
                raise ValueError("Number callout cannot fit the mobile safe area")
    return {"scale": scale, "fonts": fonts, "iconFonts": icon_fonts, "regular": regular, "layouts": layouts,
            "sourceLines": source_lines, "numbers": numbers,
            "backgrounds": [background_image(plan, palette) for palette in PALETTES]}


def render_frame(plan, story, index, seconds, art):
    scene = plan["scenes"][index]
    local = max(0, seconds - scene["start"])
    palette_index = 0 if index == 0 else (2 if scene["kind"] == "source" else 1 + (index - 1) % 2)
    palette = PALETTES[palette_index]
    ink, accent, dim, muted, panel = (palette[key] for key in ("ink", "accent", "dim", "muted", "panel"))
    scale = art["scale"]
    image = art["backgrounds"][palette_index].copy()
    draw = DesignDraw(image, scale)
    fonts, regular = art["fonts"], art["regular"]

    # The publication's three descending rules, with a small persistent masthead.
    for i, length in enumerate((36, 27, 18)):
        draw.rounded_rectangle((96, 168 + i * 9, 96 + length, 172 + i * 9), radius=2, fill=accent)
    draw.text((152, 165), "THE GRADIENT", font=fonts[26], fill=ink)
    draw.text((876, 168), story["issueDate"], font=regular[22], fill=muted, anchor="ra")
    draw.line((96, 220, 876, 220), fill=dim, width=1)
    draw.text((96, 263), scene["label"], font=fonts[22], fill=accent)
    draw.text((876, 263), f"{index + 1:02d} / {len(plan['scenes']):02d}", font=regular[24], fill=muted, anchor="ra")

    size, lines = art["layouts"][index]
    y = 328 + 20 * (1 - ease(local / 0.35))
    for line in lines:
        draw.text((96, y), line, font=fonts[size], fill=ink)
        y += size + 10

    # Large artwork with depth, moving signals, and a different crop on each beat.
    draw.rounded_rectangle((96, 696, 876, 1151), radius=30, fill=palette["background"])
    draw.rounded_rectangle((96, 680, 876, 1135), radius=30, fill=panel)
    draw.line((130, 713, 830, 713), fill=dim, width=1)
    for x in range(144, 838, 44):
        for y in range(752, 1090, 44):
            circle(draw, x, y, 1, fill=dim)
    if scene["theme"] == "number":
        number_size, number_lines = art["numbers"][index]
        y = 870 - (len(number_lines) - 1) * (number_size + 10) / 2
        for line in number_lines:
            draw.text((486, y + 10 * (1 - ease(local / 0.4))), line,
                      font=fonts[number_size], fill=accent, anchor="mm")
            y += number_size + 10
        draw.text((486, 1090), "FROM THE SOURCE", font=fonts[20], fill=muted, anchor="mm")
    else:
        factor = 1.4
        shift = (10 if scene["variant"] % 2 else -10) * math.sin(local * 0.7)
        offset = ((486 - 390 * factor + shift) * scale, (893 - 195 * factor) * scale)
        icon_draw = DesignDraw(image, factor * scale, offset)
        ILLUSTRATIONS[scene["theme"]](icon_draw, local + scene["variant"] * 2, ink, accent, dim, panel, art["iconFonts"])
        draw.text((130, 1090), "ILLUSTRATION", font=regular[22], fill=muted)
        draw.text((830, 1090), scene["theme"].upper(), font=fonts[22], fill=accent, anchor="ra")

    draw.text((96, 1436), "SOURCE / " + ("ORIGINAL REPORTING" if scene["kind"] == "source" else "AI DAILY BRIEF"),
              font=fonts[20], fill=accent)
    for i, line in enumerate(art["sourceLines"]):
        draw.text((96, 1472 + i * 32), line, font=regular[26], fill=ink)
    progress = max(0, min(1, seconds / plan["duration"]))
    draw.rounded_rectangle((96, 1560, 876, 1566), radius=3, fill=dim)
    if progress > 0:
        draw.rounded_rectangle((96, 1560, 96 + max(1, 780 * progress), 1566), radius=3, fill=accent)
    return image


def animated_frames(plan, story, art):
    index, previous = 0, None
    for frame in range(math.ceil(plan["duration"] * plan["fps"])):
        seconds = frame / plan["fps"]
        while index + 1 < len(plan["scenes"]) and seconds >= plan["scenes"][index]["end"]:
            previous = render_frame(plan, story, index, plan["scenes"][index]["end"], art)
            index += 1
        image = render_frame(plan, story, index, seconds, art)
        local = seconds - plan["scenes"][index]["start"]
        if previous is not None and local < 0.2:
            image = Image.blend(previous, image, ease(local / 0.2))
        yield image


def encode_video(plan, story, art, output, ffmpeg, video_file):
    """One encode and a bounded frame buffer; no intermediate media or PNGs."""
    if video_file != "video.mp4":
        raise ValueError("Unexpected video filename")
    temporary_video = output / ".video-rendering.mp4"
    command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
               "-s", f"{plan['renderWidth']}x{plan['renderHeight']}", "-r", str(plan["fps"]), "-i", "pipe:0",
               "-i", "audio.wav", "-filter_complex", (output / "render.filter").read_text(encoding="utf-8"),
               "-map", "[v]", "-map", "[a]", "-t", str(plan["duration"]), "-c:v", "libx264", "-preset", "veryfast",
               "-crf", "23", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "128k",
               "-movflags", "+faststart", "-threads", "2", temporary_video.name]
    with tempfile.TemporaryFile() as errors:
        process = subprocess.Popen(command, cwd=output, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=errors,
                                   creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        try:
            for image in animated_frames(plan, story, art):
                process.stdin.write(image.tobytes())
            process.stdin.close()
            result = process.wait(timeout=120)
            if result:
                raise subprocess.CalledProcessError(result, command)
            temporary_video.replace(output / video_file)
        except Exception as error:
            if process.poll() is None:
                process.kill()
                process.wait()
            errors.seek(0, 2)
            errors.seek(max(0, errors.tell() - 8000))
            detail = errors.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Video encoding failed: {detail or str(error)}") from error
        finally:
            if process.poll() is None:
                process.kill()
                process.wait()
            try:
                process.stdin.close()
            except BrokenPipeError:
                pass
            temporary_video.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--video-file", default="video.mp4")
    parser.add_argument("--preview-only", action="store_true")
    args = parser.parse_args()
    output = args.output_dir.resolve()
    plan = json.loads((output / "storyboard.json").read_text(encoding="utf-8"))
    story = json.loads((output / "story.json").read_text(encoding="utf-8"))
    art = prepare_art(plan, story, output)
    for i, scene in enumerate(plan["scenes"]):
        render_frame(plan, story, i, min(scene["end"] - 0.1, scene["start"] + 0.8), art).save(output / f"scene-{i + 1:02d}.png")
    render_frame(plan, story, 0, 0, art).save(output / "card.png")
    (output / "graphics-layout.json").write_text(json.dumps({"version": 2, "renderSize": [720, 1280],
        "safeArea": [96, 160, 876, 1566], "artworkBounds": [96, 680, 876, 1135],
        "scenes": [{"fontSize": size, "lines": lines, "excerpt": scene["excerpt"], "start": scene["start"], "end": scene["end"]}
                   for scene, (size, lines) in zip(plan["scenes"], art["layouts"])]}, indent=2), encoding="utf-8")
    if not args.preview_only:
        encode_video(plan, story, art, output, args.ffmpeg, args.video_file)
    print(f"Rendered {len(plan['scenes'])} full-screen scenes at {plan['fps']} fps; streamed 720p artwork, 1080p captions")


if __name__ == "__main__":
    main()
