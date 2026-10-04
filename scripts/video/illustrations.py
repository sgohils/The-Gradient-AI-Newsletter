"""Original layered vector artwork, cached and antialiased locally with Pillow."""
import math
from functools import lru_cache

from PIL import Image, ImageColor, ImageDraw, ImageFilter, ImageFont


THEMES = ("network", "code", "comparison", "research", "chip", "robot", "security", "policy", "link")


def blend(first, second, amount):
    a, b = ImageColor.getrgb(first), ImageColor.getrgb(second)
    return tuple(round(x + (y - x) * amount) for x, y in zip(a, b))


@lru_cache(maxsize=128)
def font_at(path, size):
    return ImageFont.truetype(path, size)


class Canvas:
    """720x440 design space, with two-times sampling for clean vector edges."""
    def __init__(self, scale, font_path):
        self.scale = scale * 2
        self.size = (round(720 * scale), round(440 * scale))
        self.image = Image.new("RGBA", (self.size[0] * 2, self.size[1] * 2))
        self.draw = ImageDraw.Draw(self.image)
        self.font_path = str(font_path)

    def xy(self, values):
        if isinstance(values[0], (tuple, list)):
            return [self.xy(point) for point in values]
        return tuple(value * self.scale for value in values)

    def line(self, points, fill, width=2):
        self.draw.line(self.xy(points), fill=fill, width=max(1, round(width * self.scale)), joint="curve")

    def rect(self, box, fill, outline=None, width=1, radius=12):
        self.draw.rounded_rectangle(self.xy(box), radius=radius * self.scale, fill=fill,
                                    outline=outline, width=max(1, round(width * self.scale)))

    def circle(self, x, y, radius, fill=None, outline=None, width=2):
        self.draw.ellipse(self.xy((x-radius, y-radius, x+radius, y+radius)), fill=fill,
                          outline=outline, width=max(1, round(width * self.scale)))

    def poly(self, points, fill):
        self.draw.polygon(self.xy(points), fill=fill)

    def arc(self, box, start, end, fill, width=2):
        self.draw.arc(self.xy(box), start, end, fill=fill, width=max(1, round(width * self.scale)))

    def text(self, position, text, size, fill):
        self.draw.text(self.xy(position), text, font=font_at(self.font_path, max(1, round(size * self.scale))),
                       fill=fill, anchor="mm")

    def card(self, box, palette, fill=None, depth=12):
        x1, y1, x2, y2 = box
        self.rect((x1+5, y1+depth, x2+5, y2+depth), blend(palette["background"], "#000000", 0.35), radius=18)
        self.rect(box, fill or blend(palette["panel"], palette["accent"], 0.08), palette["dim"], radius=18)
        self.line(((x1+20, y1+2), (x2-20, y1+2)), blend(palette["accent"], palette["ink"], 0.3), 2)

    def finish(self):
        return self.image.resize(self.size, Image.Resampling.LANCZOS)


def cube(c, x, y, width, height, palette):
    half = width / 2
    c.poly(((x, y-height), (x+half, y-height/2), (x, y), (x-half, y-height/2)), palette["accent"])
    c.poly(((x-half, y-height/2), (x, y), (x, y+height), (x-half, y+height/2)),
           blend(palette["accent"], palette["background"], 0.35))
    c.poly(((x, y), (x+half, y-height/2), (x+half, y+height/2), (x, y+height)),
           blend(palette["accent"], palette["background"], 0.6))
    c.line(((x-half, y-height/2), (x, y-height), (x+half, y-height/2)), palette["ink"], 1)


def network(c, p):
    for side in (0, 1):
        for i in range(3):
            x, y = (120 if side == 0 else 600), 110 + i * 100
            c.line(((x, y), (230 if side == 0 else 490, y), (360, 220)), p["dim"], 2)
            c.circle(x, y, 28, blend(p["panel"], p["accent"], 0.1), p["accent"], 2)
            c.circle(x, y, 10, p["accent"])
    c.circle(360, 220, 106, outline=p["dim"], width=1)
    c.card((283, 140, 437, 294), p, depth=18)
    c.rect((300, 157, 420, 277), p["accent"], radius=20)
    c.text((360, 217), "AI", 54, p["background"])
    for i in range(4):
        c.line(((313+i*30, 127), (313+i*30, 141)), p["accent"], 4)
        c.line(((313+i*30, 294), (313+i*30, 316)), p["accent"], 4)


