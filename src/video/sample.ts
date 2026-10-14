import { VideoInput, VideoScript, VideoStory, ScriptSentence } from './types';
import { displayLabel, validateScript } from './script';

/** Clearly fictional fixture; publisher rejects every manifest marked sample. */
export function sampleInput(now = new Date()): VideoInput {
  const excerpt = 'A fictional research team has released an open toolkit for checking how language models answer everyday questions. The toolkit lets developers compare model responses using the same prompts and review examples that need closer inspection. Its sample reports show the questions, the generated answers, and the settings used for each test. The team says the project is intended to help people document model behavior before using a system in an application. Developers can run the checks locally and share their findings with collaborators.';
  return {
    version: 1, issueDate: now.toISOString().slice(0, 10), generatedAt: now.toISOString(), sample: true,
    stories: [{ id: 'fictional-video-sample', rank: 1, title: 'Sample: an open toolkit for checking AI answers',
      sourceName: 'Fictional Research Lab', sourceUrl: 'https://example.com/fictional-ai-toolkit',
      publishedAt: now.toISOString(), sourceExcerpt: excerpt, summary: excerpt }],
  };
}

/** Exercises the primary structure offline, without another generation service. */
export function sampleStructuredScript(story: VideoStory = sampleInput().stories[0]): VideoScript {
  const source = story.sourceExcerpt;
  const entries: [ScriptSentence['role'], string, ScriptSentence['visual']][] = [
    ['hook', 'Could a toolkit help you compare AI answers?', 'example'],
    ['breakthrough', 'The toolkit lets developers compare model responses using the same prompts and review examples that need closer inspection.', 'comparison'],
    ['breakthrough', 'Its sample reports show the questions, the generated answers, and the settings used for each test.', 'process'],
    ['breakthrough', 'The team says the project is intended to help people document model behavior before using a system in an application.', 'highlight'],
    ['impact', 'Developers can run the checks locally and share their findings with collaborators.', 'process'],
    ['engagement', 'Would you trust these model checks in your workflow?', 'highlight'],
  ];
  const sentences: ScriptSentence[] = entries.map(([role, text, visual]) => ({
    role, text, visual, evidenceQuote: source, displayText: displayLabel(text),
  }));
  const script: VideoScript = { version: 3, provider: 'groq', workingTitle: 'AI toolkit: compare model answers',
    format: 'structured', angle: 'comparison', availability: 'available', hookStyle: 'question',
    sentences, narration: sentences.map(sentence => sentence.text).join(' ') };
  validateScript(story, script);
  return script;
}
