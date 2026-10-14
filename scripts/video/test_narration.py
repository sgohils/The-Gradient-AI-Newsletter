import unittest
import numpy as np
from narrate import fit_narration
from verify import verify_pacing


class NarrationTests(unittest.TestCase):
    def test_natural_section_fit_trims_leading_silence_and_offsets_words(self):
        calls = []
        def synthesize(speed, text):
            calls.append((speed, text))
            duration = {"hook": 4.5, "one two three": 26, "impact question": 15}[text] / speed
            tokens = text.split()
            words = [{"text": token, "start": 0.275+i*(duration-0.4)/len(tokens),
                      "end": 0.275+(i+1)*(duration-0.4)/len(tokens)} for i, token in enumerate(tokens)]
            return np.ones(round(duration*24000), dtype=np.float32), words, duration
        script = {"format": "structured", "sentences": [{"text": word} for word in ["hook", "one", "two", "three", "impact", "question"]]}
        audio, words, duration = fit_narration(synthesize, script)
        self.assertGreaterEqual(duration, 35)
        self.assertLessEqual(duration, 45)
        self.assertAlmostEqual(words[0]["start"], 0.05, places=3)
        self.assertLessEqual(words[0]["end"], 4)
        impact = next(word for word in words if word["text"] == "impact")
        self.assertTrue(25 <= impact["start"] <= 27)
        self.assertTrue(all(0.8 <= speed <= 1.2 for speed, _ in calls))
        self.assertLessEqual(len(calls), 6)
        self.assertAlmostEqual(len(audio)/24000, duration, places=3)

    def test_impossible_hook_stops_after_one_bounded_retry(self):
        calls = []
        def synthesize(speed, text):
            calls.append(speed)
            return np.ones(round(10/speed*24000)), [{"text": text, "start": 0, "end": 10/speed}], 10/speed
        with self.assertRaisesRegex(ValueError, "four seconds"):
            fit_narration(synthesize, {"format": "source-fallback", "sentences": [{"text": "hook"}, {"text": "body"}]})
        self.assertEqual(len(calls), 2)

    def test_encoded_review_requires_complete_cues_and_an_uncited_hook(self):
        entries = [
            {"text": "Hook?", "role": "hook"}, {"text": "One.", "role": "breakthrough"},
            {"text": "Two.", "role": "breakthrough"}, {"text": "Three.", "role": "breakthrough"},
            {"text": "Impact.", "role": "impact"}, {"text": "Question?", "role": "engagement"},
        ]
        script = {"version": 3, "format": "structured", "workingTitle": "AI test", "sentences": entries}
        manifest = {"script": script, "duration": 40, "title": "AI test"}
        starts = [0.05, 3, 10, 18, 26, 33]
        timing = {"words": [{"text": entry["text"], "start": starts[i], "end": starts[i]+0.5} for i, entry in enumerate(entries)]}
        scenes = [{"start": start, "end": min(start+3, 40), "role": "hook" if start == 0 else
                   "engagement" if start >= 33 else "breakthrough", "visual": "example", "sourceVisible": start != 0}
                  for start in range(0, 40, 3)]
        verify_pacing(manifest, timing, {"scenes": scenes})
        scenes[0]["sourceVisible"] = True
        with self.assertRaisesRegex(ValueError, "citation"):
            verify_pacing(manifest, timing, {"scenes": scenes})
        scenes[0]["sourceVisible"] = False
        scenes[1]["start"] += 0.5
        with self.assertRaisesRegex(ValueError, "coverage"):
            verify_pacing(manifest, timing, {"scenes": scenes})


if __name__ == "__main__":
    unittest.main()