def code(c, p):
    c.card((144, 54, 626, 320), p, depth=8)
    c.card((104, 79, 602, 349), p, depth=16)
    c.rect((106, 82, 600, 126), blend(p["panel"], p["accent"], 0.12), radius=16)
    c.line(((105, 128), (601, 128)), p["dim"])
    for i, color in enumerate((p["accent"], p["blue"], p["warm"])):
        c.circle(130+i*23, 103, 5, color)
    c.rect((122, 148, 246, 329), blend(p["background"], p["panel"], 0.25), radius=12)
    c.text((184, 239), "</>", 43, p["accent"])
    for row, widths in enumerate(((53, 114, 46), (86, 50, 87), (40, 122, 39), (69, 76, 49))):
        x, y = 272 + (row % 2) * 15, 170 + row * 38
        for i, width in enumerate(widths):
            c.rect((x, y, x+width, y+7), (p["blue"], p["accent"], p["dim"])[i], radius=3)
            x += width + 12
    c.line(((280, 324), (345, 324)), p["dim"], 3)


def comparison(c, p):
    c.line(((360, 93), (360, 119), (199, 119), (199, 146)), p["dim"], 2)
    c.line(((360, 119), (523, 119), (523, 146)), p["dim"], 2)
    c.circle(360, 82, 30, p["panel"], p["accent"], 2)
    c.text((360, 82), "?", 30, p["ink"])
    for x, accent in ((90, p["accent"]), (414, p["blue"])):
        c.card((x+12, 151, x+223, 352), p, depth=7)
        c.card((x, 140, x+211, 344), p, depth=14)
        c.rect((x+20, 163, x+191, 203), blend(p["panel"], p["accent"], 0.08), radius=9)
        c.circle(x+40, 183, 7, accent)
        c.line(((x+59, 183), (x+154, 183)), p["dim"], 4)
        for row, width in enumerate((132, 107, 124)):
            c.rect((x+24, 224+row*31, x+24+width, 230+row*31), p["dim"], radius=3)
        c.circle(x+176, 306, 13, outline=accent, width=2)


def research(c, p):
    c.card((225, 70, 473, 349), p, depth=10)
    c.card((247, 53, 489, 331), p, depth=14)
    c.poly(((439, 54), (489, 104), (439, 104)), blend(p["accent"], p["panel"], 0.5))
    c.rect((274, 85, 410, 94), p["accent"], radius=3)
    for y, width in ((117, 144), (138, 165), (267, 116), (290, 145)):
        c.rect((274, y, 274+width, y+5), p["dim"], radius=2)
    for i in range(3):
        c.circle(291+i*61, 206, 16, outline=p["accent"] if i == 1 else p["dim"], width=2)
    c.line(((307, 206), (336, 206)), p["dim"])
    c.line(((368, 206), (397, 206)), p["dim"])
    c.arc((128, 93, 572, 399), 55, 140, p["dim"], 1)


def chip(c, p):
    c.poly(((360, 100), (644, 233), (360, 377), (76, 237)), blend(p["panel"], p["accent"], 0.1))
    c.poly(((76, 237), (360, 377), (360, 395), (76, 255)), blend(p["panel"], "#000000", 0.25))
    c.poly(((360, 377), (644, 233), (644, 251), (360, 395)), blend(p["panel"], "#000000", 0.45))
    for i in range(4):
        c.line(((143+i*30, 258+i*15), (218+i*30, 220+i*15)), p["dim"], 2)
        c.line(((437+i*30, 264-i*15), (519+i*30, 223-i*15)), p["dim"], 2)
    for x, y in ((170, 232), (550, 232), (360, 333), (360, 139)):
        c.circle(x, y, 9, p["accent"])
        c.circle(x, y, 17, outline=p["dim"], width=1)
    cube(c, 360, 219, 268, 69, p)
    c.poly(((360, 140), (457, 188), (360, 237), (263, 189)), p["background"])
    c.line(((284, 188), (360, 151), (435, 188)), p["ink"], 1)
    c.text((360, 187), "AI", 36, p["ink"])
    for i in range(5):
        c.line(((249+i*24, 230+i*12), (235+i*24, 244+i*12)), p["accent"], 4)
        c.line(((363+i*24, 287-i*12), (377+i*24, 301-i*12)), p["accent"], 4)


