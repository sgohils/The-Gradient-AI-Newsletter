"""Original, animated editorial illustrations on CPU; no image or video API."""
import argparse
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def ease(value):
    return 1 - (1 - max(0, min(1, value))) ** 3


def wrap(text, font, width):
    lines = []
    for paragraph in text.splitlines():
        line = ""
        for word in paragraph.split():
            if font.getlength(word) > width:
                return []
            candidate = (line + " " + word).strip()
            if font.getlength(candidate) <= width:
                line = candidate
            elif line:
                lines.append(line)
                line = word
        if line:
            lines.append(line)
    return lines


def fitted_text(text, fonts):
    for size in (32, 30, 28, 26, 24):
        lines = wrap(text, fonts[size], 686)
        if lines and len(lines) * (size + 8) <= 148:
            return size, lines, False
    # Mark a shortened source excerpt, rather than inventing an assertion.
    words = text.split()
    for count in range(len(words) - 1, 0, -1):
        lines = wrap(" ".join(words[:count]) + "…", fonts[26], 686)
        if lines and len(lines) * 34 <= 148:
            return 26, lines, True
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


def render_frame(plan, index, seconds, fonts, layouts):
    scene = plan["scenes"][index]
    local = max(0, seconds - scene["start"])
    dark = index % 2 == 0
    background = ("#176b5b" if index == 0 else "#202421") if dark else "#eeede7"
    ink, accent, dim = ("#fbfaf7", "#87c4ae", "#4c7669") if dark else ("#202421", "#176b5b", "#bacbc1")
    image = Image.new("RGBA", (780, 560), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, 779, 559), radius=18, fill=background)
    for x in range(38, 754, 32):
        for y in range(83, 323, 32):
            circle(draw, x, y, 1, fill=dim)
    size, lines, excerpt = layouts[index]
    label = scene["label"] + (" · EXCERPT" if excerpt else "")
    draw.text((32, 28), label, font=fonts[20], fill=ink)
    draw.text((748, 28), f"{index + 1:02d} / {len(plan['scenes']):02d}", font=fonts[20], fill=accent, anchor="ra")
    if scene["theme"] == "number":
        value = scene["callout"]
        font = next((fonts[s] for s in (96, 80, 64, 48, 40) if fonts[s].getlength(value) <= 670), fonts[32])
        if font.getlength(value) > 670:
            raise ValueError("Number callout cannot fit the graphic safe area")
        draw.text((390, 194 + 12 * (1 - ease(local / 0.5))), value, font=font, fill=accent, anchor="mm")
        draw.line((230, 275, 550, 275), fill=dim, width=2)
    else:
        ILLUSTRATIONS[scene["theme"]](draw, local, ink, accent, dim, background, fonts)
    y = 351 + 10 * (1 - ease(local / 0.45))
    for line in lines:
        draw.text((390, y), line, font=fonts[size], fill=ink, anchor="ma")
        y += size + 8
    progress = max(0, min(1, seconds / plan["duration"]))
    draw.rounded_rectangle((32, 533, 748, 538), radius=2, fill=dim)
    if progress > 0:
        draw.rounded_rectangle((32, 533, 32 + 716 * progress, 538), radius=2, fill=accent)
    opacity = min(ease(local / 0.25), ease((scene["end"] - seconds) / 0.18))
    if opacity < 1:
        image.putalpha(image.getchannel("A").point([round(v * opacity) for v in range(256)]))
    return image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    output = parser.parse_args().output_dir
    plan = json.loads((output / "storyboard.json").read_text(encoding="utf-8"))
    if (plan["width"], plan["height"], plan["fps"]) != (780, 560, 12):
        raise ValueError("Unexpected graphics dimensions or frame rate")
    fonts = {size: ImageFont.truetype(str(output / "fonts/body.ttf"), size)
             for size in (20, 24, 26, 28, 30, 32, 40, 48, 64, 72, 80, 96)}
    layouts = [fitted_text(scene["text"], fonts) for scene in plan["scenes"]]
    frames = output / ".graphics-frames"
    frames.mkdir(exist_ok=True)
    index = 0
    for frame in range(math.ceil(plan["duration"] * plan["fps"])):
        seconds = frame / plan["fps"]
        while index + 1 < len(plan["scenes"]) and seconds >= plan["scenes"][index]["end"]:
            index += 1
        render_frame(plan, index, seconds, fonts, layouts).save(frames / f"frame-{frame:05d}.png", compress_level=1)
    for i, scene in enumerate(plan["scenes"]):
        render_frame(plan, i, min(scene["end"] - 0.2, scene["start"] + 0.8), fonts, layouts).save(output / f"scene-{i + 1:02d}.png")
    (output / "graphics-layout.json").write_text(json.dumps([{"fontSize": size, "lines": lines, "excerpt": excerpt}
        for size, lines, excerpt in layouts], indent=2), encoding="utf-8")
    print(f"Rendered {len(plan['scenes'])} animated scenes at {plan['fps']} fps")


if __name__ == "__main__":
    main()
