"""Exercise real scene artwork, layout bounds, and atomic encoding failure."""
import copy
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import ImageChops
from assets import caption_font_path
from graphics import ILLUSTRATIONS, encode_video, prepare_art, render_frame


class GraphicsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        candidates = [Path(os.environ.get("VIDEO_BODY_FONT", "")),
                      Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
                      Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts/arial.ttf"]
        body = next((path for path in candidates if path.is_file()), None)
        if body is None:
            raise RuntimeError("Install DejaVu fonts or set VIDEO_BODY_FONT")
        cls.temporary = tempfile.TemporaryDirectory()
        cls.output = Path(cls.temporary.name)
        (cls.output / "fonts").mkdir()
        shutil.copyfile(body, cls.output / "fonts/body.ttf")
        shutil.copyfile(caption_font_path(body)[0], cls.output / "fonts/caption.ttf")
        cls.story = {"issueDate": "2026-10-04", "sourceHost": "example.com"}
        scene = {"start": 0, "end": 30, "kind": "detail", "label": "KEY DETAIL 1", "variant": 0,
                 "theme": "code", "text": "Source-backed example", "displayText": "Compare model answers", "excerpt": False}
        cls.plan = {"version": 2, "width": 1080, "height": 1920, "renderWidth": 720, "renderHeight": 1280,
                    "fps": 15, "duration": 30, "scenes": [scene]}

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def test_every_illustration_moves_inside_a_complete_vertical_frame(self):
        for theme in ILLUSTRATIONS:
            with self.subTest(theme=theme):
                plan = copy.deepcopy(self.plan)
                plan["scenes"][0]["theme"] = theme
                art = prepare_art(plan, self.story, self.output)
                first = render_frame(plan, self.story, 0, 0.8, art)
                second = render_frame(plan, self.story, 0, 2.2, art)
                self.assertEqual((first.mode, first.size), ("RGB", (720, 1280)))
                bounds = (64, 490, 584, 710)  # Actual artwork, excluding text/progress.
                self.assertIsNotNone(ImageChops.difference(first.crop(bounds), second.crop(bounds)).getbbox())

    def test_headline_and_explicit_number_fit_without_silent_truncation(self):
        plan = copy.deepcopy(self.plan)
        scene = plan["scenes"][0]
        scene.update(kind="headline", displayText="An open toolkit for checking how language models answer everyday questions",
                     theme="number", callout="$2.5 billion")
        art = prepare_art(plan, self.story, self.output)
        size, lines = art["layouts"][0]
        self.assertEqual(" ".join(lines), scene["displayText"])
        self.assertLessEqual(len(lines) * (size + 10), 300)
        for line in lines:
            self.assertLessEqual(art["fonts"][size].getlength(line) / art["scale"], 780)
        render_frame(plan, self.story, 0, 0, art)
        scene["displayText"] = "W" * 90
        with self.assertRaisesRegex(ValueError, "cannot fit"):
            prepare_art(plan, self.story, self.output)

    def test_failed_encoder_preserves_the_completed_video(self):
        plan = copy.deepcopy(self.plan)
        plan["duration"] = 1
        art = prepare_art(plan, self.story, self.output)
        (self.output / "render.filter").write_text("[0:v]null[v];[1:a]anull[a]", encoding="utf-8")
        completed = self.output / "video.mp4"
        completed.write_bytes(b"previous completed video")
        # Python rejects FFmpeg's options before reading frames, exercising the
        # real broken pipe/process failure path without requiring FFmpeg in unit tests.
        with self.assertRaisesRegex(RuntimeError, "Video encoding failed"):
            encode_video(plan, self.story, art, self.output, sys.executable, "video.mp4")
        self.assertEqual(completed.read_bytes(), b"previous completed video")
        self.assertFalse((self.output / ".video-rendering.mp4").exists())

    def test_new_compositions_render_without_mutating_cached_layers(self):
        frames = []
        for layout in ("hero", "panel", "split", "stat", "source"):
            with self.subTest(layout=layout):
                plan = copy.deepcopy(self.plan)
                plan["version"] = 3
                scene = plan["scenes"][0]
                scene.update(layout=layout, terms=["Source"], theme="number" if layout == "stat" else "code")
                scene["callout"] = "30%"
                if layout == "source":
                    scene["kind"] = "source"
                art = prepare_art(plan, self.story, self.output)
                base, settled = art["bases"][0].tobytes(), art["settled"][0].tobytes()
                first = render_frame(plan, self.story, 0, 1, art)
                frames.append(first)
                self.assertEqual(first.tobytes(), render_frame(plan, self.story, 0, 1, art).tobytes())
                self.assertEqual(base, art["bases"][0].tobytes())
                self.assertEqual(settled, art["settled"][0].tobytes())
                self.assertIsNotNone(ImageChops.difference(first, render_frame(plan, self.story, 0, 2, art)).getbbox())
        for frame in frames[1:]:
            self.assertIsNotNone(ImageChops.difference(frames[0], frame).getbbox())

    def test_rejects_invented_artwork_labels(self):
        plan = copy.deepcopy(self.plan)
        plan["scenes"][0]["terms"] = ["Breakthrough"]
        with self.assertRaisesRegex(ValueError, "not supported"):
            prepare_art(plan, self.story, self.output)