def robot(c, p):
    c.poly(((95, 321), (357, 234), (633, 320), (366, 408)), blend(p["panel"], p["accent"], 0.1))
    c.poly(((95, 321), (366, 408), (366, 424), (95, 337)), blend(p["panel"], "#000000", 0.25))
    c.line(((108, 322), (366, 404), (621, 321)), p["dim"], 1)
    c.card((157, 327, 282, 370), p, depth=13)
    c.rect((191, 298, 249, 336), p["dim"], p["accent"], radius=10)
    cube(c, 526, 320, 76, 23, p)


def security(c, p):
    for x, y in ((123, 126), (582, 123), (110, 315), (608, 311)):
        c.line(((x, y), (360, 218)), p["dim"], 1)
        c.circle(x, y, 18, p["panel"], p["dim"], 1)
        c.circle(x, y, 5, p["accent"])
    shield = ((360, 63), (487, 114), (468, 269), (360, 359), (252, 269), (233, 114))
    c.poly([(x+9, y+14) for x, y in shield], blend(p["background"], "#000000", 0.35))
    c.poly(shield, blend(p["panel"], p["accent"], 0.18))
    c.line(shield+(shield[0],), p["accent"], 3)
    c.line(((360, 79), (471, 124), (455, 261)), blend(p["accent"], p["ink"], 0.3), 2)
    c.arc((318, 136, 402, 219), 180, 360, p["ink"], 9)
    c.card((303, 180, 417, 262), p, fill=p["accent"], depth=8)
    c.circle(360, 215, 9, p["background"])
    c.line(((360, 220), (360, 241)), p["background"], 6)


def policy(c, p):
    c.card((220, 65, 460, 345), p, depth=13)
    c.card((240, 48, 480, 327), p, depth=12)
    c.rect((268, 86, 391, 94), p["accent"], radius=3)
    for y, width in ((128, 166), (159, 128), (190, 151), (221, 102)):
        c.rect((268, y, 268+width, y+6), p["dim"], radius=3)
    c.circle(466, 285, 63, blend(p["panel"], "#000000", 0.2))
    c.circle(460, 273, 63, p["accent"])
    c.circle(460, 273, 49, outline=blend(p["accent"], p["background"], 0.25), width=2)
    c.line(((434, 271), (454, 291), (489, 254)), p["background"], 9)


def link(c, p):
    c.card((218, 94, 512, 317), p, depth=14)
    c.rect((243, 121, 380, 128), p["dim"], radius=3)
    for y, width in ((151, 213), (174, 179), (280, 156)):
        c.rect((243, y, 243+width, y+5), p["dim"], radius=2)


ARTISTS = dict(zip(THEMES, (network, code, comparison, research, chip, robot, security, policy, link)))


