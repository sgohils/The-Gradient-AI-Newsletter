"""Failure paths that must work without a model download or owner intervention."""
import tempfile
import unittest
import zipfile
from pathlib import Path
from narrate import spoken_text, restore_pronunciations
from unpack import unpack


class RuntimeSafety(unittest.TestCase):
    def test_acronyms_keep_the_original_caption_text_and_full_timing(self):
        pronunciations = {"AI": "A I", "GPUs": "G P U s"}
        self.assertEqual(spoken_text("AI uses GPUs.", pronunciations), "A I uses G P U s.")
        words = [{"text": text, "start": index * .2, "end": (index + 1) * .2}
                 for index, text in enumerate(["A", "I", "uses", "G", "P", "U", "s."])]
        restored = restore_pronunciations(words, pronunciations)
        self.assertEqual([word["text"] for word in restored], ["AI", "uses", "GPUs."])
        self.assertEqual(restored[0]["start"], 0)
        self.assertAlmostEqual(restored[-1]["end"], 1.4)

    def test_recovery_rejects_traversal_before_extracting_any_member(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive = root / "bad.zip"
            with zipfile.ZipFile(archive, "w") as bundle:
                bundle.writestr("manifest.json", "{}")
                bundle.writestr("../escape.json", "{}")
            with self.assertRaisesRegex(ValueError, "Unsafe"):
                unpack(archive, root / "restored")
            self.assertFalse((root / "escape.json").exists())
            self.assertFalse((root / "restored/manifest.json").exists())

    def test_recovery_rejects_symlinks_and_extracts_normal_media(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive = root / "artifact.zip"
            with zipfile.ZipFile(archive, "w") as bundle:
                item = zipfile.ZipInfo("link")
                item.external_attr = 0o120777 << 16
                bundle.writestr(item, "../outside")
            with self.assertRaisesRegex(ValueError, "Unsafe"):
                unpack(archive, root / "restored")
            with zipfile.ZipFile(archive, "w") as bundle:
                bundle.writestr("edition/manifest.json", "{}")
                bundle.writestr("edition/video.mp4", "fixture")
            unpack(archive, root / "restored")
            self.assertEqual((root / "restored/edition/video.mp4").read_text(), "fixture")


if __name__ == "__main__":
    unittest.main()
