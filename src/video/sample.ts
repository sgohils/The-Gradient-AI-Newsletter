import { VideoInput } from './types';

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