def motion(c, theme, t, p):
    if theme == "network":
        for side in (0, 1):
            for i in range(3):
                x, y = (120 if side == 0 else 600), 110+i*100
                progress = (t * 0.32 + i * 0.27 + side * 0.13) % 1
                c.circle(x+(360-x)*progress, y+(220-y)*progress, 5, p["ink"])
        c.arc((254, 114, 466, 326), t*20, t*20+55, p["accent"], 3)
    elif theme == "code":
        x = 362 + 43 * (0.5+0.5*math.sin(t*1.2))
        c.line(((x, 277), (x, 292)), p["ink"], 3)
        c.circle(577, 104, 4, p["accent"])
    elif theme == "comparison":
        for x, color, offset in ((199, p["accent"], 0), (523, p["blue"], 0.5)):
            progress = (t*0.4+offset) % 1
            c.circle(x, 120+24*progress, 4, color)
            c.arc((x-78, 222, x+78, 308), t*25, t*25+42, color, 2)
    elif theme == "research":
        x, y = 490 + 14 * math.sin(t*0.7), 249 + 8 * math.cos(t*0.8)
        c.circle(x+4, y+8, 66, blend(p["background"], "#000000", 0.3))
        c.circle(x, y, 66, blend(p["panel"], p["accent"], 0.12), p["accent"], 6)
        c.arc((x-56, y-56, x+56, y+56), 195, 270, p["ink"], 2)
        c.line(((x+46, y+48), (x+95, y+98)), p["accent"], 16)
        for dx, dy in ((-22, -12), (5, 8), (25, -19)):
            c.circle(x+dx, y+dy, 5, p["dim"])
    elif theme == "chip":
        for start, end, offset in (((170, 232), (263, 189), 0), ((550, 232), (457, 188), 0.5), ((360, 333), (360, 288), 0.25)):
            progress = (t*0.35+offset) % 1
            c.circle(start[0]+(end[0]-start[0])*progress, start[1]+(end[1]-start[1])*progress, 5, p["ink"])
    elif theme == "robot":
        points = ((220, 306), (283+12*math.sin(t*0.8), 175), (436+10*math.cos(t*0.8), 121+10*math.sin(t*0.8)), (523, 209))
        c.line([(x+5, y+7) for x, y in points], blend(p["panel"], "#000000", 0.25), 26)
        c.line(points, p["dim"], 25)
        c.line(points, p["accent"], 13)
        for x, y in points:
            c.circle(x, y, 19, p["panel"], p["accent"], 4)
            c.circle(x, y, 6, p["ink"])
        opening = 13+5*math.sin(t*1.1)
        c.line(((523, 213), (523-opening, 245), (520-opening, 258)), p["accent"], 7)
        c.line(((523, 213), (523+opening, 245), (526+opening, 258)), p["accent"], 7)
    elif theme == "security":
        c.arc((175, 26, 545, 396), 195+t*16, 249+t*16, p["accent"], 3)
        c.arc((191, 42, 529, 380), 30-t*12, 64-t*12, p["dim"], 2)
    elif theme == "policy":
        c.arc((390, 203, 530, 343), 180+t*18, 245+t*18, p["ink"], 3)
    elif theme == "link":
        shift = 5*math.sin(t*0.8)
        c.rect((170+shift, 184, 387+shift, 279), None, p["accent"], 12, 46)
        c.rect((337-shift, 214, 554-shift, 309), None, p["blue"], 12, 46)
        c.line(((308, 232), (410, 269)), p["accent"], 12)


class Illustration:
    def __init__(self, theme, palette, scale, font_path):
        if theme not in ARTISTS:
            raise ValueError("Unknown illustration theme")
        self.theme, self.palette, self.scale, self.font_path = theme, palette, scale, font_path
        canvas = Canvas(scale, font_path)
        # A soft ground shadow gives the layered shapes depth without a 3D engine.
        shadow = Image.new("RGBA", canvas.image.size)
        shadow_draw = ImageDraw.Draw(shadow)
        shadow_draw.ellipse(canvas.xy((123, 324, 597, 411)), fill=(0, 0, 0, 32))
        canvas.image = shadow.filter(ImageFilter.GaussianBlur(18 * canvas.scale))
        canvas.draw = ImageDraw.Draw(canvas.image)
        ARTISTS[theme](canvas, palette)
        self.static = canvas.finish()

    def paint(self, target, position, seconds):
        # Neither the cached static layer nor the target outside the artwork is modified.
        target.paste(self.static, position, self.static)
        canvas = Canvas(self.scale, self.font_path)
        motion(canvas, self.theme, seconds, self.palette)
        overlay = canvas.finish()
        target.paste(overlay, position, overlay)
