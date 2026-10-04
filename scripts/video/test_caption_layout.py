"""Regression checks using the same font files as the video renderer."""
import os
import re
import unittest
from pathlib import Path

from PIL import ImageFont
from assets import CAPTION_WIDTH, caption_font_path, fit_caption, layout_captions


def visible_text(event):
    return re.sub(r"\{[^}]*\}", "", event.split(",", 9)[9]).replace(r"\N", " ")


class CaptionLayoutTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        candidates = [Path(os.environ.get("VIDEO_BODY_FONT", "")),
                      Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
                      Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "arial.ttf"]
        cls.body = next((p for p in candidates if p.is_file()), None)
        if cls.body is None:
            raise RuntimeError("Install DejaVu fonts or set VIDEO_BODY_FONT to run caption checks")
        cls.font, cls.scale = caption_font_path(cls.body)

    def assert_fits(self, text):
        size, lines, widths = fit_caption(text, self.font, self.scale)
        self.assertEqual(" ".join(lines), text)
        self.assertLessEqual(len(lines), 2)
        self.assertGreaterEqual(size, 36)
        self.assertLessEqual(size, 64)
        self.assertLessEqual(max(widths), CAPTION_WIDTH)
        font = ImageFont.truetype(str(self.font), size)
        for line in lines:
            self.assertLessEqual(font.getlength(line) * self.scale, CAPTION_WIDTH)
        return size, lines

    def test_failing_sample_fits_actual_runner_font(self):
        # The old equal-word split left this 784px line inside a 740px area.
        if ImageFont.truetype(str(self.body), 52).getname()[0] == "DejaVu Sans":
            self.assertGreater(ImageFont.truetype(str(self.body), 52).getlength("developers compare model") * 1.1,
                               CAPTION_WIDTH)
        self.assert_fits("The toolkit lets developers compare model")

    def test_balances_uneven_word_widths(self):
        _, lines = self.assert_fits("Multidisciplinary AI researchers")
        self.assertEqual(len(lines), 2)

    def test_readable_size_fallback_for_a_wide_token(self):
        size, lines = self.assert_fits("W" * 16)
        self.assertLess(size, 52)
        self.assertEqual(len(lines), 1)

    def test_short_caption_keeps_full_size(self):
        self.assertEqual(self.assert_fits("AI news."), (64, ["AI news."]))

    def test_never_truncates_an_unrenderable_token(self):
        with self.assertRaisesRegex(ValueError, "minimum 36px"):
            fit_caption("W" * 80, self.font, self.scale)
        with self.assertRaisesRegex(ValueError, "no visible text"):
            fit_caption(" ", self.font, self.scale)

    def test_rewrites_existing_wrapping_without_changing_text_or_timing(self):
        ass = ("[Script Info]\nWrapStyle: 0\n"
               "Style: Caption,DejaVu Sans,52,rest-of-style\n"
               "Dialogue: 0,0:00:12.26,0:00:14.29,Caption,,0,0,0,,"
               r"{\pos(482,1290)\fad(55,55)}The toolkit lets\Ndevelopers compare model" "\n"
               "Dialogue: 0,0:00:15.00,0:00:16.00,Caption,,0,0,0,,Hello, world.\n")
        result, layouts = layout_captions(ass, self.font, self.scale)
        before = [line for line in ass.splitlines() if line.startswith("Dialogue:")]
        after = [line for line in result.splitlines() if line.startswith("Dialogue:")]
        self.assertEqual(len(after), len(before))
        for original, fitted in zip(before, after):
            self.assertEqual(original.split(",", 9)[:9], fitted.split(",", 9)[:9])
            self.assertEqual(visible_text(original), visible_text(fitted))
            self.assertIn(r"\q2\fs", fitted)
        self.assertIn("WrapStyle: 2", result)
        self.assertEqual(len(layouts), 2)
        self.assertEqual(layouts[0]["start"], "0:00:12.26")
        self.assertEqual(layouts[0]["end"], "0:00:14.29")
        self.assertEqual(layout_captions(result, self.font, self.scale), (result, layouts))

    def test_rejects_a_malformed_event(self):
        with self.assertRaisesRegex(ValueError, "Malformed caption"):
            layout_captions("Dialogue: 0,0:00:00.00\n", self.font, self.scale)

    def test_keeps_the_correct_repeated_word_highlighted_after_wrapping(self):
        ass = ("Dialogue: 0,0:00:01.00,0:00:01.50,Caption,,0,0,0,,"
               r"{\pos(482,1290)}Compare the answers with {\1c&HCBEFB4&}the{\1c&HFFFFFF&} toolkit" "\n")
        result, layouts = layout_captions(ass, self.font, self.scale)
        self.assertEqual(visible_text(result.strip()), "Compare the answers with the toolkit")
        self.assertIn(r"with {\1c&HCBEFB4&}the{\1c&HFFFFFF&}", result.replace(r"\N", " "))
        self.assertNotIn(r"\fad", result)
        self.assertEqual(layout_captions(result, self.font, self.scale), (result, layouts))


if __name__ == "__main__":
    unittest.main()
